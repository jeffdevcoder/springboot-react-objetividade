package com.meuapp.objetividade.finance;

import com.meuapp.objetividade.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RecurringTransactionRepository extends JpaRepository<RecurringTransaction, Long> {

    List<RecurringTransaction> findByUser(User user);

    Optional<RecurringTransaction> findByIdAndUser(Long id, User user);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update RecurringTransaction r set r.category = null where r.category = :category")
    void clearCategory(@Param("category") FinanceCategory category);
}