package com.meuapp.objetividade.finance;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDate;

@Entity
@Table(name = "recurring_payments",
        uniqueConstraints = @UniqueConstraint(columnNames = {"recurring_id", "paid_month"}))
public class RecurringPayment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "recurring_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private RecurringTransaction recurring;

    @Column(name = "paid_month", nullable = false)
    private LocalDate month;

    @Column(name = "income_id")
    private Long incomeId;

    public Long getId() { return id; }
    public RecurringTransaction getRecurring() { return recurring; }
    public void setRecurring(RecurringTransaction recurring) { this.recurring = recurring; }
    public LocalDate getMonth() { return month; }
    public void setMonth(LocalDate month) { this.month = month; }
    public Long getIncomeId() { return incomeId; }
    public void setIncomeId(Long incomeId) { this.incomeId = incomeId; }
}
