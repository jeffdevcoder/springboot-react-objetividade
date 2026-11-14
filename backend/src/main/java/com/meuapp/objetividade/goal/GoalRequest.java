package com.meuapp.objetividade.goal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

public record GoalRequest(
        @NotBlank(message = "Informe o tópico") @Size(max = 100) String title,
        @Size(max = 2000, message = "Descrição muito longa") String description,
        @NotNull(message = "Informe até quando quer conquistar a meta") LocalDate deadline,
        @Size(max = 20, message = "No máximo 20 subtópicos") List<@Valid GoalStepInput> steps) {}
