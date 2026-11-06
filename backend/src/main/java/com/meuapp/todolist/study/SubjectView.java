package com.meuapp.todolist.study;

public record SubjectView(Long id, String name, String emoji, String color) {
    public static SubjectView of(Subject s) {
        return new SubjectView(s.getId(), s.getName(), s.getEmoji(), s.getColor());
    }
}