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
        List<Item> doneItems,
        List<Item> missedItems) {

    /** future = dia que ainda não chegou (aparece vazio no gráfico). */
    public record Day(LocalDate date, int planned, int done, boolean future) {}

    /** Uma tarefa e quantas vezes ela foi feita (ou deixou de ser) no período. */
    public record Item(Long id, String title, String emoji, int count) {}
}
