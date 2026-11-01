package com.meuapp.todolist.finance;

import com.meuapp.todolist.user.User;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;

@Entity
@Table(name = "recurring_transactions")
public class RecurringTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "kind", nullable = false, length = 10)
    private TransactionType type;

    @Column(name = "amount_cents", nullable = false)
    private long amountCents;

    @Column(nullable = false, length = 100)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private FinanceCategory category;

    @Column(name = "day_of_month", nullable = false)
    private int dayOfMonth;

    @Column(name = "start_month", nullable = false)
    private LocalDate startMonth; // dia 1 do primeiro mês em que vale

    @Column(name = "end_month")
    private LocalDate endMonth;   // dia 1 do último mês em que vale; nulo = sem fim

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public TransactionType getType() { return type; }
    public void setType(TransactionType type) { this.type = type; }
    public long getAmountCents() { return amountCents; }
    public void setAmountCents(long amountCents) { this.amountCents = amountCents; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public FinanceCategory getCategory() { return category; }
    public void setCategory(FinanceCategory category) { this.category = category; }
    public int getDayOfMonth() { return dayOfMonth; }
    public void setDayOfMonth(int dayOfMonth) { this.dayOfMonth = dayOfMonth; }
    public LocalDate getStartMonth() { return startMonth; }
    public void setStartMonth(LocalDate startMonth) { this.startMonth = startMonth; }
    public LocalDate getEndMonth() { return endMonth; }
    public void setEndMonth(LocalDate endMonth) { this.endMonth = endMonth; }
}