package com.meuapp.objetividade.task;

import com.meuapp.objetividade.user.User;
import com.meuapp.objetividade.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/**
 * Estatísticas das tarefas: em cada dia do período (até hoje), conta o que estava programado
 * e o que foi marcado como feito. Tarefas "uma vez" contam uma única vez:
 * como feitas no dia em que foram concluídas, ou como pendentes enquanto não forem.
 */
@Service
public class TaskStatsService {

    private final TaskRepository tasks;
    private final TaskCompletionRepository completions;
    private final UserRepository users;

    public TaskStatsService(TaskRepository tasks, TaskCompletionRepository completions, UserRepository users) {
        this.tasks = tasks;
        this.completions = completions;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public TaskStatsView stats(String email, String period) {
        LocalDate today = LocalDate.now();
        LocalDate from = switch (period) {
            case "week" -> today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
            case "month" -> today.withDayOfMonth(1);
            case "year" -> today.withDayOfYear(1);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Período inválido");
        };
        // fim do período: só para desenhar o gráfico completo; dias futuros não contam
        LocalDate periodEnd = switch (period) {
            case "week" -> from.plusDays(6);
            case "month" -> today.withDayOfMonth(today.lengthOfMonth());
            default -> today.withDayOfYear(today.lengthOfYear());
        };

        User user = users.findByEmail(email).orElseThrow();
        List<Task> all = tasks.findByUserAndActiveTrueOrderByIdAsc(user);

        // conclusões do período numa consulta só: tarefa -> dias concluídos
        Map<Long, Set<LocalDate>> doneDays = new HashMap<>();
        if (!all.isEmpty()) {
            for (TaskCompletion c : completions.findByTaskInAndDateBetween(all, from, today)) {
                doneDays.computeIfAbsent(c.getTask().getId(), k -> new HashSet<>()).add(c.getDate());
            }
        }

        Map<LocalDate, int[]> perDay = new LinkedHashMap<>(); // [programadas, feitas]
        for (LocalDate d = from; !d.isAfter(today); d = d.plusDays(1)) perDay.put(d, new int[2]);

        Map<Long, int[]> perTask = new LinkedHashMap<>();       // [feitas, não feitas]

        for (Task t : all) {
            Set<LocalDate> done = doneDays.getOrDefault(t.getId(), Set.of());

            if (t.getRecurrence() == Recurrence.ONCE) {
                Optional<LocalDate> completedOn = completions
                        .findFirstByTaskAndDateGreaterThanEqualOrderByDateAsc(t, t.getStartDate())
                        .map(TaskCompletion::getDate);
                if (completedOn.isPresent()) {
                    LocalDate c = completedOn.get();
                    if (!c.isBefore(from) && !c.isAfter(today)) count(perDay, perTask, t, c, true);
                } else if (!t.getStartDate().isAfter(today)) {
                    // ainda pendente (inclusive atrasada de antes do período)
                    LocalDate day = t.getStartDate().isBefore(from) ? from : t.getStartDate();
                    count(perDay, perTask, t, day, false);
                }
                continue;
            }

            for (LocalDate d = from; !d.isAfter(today); d = d.plusDays(1)) {
                if (t.occursOn(d)) count(perDay, perTask, t, d, done.contains(d));
            }
        }

        int planned = 0, doneTotal = 0;
        List<TaskStatsView.Day> days = new ArrayList<>();
        for (var e : perDay.entrySet()) {
            planned += e.getValue()[0];
            doneTotal += e.getValue()[1];
            days.add(new TaskStatsView.Day(e.getKey(), e.getValue()[0], e.getValue()[1], false));
        }
        for (LocalDate d = today.plusDays(1); !d.isAfter(periodEnd); d = d.plusDays(1)) {
            days.add(new TaskStatsView.Day(d, 0, 0, true));
        }

        Map<Long, Task> byId = new HashMap<>();
        all.forEach(t -> byId.put(t.getId(), t));

        int percent = planned == 0 ? 0 : Math.round(doneTotal * 100f / planned);
        return new TaskStatsView(period, from, today, !all.isEmpty(),
                planned, doneTotal, planned - doneTotal, percent, days, tags(perTask, byId));
    }

    private static void count(Map<LocalDate, int[]> perDay, Map<Long, int[]> perTask,
                              Task t, LocalDate day, boolean done) {
        int[] d = perDay.get(day);
        d[0]++;
        if (done) d[1]++;
        perTask.computeIfAbsent(t.getId(), k -> new int[2])[done ? 0 : 1]++;
    }

    /** Soma feito / não feito por tag (tarefas sem tag ficam juntas), da tag mais programada para a menos. */
    private static List<TaskStatsView.TagStat> tags(Map<Long, int[]> perTask, Map<Long, Task> byId) {
        Map<Long, int[]> perTag = new LinkedHashMap<>();   // tag id (null = sem tag) -> [feitas, não feitas]
        Map<Long, Tag> tagById = new HashMap<>();
        perTask.forEach((taskId, counts) -> {
            Tag tag = byId.get(taskId).getTag();
            Long key = tag == null ? null : tag.getId();
            if (tag != null) tagById.put(key, tag);
            int[] sum = perTag.computeIfAbsent(key, k -> new int[2]);
            sum[0] += counts[0];
            sum[1] += counts[1];
        });
        return perTag.entrySet().stream()
                .sorted((a, b) -> (b.getValue()[0] + b.getValue()[1]) - (a.getValue()[0] + a.getValue()[1]))
                .map(e -> {
                    Tag tag = tagById.get(e.getKey());
                    return tag == null
                            ? new TaskStatsView.TagStat(null, "Sem tag", null, e.getValue()[0], e.getValue()[1])
                            : new TaskStatsView.TagStat(tag.getId(), tag.getName(), tag.getColor(),
                                    e.getValue()[0], e.getValue()[1]);
                })
                .toList();
    }
}
