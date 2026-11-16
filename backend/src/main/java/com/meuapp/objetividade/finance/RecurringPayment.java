package com.meuapp.objetividade.finance;

import jakarta.persistence.*;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDate;

/** Marca um mês de um lançamento fixo como pago. */
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

    /** Primeiro dia do mês pago. */
    @Column(name = "paid_month", nullable = false)
    private LocalDate month;

    /** Receita "Contas pagas" gerada para este mês. */
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
