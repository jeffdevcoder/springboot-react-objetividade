package com.meuapp.objetividade.study;

import com.meuapp.objetividade.user.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface StudySessionRepository extends JpaRepository<StudySession, Long> {
    Optional<StudySession> findByIdAndUser(Long id, User user);

    List<StudySession> findByUserAndDateBetweenOrderByDateAscIdAsc(User user, LocalDate from, LocalDate to);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("delete from StudySession s where s.subject = :subject")
    void deleteBySubject(@Param("subject") Subject subject);
}