package com.meuapp.todolist.finance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record CreateTransactionRequest(
        @NotNull TransactionType type,
        @NotNull @Positive Long amountCents,
        @NotBlank @Size(max = 100) String description,
        Long categoryId,
        LocalDate date) {}