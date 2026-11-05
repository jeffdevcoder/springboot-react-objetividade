package com.meuapp.todolist.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubtaskInput(Long id, @NotBlank @Size(max = 100) String title) {}