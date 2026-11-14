package com.meuapp.objetividade.goal;

public record GoalStepView(Long id, String title, boolean done) {
    public static GoalStepView of(GoalStep s) {
        return new GoalStepView(s.getId(), s.getTitle(), s.isDone());
    }
}
