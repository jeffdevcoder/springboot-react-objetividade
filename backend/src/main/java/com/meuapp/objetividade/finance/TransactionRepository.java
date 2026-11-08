package com.meuapp.objetividade.finance;

import com.meuapp.objetividade.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update Transaction t set t.category = null where t.category = :category")
    void clearCategory(@Param("category") FinanceCategory category);

    List<Transaction> findByUserAndDateBetweenOrderByDateDescIdDesc(User user, LocalDate from, LocalDate to);
    Optional<Transaction> findByIdAndUser(Long id, User user);

    List<Transaction> findByUserAndInstallmentGroup(User user, String installmentGroup);
    List<Transaction> findByUserAndInstallmentGroupIn(User user, Collection<String> groups);
}