package com.meuapp.objetividade.study;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record SessionRequest(
        @NotNull Long subjectId,
        @NotNull @Min(1) @Max(43200) Integer seconds,
        LocalDate date,
        @Size(max = 120) String description) {}