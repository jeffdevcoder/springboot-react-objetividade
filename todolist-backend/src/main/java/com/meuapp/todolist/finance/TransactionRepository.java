package com.meuapp.todolist.finance;

import com.meuapp.todolist.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    List<Transaction> findByUserAndDateBetweenOrderByDateDescIdDesc(User user, LocalDate from, LocalDate to);
    Optional<Transaction> findByIdAndUser(Long id, User user);
}