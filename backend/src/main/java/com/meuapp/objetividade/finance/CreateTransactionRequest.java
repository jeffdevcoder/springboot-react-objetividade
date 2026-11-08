package com.meuapp.objetividade.finance;

import jakarta.validation.constraints.*;

import java.time.LocalDate;

public record CreateTransactionRequest(
        @NotNull TransactionType type,
        @NotNull @Positive
        @Max(value = 1_000_000_000L, message = "Valor máximo: R$ 10.000.000,00")
        Long amountCents,
        @Size(max = 100) String description,
        Long categoryId,
        LocalDate date,
        boolean monthly,
        @Min(1) @Max(420) Integer installments) {}