package com.meuapp.objetividade.finance;

public record CategoryView(Long id, TransactionType type, String name, String emoji, String color) {
    public static CategoryView of(FinanceCategory c) {
        return new CategoryView(c.getId(), c.getType(), c.getName(), c.getEmoji(), c.getColor());
    }
}