package com.meuapp.todolist.finance;

public record CategoryView(Long id, String name, String emoji, String color) {
    public static CategoryView of(FinanceCategory c) {
        return new CategoryView(c.getId(), c.getName(), c.getEmoji(), c.getColor());
    }
}