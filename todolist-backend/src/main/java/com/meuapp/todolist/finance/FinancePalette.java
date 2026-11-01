package com.meuapp.todolist.finance;

import java.util.Set;

final class FinancePalette {

    private FinancePalette() {}

    // quentes (gasto)
    static final Set<String> EXPENSE = Set.of(
            "#EA580C", "#F59E0B", "#FACC15", "#FDBA74", "#EC4899", "#BE123C", "#A0522D");

    // frias (receita)
    static final Set<String> INCOME = Set.of(
            "#14B8A6", "#0EA5E9", "#2563EB", "#4F46E5", "#8B5CF6", "#C084FC", "#64748B");

    static boolean allows(TransactionType type, String color) {
        String c = color.toUpperCase();
        return type == TransactionType.INCOME ? INCOME.contains(c) : EXPENSE.contains(c);
    }
}