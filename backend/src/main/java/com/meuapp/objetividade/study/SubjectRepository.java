package com.meuapp.objetividade.study;

import com.meuapp.objetividade.user.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SubjectRepository extends JpaRepository<Subject, Long> {
    List<Subject> findByUserOrderByIdAsc(User user);
    Optional<Subject> findByIdAndUser(Long id, User user);
    boolean existsByUserAndNameIgnoreCaseAndIdNot(User user, String name, Long id);
    boolean existsByUserAndColorIgnoreCaseAndIdNot(User user, String color, Long id);
}