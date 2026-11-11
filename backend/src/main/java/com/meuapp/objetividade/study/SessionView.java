package com.meuapp.objetividade.study;

import java.time.LocalDate;

public record SessionView(Long id, Long subjectId, LocalDate date, int seconds, String description) {
    public static SessionView of(StudySession s) {
        return new SessionView(s.getId(), s.getSubject().getId(), s.getDate(), s.getSeconds(), s.getDescription());
    }
}