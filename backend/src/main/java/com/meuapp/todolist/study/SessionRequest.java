package com.meuapp.todolist.study;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record SessionRequest(
        @NotNull Long subjectId,
        @NotNull @Min(1) @Max(43200) Integer seconds,
        LocalDate date) {}