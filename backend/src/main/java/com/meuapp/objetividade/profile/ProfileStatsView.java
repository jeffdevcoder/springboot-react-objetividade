package com.meuapp.objetividade.profile;

import com.meuapp.objetividade.task.TaskStatsView;

import java.time.LocalDate;
import java.util.List;

public record ProfileStatsView(
        String period,
        LocalDate from,
        LocalDate to,
        boolean empty,
        TaskStatsView tasks,
        Finance finance,
        Study study,
        Notes notes,
        Goals goals) {

    public record Finance(long incomeCents, long expenseCents, long balanceCents, int count,
                          int bills, int billsPaid, List<Category> expenses) {}

    public record Category(String name, String emoji, String color, long cents) {}

    public record Study(long seconds, int sessions, List<StudyDay> days, List<Subject> subjects) {}

    public record StudyDay(LocalDate date, long seconds, boolean future) {}

    public record Subject(String name, String emoji, String color, long seconds) {}

    public record Notes(int total, int created, List<NoteItem> upcoming) {}

    public record NoteItem(Long id, String title, String emoji, LocalDate date) {}

    public record Goals(int total, int achieved, int inProgress, int overdue, int achievedInPeriod,
                        int stepsDone, int stepsTotal, List<GoalItem> active) {}

    public record GoalItem(Long id, String title, LocalDate deadline, int stepsDone, int stepsTotal) {}
}
