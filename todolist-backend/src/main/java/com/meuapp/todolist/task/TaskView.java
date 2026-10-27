package com.meuapp.todolist.task;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

public record TaskView(Long id, String title, String description, Recurrence recurrence,
                       LocalDate startDate, LocalDate endDate, boolean urgent,
                       Set<DayOfWeek> weekdays, LocalTime time, LocalDate dueDate,
                       TagView tag, boolean done) {}