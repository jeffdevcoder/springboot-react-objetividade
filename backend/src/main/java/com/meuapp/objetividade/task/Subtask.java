package com.meuapp.objetividade.task;

import jakarta.persistence.*;

@Entity
@Table(name = "subtasks")
public class Subtask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "integer default 0")
    private int position = 0;

    public Subtask() {}
    public Subtask(Task task, String title) { this.task = task; this.title = title; }

    public Long getId() { return id; }
    public Task getTask() { return task; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }
}