package com.meuapp.objetividade.goal;

import java.time.LocalDate;
import java.util.List;

public record GoalView(Long id, String title, String description, String emoji, LocalDate deadline, LocalDate achievedOn,
                       List<GoalStepView> steps) {
    public static GoalView of(Goal g) {
        return new GoalView(g.getId(), g.getTitle(), g.getDescription(), g.getEmoji(), g.getDeadline(), g.getAchievedOn(),
                g.getSteps().stream().map(GoalStepView::of).toList());
    }
}
