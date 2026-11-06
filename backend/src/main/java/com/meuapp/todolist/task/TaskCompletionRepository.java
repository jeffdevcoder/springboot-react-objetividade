package com.meuapp.todolist.task;

import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;
import java.util.Optional;

public interface TaskCompletionRepository extends JpaRepository<TaskCompletion, Long> {
    boolean existsByTaskAndDateGreaterThanEqual(Task task, LocalDate date);
    boolean existsByTaskAndDate(Task task, LocalDate date);
    void deleteByTaskAndDate(Task task, LocalDate date);
    Optional<TaskCompletion> findFirstByTaskAndDateGreaterThanEqualOrderByDateAsc(Task task, LocalDate date);
}

