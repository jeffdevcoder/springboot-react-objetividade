package com.meuapp.todolist.task;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;

public record CreateTaskRequest(
        @NotBlank(message = "Informe o nome da tarefa") @Size(max = 100) String title,
        @Size(max = 500) String description,
        @NotNull Recurrence recurrence,
        LocalDate startDate,
        LocalDate endDate,
        boolean urgent,
        Set<DayOfWeek> weekdays,
        LocalTime time,
        @Size(max = 10, message = "Máximo de 10 subtarefas") List<@Valid SubtaskInput> subtasks) {}