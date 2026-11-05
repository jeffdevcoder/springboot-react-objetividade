package com.meuapp.todolist.task;

import com.meuapp.todolist.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByUserAndActiveTrueOrderByIdAsc(User user);
    Optional<Task> findByIdAndUserAndActiveTrue(Long id, User user);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Task t set t.tag = null where t.tag = :tag")
    void clearTag(@Param("tag") Tag tag);
}