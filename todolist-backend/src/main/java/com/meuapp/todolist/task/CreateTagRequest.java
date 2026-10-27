package com.meuapp.todolist.task;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateTagRequest(@NotBlank @Size(max = 40) String name, @NotNull TagColor color) {}