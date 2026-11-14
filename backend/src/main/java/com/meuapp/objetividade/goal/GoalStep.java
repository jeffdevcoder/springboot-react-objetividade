package com.meuapp.objetividade.goal;

import jakarta.persistence.*;

// subtópico (etapa) de uma meta
@Entity
@Table(name = "goal_steps")
public class GoalStep {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "goal_id")
    private Goal goal;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false)
    private boolean done;

    @Column(nullable = false)
    private int position;

    public GoalStep() {}
    public GoalStep(Goal goal, String title) { this.goal = goal; this.title = title; }

    public Long getId() { return id; }
    public Goal getGoal() { return goal; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public boolean isDone() { return done; }
    public void setDone(boolean done) { this.done = done; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
}
