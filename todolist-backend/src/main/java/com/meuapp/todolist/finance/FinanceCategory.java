package com.meuapp.todolist.finance;

import com.meuapp.todolist.user.User;
import jakarta.persistence.*;

@Entity
@Table(name = "finance_categories",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "name"}))
public class FinanceCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 30)
    private String name;

    @Column(nullable = false, length = 16)
    private String emoji;

    @Column(nullable = false, length = 7)
    private String color; // "#EF4444"

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmoji() { return emoji; }
    public void setEmoji(String emoji) { this.emoji = emoji; }
    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}