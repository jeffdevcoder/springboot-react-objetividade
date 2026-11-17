package com.meuapp.objetividade.task;

import java.time.LocalDate;
import java.util.List;

/** Resumo do que foi feito e do que ficou pendente num período (semana, mês ou ano, até hoje). */
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

    /** future = dia que ainda não chegou (aparece vazio no gráfico). */
    public record Day(LocalDate date, int planned, int done, boolean future) {}

    /** Feito / não feito somando as tarefas de uma tag (id e color nulos = tarefas sem tag). */
    public record TagStat(Long id, String name, String color, int done, int missed) {}
}
