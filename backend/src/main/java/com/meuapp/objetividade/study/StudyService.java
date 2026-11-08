package com.meuapp.objetividade.study;

import com.meuapp.objetividade.user.User;
import com.meuapp.objetividade.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;

@Service
public class StudyService {

    private final SubjectRepository subjects;
    private final StudySessionRepository sessions;
    private final UserRepository users;

    public StudyService(SubjectRepository subjects, StudySessionRepository sessions, UserRepository users) {
        this.subjects = subjects;
        this.sessions = sessions;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<SubjectView> subjects(String email) {
        return subjects.findByUserOrderByIdAsc(user(email)).stream().map(SubjectView::of).toList();
    }

    @Transactional
    public SubjectView createSubject(String email, SubjectRequest req) {
        User user = user(email);
        String name = clean(req.name());
        String color = req.color().toUpperCase();
        validate(user, name, color, -1L);

        Subject s = new Subject();
        s.setUser(user);
        s.setName(name);
        s.setEmoji(req.emoji().trim());
        s.setColor(color);
        subjects.save(s);
        return SubjectView.of(s);
    }

    @Transactional
    public SubjectView updateSubject(String email, Long id, SubjectRequest req) {
        User user = user(email);
        Subject s = subjects.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String name = clean(req.name());
        String color = req.color().toUpperCase();
        validate(user, name, color, id);

        s.setName(name);
        s.setEmoji(req.emoji().trim());
        s.setColor(color);
        return SubjectView.of(s);
    }

    @Transactional
    public void deleteSubject(String email, Long id) {
        Subject s = subjects.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        sessions.deleteBySubject(s);
        subjects.delete(s);
    }

    @Transactional
    public SessionView addSession(String email, SessionRequest req) {
        User user = user(email);
        Subject subject = subjects.findByIdAndUser(req.subjectId(), user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));

        StudySession s = new StudySession();
        s.setUser(user);
        s.setSubject(subject);
        s.setDate(req.date() != null ? req.date() : LocalDate.now());
        s.setSeconds(req.seconds());
        sessions.save(s);
        return SessionView.of(s);
    }

    @Transactional(readOnly = true)
    public List<SessionView> sessions(String email, LocalDate from, LocalDate to) {
        return sessions.findByUserAndDateBetweenOrderByDateAscIdAsc(user(email), from, to)
                .stream().map(SessionView::of).toList();
    }

    private void validate(User user, String name, String color, long selfId) {
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome da matéria");
        }
        if (subjects.existsByUserAndNameIgnoreCaseAndIdNot(user, name, selfId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma matéria com esse nome");
        }
        if (subjects.existsByUserAndColorIgnoreCaseAndIdNot(user, color, selfId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Essa cor já está em uso");
        }
    }

    private String clean(String name) {
        return name.trim().replaceAll("\\s+", " ");
    }

    private User user(String email) {
        return users.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}