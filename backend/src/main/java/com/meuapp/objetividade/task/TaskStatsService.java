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
        List<TaskStatsView.Item> doneItems = items(perTask, byId, 0);
        List<TaskStatsView.Item> missedItems = items(perTask, byId, 1);

        int percent = planned == 0 ? 0 : Math.round(doneTotal * 100f / planned);
        return new TaskStatsView(period, from, today, !all.isEmpty(),
                planned, doneTotal, planned - doneTotal, percent, days, doneItems, missedItems);
    }

    private static void count(Map<LocalDate, int[]> perDay, Map<Long, int[]> perTask,
                              Task t, LocalDate day, boolean done) {
        int[] d = perDay.get(day);
        d[0]++;
        if (done) d[1]++;
        perTask.computeIfAbsent(t.getId(), k -> new int[2])[done ? 0 : 1]++;
    }

    /** Lista as tarefas com contagem > 0 no índice pedido, da mais frequente para a menos. */
    private static List<TaskStatsView.Item> items(Map<Long, int[]> perTask, Map<Long, Task> byId, int idx) {
        return perTask.entrySet().stream()
                .filter(e -> e.getValue()[idx] > 0)
                .sorted((a, b) -> b.getValue()[idx] - a.getValue()[idx])
                .map(e -> {
                    Task t = byId.get(e.getKey());
                    return new TaskStatsView.Item(t.getId(), t.getTitle(), t.getEmoji(), e.getValue()[idx]);
                })
                .toList();
    }
}
