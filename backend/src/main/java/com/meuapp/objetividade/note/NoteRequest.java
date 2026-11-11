package com.meuapp.objetividade.note;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record NoteRequest(
        @NotBlank(message = "Informe o tópico") @Size(max = 100) String title,
        @Size(max = 2000, message = "Descrição muito longa") String description,
        @Size(max = 16) String emoji,
        LocalDate date) {}
