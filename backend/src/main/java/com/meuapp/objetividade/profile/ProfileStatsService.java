package com.meuapp.objetividade.profile;

import com.meuapp.objetividade.finance.*;
import com.meuapp.objetividade.goal.Goal;
import com.meuapp.objetividade.goal.GoalRepository;
import com.meuapp.objetividade.goal.GoalStep;
import com.meuapp.objetividade.note.Note;
import com.meuapp.objetividade.note.NoteRepository;
import com.meuapp.objetividade.study.StudySession;
import com.meuapp.objetividade.study.StudySessionRepository;
import com.meuapp.objetividade.task.TaskStatsService;
import com.meuapp.objetividade.task.TaskStatsView;
import com.meuapp.objetividade.user.User;
import com.meuapp.objetividade.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.TemporalAdjusters;
import java.util.*;

/** Junta as estatísticas de todas as áreas (tarefas, finanças, estudos, anotações e metas). */
@Service
public class ProfileStatsService {

    private static final int LIST_LIMIT = 5;

    private final UserRepository users;
    private final TaskStatsService taskStats;
    private final FinanceService finance;
    private final TransactionRepository transactions;
    private final RecurringTransactionRepository recurring;
    private final StudySessionRepository sessions;
    private final NoteRepository notes;
    private final GoalRepository goals;

    public ProfileStatsService(UserRepository users, TaskStatsService taskStats, FinanceService finance,
                               TransactionRepository transactions, RecurringTransactionRepository recurring,
                               StudySessionRepository sessions, NoteRepository notes, GoalRepository goals) {
        this.users = users;
        this.taskStats = taskStats;
        this.finance = finance;
        this.transactions = transactions;
        this.recurring = recurring;
        this.sessions = sessions;
        this.notes = notes;
        this.goals = goals;
    }

    @Transactional(readOnly = true)
    public ProfileStatsView stats(String email, String period) {
        LocalDate today = LocalDate.now();
        LocalDate from;
        LocalDate to;
        switch (period) {
            case "week" -> {
                from = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                to = from.plusDays(6);
            }
            case "month" -> {
                from = today.withDayOfMonth(1);
                to = today.withDayOfMonth(today.lengthOfMonth());
            }
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Período inválido");
        }

        User user = users.findByEmail(email).orElseThrow();

        TaskStatsView t = taskStats.stats(email, period);
        if (!t.hasTasks()) t = null;

        ProfileStatsView.Finance f = finance(user, email, from, to);
        ProfileStatsView.Study s = study(user, from, to, today);
        ProfileStatsView.Notes n = notes(user, from, to, today);
        ProfileStatsView.Goals g = goals(user, from, to, today);

        boolean empty = t == null && f == null && s == null && n == null && g == null;
        return new ProfileStatsView(period, from, to, empty, t, f, s, n, g);
    }

    private ProfileStatsView.Finance finance(User user, String email, LocalDate from, LocalDate to) {
        if (!transactions.existsByUser(user) && !recurring.existsByUser(user)) return null;

        // o período pode cruzar dois meses (semana): usa a mesma visão mensal da aba Finanças
        List<TransactionView> items = new ArrayList<>();
        for (YearMonth m = YearMonth.from(from); !m.isAfter(YearMonth.from(to)); m = m.plusMonths(1)) {
            for (TransactionView v : finance.month(email, m)) {
                if (!v.date().isBefore(from) && !v.date().isAfter(to)) items.add(v);
            }
        }

        long income = 0, expense = 0;
        int bills = 0, billsPaid = 0;
        Map<String, ProfileStatsView.Category> byCategory = new LinkedHashMap<>();
        for (TransactionView v : items) {
            if (v.type() == TransactionType.INCOME) {
                income += v.amountCents();
                continue;
            }
            expense += v.amountCents();
            bills++;
            if (v.paid()) billsPaid++;

            CategoryView c = v.category();
            String key = c == null ? "none" : String.valueOf(c.id());
            ProfileStatsView.Category prev = byCategory.get(key);
            long sum = (prev == null ? 0 : prev.cents()) + v.amountCents();
            byCategory.put(key, c == null
                    ? new ProfileStatsView.Category("Sem categoria", "💸", "#EF4444", sum)
                    : new ProfileStatsView.Category(c.name(), c.emoji(), c.color(), sum));
        }

        List<ProfileStatsView.Category> top = byCategory.values().stream()
                .sorted(Comparator.comparingLong(ProfileStatsView.Category::cents).reversed())
                .toList();
        return new ProfileStatsView.Finance(income, expense, income - expense, items.size(),
                bills, billsPaid, top);
    }

