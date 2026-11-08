package com.meuapp.objetividade.study;

import java.time.LocalDate;

public record SessionView(Long id, Long subjectId, LocalDate date, int seconds) {
    public static SessionView of(StudySession s) {
        return new SessionView(s.getId(), s.getSubject().getId(), s.getDate(), s.getSeconds());
    }
}