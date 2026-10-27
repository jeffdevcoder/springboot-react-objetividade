package com.meuapp.todolist.task;

import com.meuapp.todolist.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface TagRepository extends JpaRepository<Tag, Long> {
    List<Tag> findByUserOrderByIdAsc(User user);
    Optional<Tag> findByIdAndUser(Long id, User user);
    boolean existsByUserAndNameIgnoreCase(User user, String name);
    boolean existsByUserAndColor(User user, String color);
}