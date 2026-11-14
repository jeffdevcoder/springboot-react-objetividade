package com.meuapp.objetividade.goal;

import com.meuapp.objetividade.user.User;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "goals")
public class Goal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 2000)
    private String description;

    // data até quando a meta deve ser conquistada
    @Column(nullable = false)
    private LocalDate deadline;

    // dia em que foi marcada como conquistada (null = ainda em andamento)
    @Column(name = "achieved_on")
    private LocalDate achievedOn;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @OneToMany(mappedBy = "goal", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("position ASC, id ASC")
    private List<GoalStep> steps = new ArrayList<>();

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDate getDeadline() { return deadline; }
    public void setDeadline(LocalDate deadline) { this.deadline = deadline; }
    public LocalDate getAchievedOn() { return achievedOn; }
    public void setAchievedOn(LocalDate achievedOn) { this.achievedOn = achievedOn; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public List<GoalStep> getSteps() { return steps; }
}
