package com.meuapp.objetividade.task;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;

public interface SubtaskCompletionRepository extends JpaRepository<SubtaskCompletion, Long> {
    boolean existsBySubtaskAndDate(Subtask subtask, LocalDate date);
    void deleteBySubtaskAndDate(Subtask subtask, LocalDate date);
    void deleteBySubtask(Subtask subtask);
}