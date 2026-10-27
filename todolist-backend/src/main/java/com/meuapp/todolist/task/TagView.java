package com.meuapp.todolist.task;

public record TagView(Long id, String name, String color) {
    public static TagView of(Tag t) {
        return new TagView(t.getId(), t.getName(), t.getColor());
    }
}