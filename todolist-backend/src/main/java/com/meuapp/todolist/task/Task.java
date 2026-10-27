package com.meuapp.todolist.task;

import com.meuapp.todolist.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.util.Set;

@Entity
@Table(name = "tasks")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private Recurrence recurrence;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private boolean active = true;

    @Column
    private LocalDate endDate;

    @Column(name = "task_time")
    private LocalTime time;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean urgent = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tag_id")
    private Tag tag;

    @ElementCollection
    @CollectionTable(name = "task_weekdays", joinColumns = @JoinColumn(name = "task_id"))
    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", nullable = false, length = 10)
    private Set<DayOfWeek> weekdays = EnumSet.noneOf(DayOfWeek.class);

    /** essa tarefa deve aparecer na data informada? */
    public boolean occursOn(LocalDate date) {
        if (date.isBefore(startDate)) return false;

        if (recurrence != Recurrence.ONCE && endDate != null && date.isAfter(endDate)) return false;

        int day = Math.min(startDate.getDayOfMonth(), date.lengthOfMonth());
        return switch (recurrence) {
            case ONCE, DAILY -> true;
            case WEEKDAYS -> date.getDayOfWeek().getValue() <= 5;
            case WEEKENDS -> date.getDayOfWeek().getValue() >= 6;
            case WEEKLY -> date.getDayOfWeek() == startDate.getDayOfWeek();
            case MONTHLY -> date.getDayOfMonth() == day;
            case YEARLY -> date.getMonth() == startDate.getMonth() && date.getDayOfMonth() == day;
            case CUSTOM -> weekdays.contains(date.getDayOfWeek());
        };
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Recurrence getRecurrence() { return recurrence; }
    public void setRecurrence(Recurrence recurrence) { this.recurrence = recurrence; }
    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }
    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isUrgent() { return urgent; }
    public void setUrgent(boolean urgent) { this.urgent = urgent; }
    public Set<DayOfWeek> getWeekdays() { return weekdays; }
    public LocalTime getTime() { return time; }
    public void setTime(LocalTime time) { this.time = time; }
    public Tag getTag() { return tag; }
    public void setTag(Tag tag) { this.tag = tag; }

}