package com.meuapp.objetividade.goal;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record GoalStepInput(Long id, @NotBlank @Size(max = 100) String title, Boolean done) {}
