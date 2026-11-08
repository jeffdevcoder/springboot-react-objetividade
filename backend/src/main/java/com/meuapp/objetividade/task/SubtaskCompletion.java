package com.meuapp.objetividade.task;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "subtask_completions",
        uniqueConstraints = @UniqueConstraint(columnNames = {"subtask_id", "completion_date"}))
public class SubtaskCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "subtask_id")
    private Subtask subtask;

    @Column(name = "completion_date", nullable = false)
    private LocalDate date;

    public SubtaskCompletion() {}
    public SubtaskCompletion(Subtask subtask, LocalDate date) { this.subtask = subtask; this.date = date; }
}