package com.meuapp.objetividade.finance;

import com.meuapp.objetividade.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FinanceCategoryRepository extends JpaRepository<FinanceCategory, Long> {
    List<FinanceCategory> findByUserOrderByIdAsc(User user);
    Optional<FinanceCategory> findByIdAndUser(Long id, User user);
    boolean existsByUserAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
    boolean existsByUserAndColorIgnoreCaseAndIdNot(User user, String color, Long id);
}