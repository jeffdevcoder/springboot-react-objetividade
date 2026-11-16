package com.meuapp.objetividade.finance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RecurringPaymentRepository extends JpaRepository<RecurringPayment, Long> {

    List<RecurringPayment> findByRecurringInAndMonth(Collection<RecurringTransaction> recurring, LocalDate month);

    Optional<RecurringPayment> findByRecurringAndMonth(RecurringTransaction recurring, LocalDate month);

    List<RecurringPayment> findByRecurring(RecurringTransaction recurring);

    Optional<RecurringPayment> findByIncomeId(Long incomeId);
}
