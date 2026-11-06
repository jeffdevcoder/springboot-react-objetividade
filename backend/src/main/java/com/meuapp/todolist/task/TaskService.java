package com.meuapp.todolist.task;

import com.meuapp.todolist.user.User;
import com.meuapp.todolist.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;

@Service
public class TaskService {
    private final TagRepository tagRepo;
    private final TaskRepository tasks;
    private final TaskCompletionRepository completions;
    private final UserRepository users;
    private final SubtaskCompletionRepository subCompletions;

    public TaskService(TagRepository tagRepo, TaskRepository tasks, TaskCompletionRepository completions,
                       SubtaskCompletionRepository subCompletions, UserRepository users) {
        this.tagRepo = tagRepo;
        this.tasks = tasks;
        this.completions = completions;
        this.subCompletions = subCompletions;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<TaskView> today(String email) {
        return forDate(email, LocalDate.now());
    }

    @Transactional(readOnly = true)
    public List<TaskView> forDate(String email, LocalDate date) {
        LocalDate today = LocalDate.now();
        return tasks.findByUserAndActiveTrueOrderByIdAsc(user(email)).stream()
                .filter(t -> t.occursOn(date))
                .filter(t -> t.getRecurrence() != Recurrence.ONCE || onceVisible(t, date, today))
                .sorted(Comparator.comparingInt(Task::getPosition)
                        .thenComparing(Task::getTime, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Task::getId))
                .map(t -> toView(t, date, completions.existsByTaskAndDate(t, date)))
                .toList();
    }

    private boolean onceVisible(Task t, LocalDate date, LocalDate today) {
        if (date.isAfter(today)) return date.equals(t.getStartDate());

        return completions.findFirstByTaskAndDateGreaterThanEqualOrderByDateAsc(t, t.getStartDate())
                .map(c -> !date.isAfter(c.getDate()))
                .orElse(true);
    }

    @Transactional
    public void complete(String email, Long id, LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now();
        if (day.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Não dá para marcar um dia que ainda não chegou");
        }
        Task task = find(email, id);
        if (!task.occursOn(day)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tarefa não é deste dia");
        }
        // "uma vez" só pode ser concluída em um único dia
        if (task.getRecurrence() == Recurrence.ONCE
                && completions.existsByTaskAndDateGreaterThanEqual(task, task.getStartDate())
                && !completions.existsByTaskAndDate(task, day)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Esta tarefa já foi concluída em outro dia");
        }
        if (!completions.existsByTaskAndDate(task, day)) {
            completions.save(new TaskCompletion(task, day));
        }
    }

    @Transactional
    public void uncomplete(String email, Long id, LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now();
        completions.deleteByTaskAndDate(find(email, id), day);
    }

    @Transactional
    public TaskView create(String email, CreateTaskRequest req) {
        checkWeekdays(req);
        LocalDate start = req.startDate() != null ? req.startDate() : LocalDate.now();
        LocalDate end = req.recurrence() == Recurrence.ONCE ? null : req.endDate();
        checkDates(start, end);

        Task task = new Task();
        task.setTitle(req.title().trim());
        task.setDescription(req.description() == null || req.description().isBlank()
                ? null : req.description().trim());
        task.setRecurrence(req.recurrence());
        task.setStartDate(start);
        task.setEndDate(end);
        task.setUrgent(req.urgent());
        applyWeekdays(task, req);
        task.setTime(req.time());
        syncSubtasks(task, req.subtasks());
        tasks.flush();
        User owner = user(email);
        task.setUser(owner);
        tasks.save(task);
        return toView(task, LocalDate.now(), false);
    }

    @Transactional
    public TaskView update(String email, Long id, CreateTaskRequest req) {
        Task task = find(email, id);
        LocalDate start = req.startDate() != null ? req.startDate() : task.getStartDate();
        LocalDate end = req.recurrence() == Recurrence.ONCE ? null : req.endDate();

        if (task.getRecurrence() != req.recurrence()) {
            task.setRecurrence(req.recurrence());
            if (start.equals(task.getStartDate())) start = LocalDate.now();
        }
        checkWeekdays(req);
        checkDates(start, end);

        task.setTitle(req.title().trim());
        task.setDescription(req.description() == null || req.description().isBlank()
                ? null : req.description().trim());
        task.setStartDate(start);
        task.setEndDate(end);
        task.setUrgent(req.urgent());
        applyWeekdays(task, req);
        task.setTime(req.time());
        syncSubtasks(task, req.subtasks());
        tasks.flush();
        return toView(task, LocalDate.now(), completions.existsByTaskAndDate(task, LocalDate.now()));
    }

    @Transactional
    public void delete(String email, Long id) {
        find(email, id).setActive(false);
    }

    @Transactional
    public void complete(String email, Long id) {
        LocalDate today = LocalDate.now();
        Task task = find(email, id);
        if (!task.occursOn(today)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tarefa não é de hoje");
        }
        if (!completions.existsByTaskAndDate(task, today)) {
            completions.save(new TaskCompletion(task, today));
        }
    }

    @Transactional
    public void uncomplete(String email, Long id) {
        completions.deleteByTaskAndDate(find(email, id), LocalDate.now());
    }

    private Task find(String email, Long id) {
        return tasks.findByIdAndUserAndActiveTrue(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private User user(String email) {
        return users.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    private TaskView toView(Task t, LocalDate date, boolean done) {
        Set<DayOfWeek> days = EnumSet.noneOf(DayOfWeek.class);
        if (t.getRecurrence() == Recurrence.CUSTOM) days.addAll(t.getWeekdays());

        LocalDate due = t.getRecurrence() == Recurrence.ONCE ? t.getStartDate() : date;
        TagView tag = t.getTag() == null ? null : TagView.of(t.getTag());

        LocalDate key = subtaskDay(t, date);
        List<SubtaskView> subs = t.getSubtasks().stream()
                .sorted(Comparator.comparingInt(Subtask::getPosition))
                .map(s -> new SubtaskView(s.getId(), s.getTitle(),
                        s.getId() != null && subCompletions.existsBySubtaskAndDate(s, key)))
                .toList();

        return new TaskView(t.getId(), t.getTitle(), t.getDescription(), t.getRecurrence(),
                t.getStartDate(), t.getEndDate(), t.isUrgent(), days, t.getTime(), due,
                tag, done, subs);
    }

    private LocalDate subtaskDay(Task t, LocalDate day) {
        return t.getRecurrence() == Recurrence.ONCE ? t.getStartDate() : day;
    }

    private void syncSubtasks(Task task, List<SubtaskInput> inputs) {
        if (inputs == null) return;

        long filled = inputs.stream().filter(i -> !i.title().trim().isEmpty()).count();
        if (filled > 10) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Máximo de 10 subtarefas");
        }

        Map<Long, Subtask> existing = new HashMap<>();
        for (Subtask s : task.getSubtasks()) {
            if (s.getId() != null) existing.put(s.getId(), s);
        }

        Set<Long> keep = new HashSet<>();
        int pos = 0;
        for (SubtaskInput in : inputs) {
            String title = in.title().trim();
            if (title.isEmpty()) continue;

            Subtask s = in.id() == null ? null : existing.get(in.id());
            if (s == null) {
                Subtask created = new Subtask(task, title);
                created.setPosition(pos++);
                task.getSubtasks().add(created);
            } else {
                s.setTitle(title);
                s.setPosition(pos++);
                keep.add(s.getId());
            }
        }

        List<Subtask> dropped = task.getSubtasks().stream()
                .filter(s -> s.getId() != null && !keep.contains(s.getId()))
                .toList();

        for (Subtask s : dropped) {
            subCompletions.deleteBySubtask(s);
        }
        subCompletions.flush();

        task.getSubtasks().removeAll(dropped);
    }

    @Transactional
    public void completeSubtask(String email, Long taskId, Long subId, LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now();
        if (day.isAfter(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Não dá para marcar um dia que ainda não chegou");
        }
        Task task = find(email, taskId);
        Subtask sub = findSub(task, subId);
        LocalDate key = subtaskDay(task, day);
        if (!subCompletions.existsBySubtaskAndDate(sub, key)) {
            subCompletions.save(new SubtaskCompletion(sub, key));
        }
    }

    @Transactional
    public void uncompleteSubtask(String email, Long taskId, Long subId, LocalDate date) {
        LocalDate day = date != null ? date : LocalDate.now();
        Task task = find(email, taskId);
        subCompletions.deleteBySubtaskAndDate(findSub(task, subId), subtaskDay(task, day));
    }

    private Subtask findSub(Task task, Long subId) {
        return task.getSubtasks().stream()
                .filter(s -> s.getId().equals(subId))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    @Transactional
    public void reorder(String email, List<Long> ids) {
        if (ids == null) return;
        int pos = 1;
        for (Long id : ids) {
            find(email, id).setPosition(pos++);
        }
    }

    @Transactional
    public void assignTag(String email, Long taskId, Long tagId) {
        Task task = find(email, taskId);
        if (tagId == null) {
            task.setTag(null);
            return;
        }
        Tag tag = tagRepo.findByIdAndUser(tagId, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        task.setTag(tag);
    }

    private void checkDates(LocalDate start, LocalDate end) {
        if (end != null && end.isBefore(start)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "A data final não pode ser antes da inicial");
        }
    }

    private void checkWeekdays(CreateTaskRequest req) {
        if (req.recurrence() == Recurrence.CUSTOM
                && (req.weekdays() == null || req.weekdays().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Escolha pelo menos um dia da semana");
        }
    }

    private void applyWeekdays(Task task, CreateTaskRequest req) {
        task.getWeekdays().clear();
        if (req.recurrence() == Recurrence.CUSTOM) {
            task.getWeekdays().addAll(req.weekdays());
        }
    }
}