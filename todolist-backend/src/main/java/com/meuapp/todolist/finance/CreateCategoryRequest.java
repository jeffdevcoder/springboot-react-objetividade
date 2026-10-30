package com.meuapp.todolist.finance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CreateCategoryRequest(
        @NotBlank @Size(max = 30) String name,
        @NotBlank @Size(max = 16) String emoji,
        @NotBlank @Pattern(regexp = "^#[0-9A-Fa-f]{6}$") String color) {}