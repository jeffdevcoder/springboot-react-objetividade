package com.meuapp.todolist.finance;

import java.util.Set;
import java.util.Locale;

final class FinancePalette {

    private FinancePalette() {}

    static final Set<String> EXPENSE = Set.of(
            "#660022", "#991B1B", "#D946EF", "#F472B6", "#FCE7F3", "#BE123C", "#A0522D",
            "#EA580C", "#C2410C", "#F59E0B", "#FDA4AF", "#9D174D", "#78350F", "#6B7280"
    );

    static final Set<String> INCOME = Set.of(
            "#004D00", "#007A33", "#66B3A1", "#B2E0D4", "#E0F7F1", "#4F46E5", "#8B5CF6",
            "#10B981", "#15803D", "#65A30D", "#06B6D4", "#3B82F6", "#0F766E", "#2DD4BF"
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