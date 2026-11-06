package com.meuapp.todolist.task;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "task_completions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"task_id", "completion_date"}))
public class TaskCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "completion_date", nullable = false)
    private LocalDate date;

    @Column(nullable = false)
    private LocalDateTime completedAt = LocalDateTime.now();

    public TaskCompletion() {}

    public TaskCompletion(Task task, LocalDate date) {
        this.task = task;
        this.date = date;
    }

    public Long getId() { return id; }
    public Task getTask() { return task; }
    public LocalDate getDate() { return date; }
    public LocalDateTime getCompletedAt() { return completedAt; }
}