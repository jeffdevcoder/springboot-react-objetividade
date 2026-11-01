package com.meuapp.todolist.finance;

import java.util.Set;
import java.util.Locale;

final class FinancePalette {

    private FinancePalette() {}

    static final Set<String> EXPENSE = Set.of(
            "#660022",
            "#991B1B",
            "#D946EF",
            "#F472B6",
            "#FCE7F3",
            "#BE123C",
            "#A0522D"
    );

    static final Set<String> INCOME = Set.of(
            "#004D00",
            "#007A33",
            "#66B3A1",
            "#B2E0D4",
            "#E0F7F1",
            "#4F46E5",
            "#8B5CF6"
    );

    static boolean allows(TransactionType type, String color) {
        if (type == null || color == null) {
            return false;
        }

        String c = color.trim().toUpperCase(Locale.ROOT);

        return switch (type) {
            case INCOME -> INCOME.contains(c);
            case EXPENSE -> EXPENSE.contains(c);
        };
    }
}