package com.meuapp.todolist.finance;

import java.time.LocalDate;

public record TransactionView(Long id, TransactionType type, long amountCents,
                              String description, CategoryView category, LocalDate date) {
    public static TransactionView of(Transaction t) {
        return new TransactionView(t.getId(), t.getType(), t.getAmountCents(), t.getDescription(),
                t.getCategory() == null ? null : CategoryView.of(t.getCategory()), t.getDate());
    }
}