    private ProfileStatsView.Study study(User user, LocalDate from, LocalDate to, LocalDate today) {
        if (!sessions.existsByUser(user)) return null;

        List<StudySession> list = sessions.findByUserAndDateBetweenOrderByDateAscIdAsc(user, from, to);

        Map<LocalDate, Long> perDay = new HashMap<>();
        Map<Long, ProfileStatsView.Subject> perSubject = new LinkedHashMap<>();
        long total = 0;
        for (StudySession s : list) {
            total += s.getSeconds();
            perDay.merge(s.getDate(), (long) s.getSeconds(), Long::sum);
            var sub = s.getSubject();
            ProfileStatsView.Subject prev = perSubject.get(sub.getId());
            perSubject.put(sub.getId(), new ProfileStatsView.Subject(sub.getName(), sub.getEmoji(), sub.getColor(),
                    (prev == null ? 0 : prev.seconds()) + s.getSeconds()));
        }

        List<ProfileStatsView.StudyDay> days = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            days.add(new ProfileStatsView.StudyDay(d, perDay.getOrDefault(d, 0L), d.isAfter(today)));
        }

        List<ProfileStatsView.Subject> subjects = perSubject.values().stream()
                .sorted(Comparator.comparingLong(ProfileStatsView.Subject::seconds).reversed())
                .toList();
        return new ProfileStatsView.Study(total, list.size(), days, subjects);
    }

    private ProfileStatsView.Notes notes(User user, LocalDate from, LocalDate to, LocalDate today) {
        List<Note> all = notes.findByUser(user);
        if (all.isEmpty()) return null;

        int created = (int) all.stream()
                .map(n -> n.getCreatedAt().toLocalDate())
                .filter(d -> !d.isBefore(from) && !d.isAfter(to))
                .count();

        List<ProfileStatsView.NoteItem> upcoming = all.stream()
                .filter(n -> n.getDate() != null && !n.getDate().isBefore(today))
                .sorted(Comparator.comparing(Note::getDate))
                .limit(LIST_LIMIT)
                .map(n -> new ProfileStatsView.NoteItem(n.getId(), n.getTitle(), n.getEmoji(), n.getDate()))
                .toList();

        return new ProfileStatsView.Notes(all.size(), created, upcoming);
    }

    private ProfileStatsView.Goals goals(User user, LocalDate from, LocalDate to, LocalDate today) {
        List<Goal> all = goals.findByUser(user);
        if (all.isEmpty()) return null;

        int achieved = 0, overdue = 0, achievedInPeriod = 0, stepsDone = 0, stepsTotal = 0;
        List<Goal> active = new ArrayList<>();
        for (Goal g : all) {
            if (g.getAchievedOn() != null) {
                achieved++;
                LocalDate a = g.getAchievedOn();
                if (!a.isBefore(from) && !a.isAfter(to)) achievedInPeriod++;
            } else {
                active.add(g);
                if (g.getDeadline().isBefore(today)) overdue++;
            }
            for (GoalStep s : g.getSteps()) {
                stepsTotal++;
                if (s.isDone()) stepsDone++;
            }
        }

        List<ProfileStatsView.GoalItem> items = active.stream()
                .sorted(Comparator.comparing(Goal::getDeadline))
                .limit(LIST_LIMIT)
                .map(g -> new ProfileStatsView.GoalItem(g.getId(), g.getTitle(), g.getDeadline(),
                        (int) g.getSteps().stream().filter(GoalStep::isDone).count(), g.getSteps().size()))
                .toList();

        return new ProfileStatsView.Goals(all.size(), achieved, active.size(), overdue, achievedInPeriod,
                stepsDone, stepsTotal, items);
    }
}
