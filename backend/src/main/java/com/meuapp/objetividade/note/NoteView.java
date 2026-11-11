package com.meuapp.objetividade.note;

import java.time.LocalDate;

public record NoteView(Long id, String title, String description, String emoji, LocalDate date) {
    public static NoteView of(Note n) {
        return new NoteView(n.getId(), n.getTitle(), n.getDescription(), n.getEmoji(), n.getDate());
    }
}
