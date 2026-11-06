package com.meuapp.todolist.finance;

import java.time.LocalDate;

public record TransactionView(Long id, TransactionType type, long amountCents, String description,
                              CategoryView category, LocalDate date, Long recurringId,
                              Integer installmentNumber, Integer installmentTotal, Integer installmentsPaid) {

    public static TransactionView of(Transaction t) {
        return of(t, null);
    }

    public static TransactionView of(Transaction t, Integer paid) {
        return new TransactionView(t.getId(), t.getType(), t.getAmountCents(), t.getDescription(),
                t.getCategory() == null ? null : CategoryView.of(t.getCategory()), t.getDate(), null,
                t.getInstallmentNumber(), t.getInstallmentTotal(), paid);
    }

    public static TransactionView ofRecurring(RecurringTransaction r, LocalDate date) {
        return new TransactionView(null, r.getType(), r.getAmountCents(), r.getDescription(),
                r.getCategory() == null ? null : CategoryView.of(r.getCategory()), date, r.getId(),
                null, null, null);
    }
}