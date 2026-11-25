package com.meuapp.objetividade.task;

import java.time.LocalDate;
import java.util.List;

public record TaskStatsView(
        String period,
        LocalDate from,
        LocalDate to,
        boolean hasTasks,
        int planned,
        int done,
        int missed,
        int percent,
        List<Day> days,
        List<TagStat> tags) {

    public record Day(LocalDate date, int planned, int done, boolean future) {}

    public record TagStat(Long id, String name, String color, int done, int missed) {}
}
