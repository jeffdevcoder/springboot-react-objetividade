package com.meuapp.objetividade.note;

import com.meuapp.objetividade.user.User;
import com.meuapp.objetividade.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
public class NoteService {

    // com data primeiro (a mais próxima no topo), depois as sem data (mais recentes primeiro)
    private static final Comparator<Note> ORDER = Comparator
            .comparing(Note::getDate, Comparator.nullsLast(Comparator.naturalOrder()))
            .thenComparing(Note::getCreatedAt, Comparator.reverseOrder());

    private final NoteRepository notes;
    private final UserRepository users;

    public NoteService(NoteRepository notes, UserRepository users) {
        this.notes = notes;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<NoteView> list(String email) {
        return notes.findByUser(user(email)).stream().sorted(ORDER).map(NoteView::of).toList();
    }

    @Transactional
    public NoteView create(String email, NoteRequest req) {
        Note n = new Note();
        n.setUser(user(email));
        apply(n, req);
        notes.save(n);
        return NoteView.of(n);
    }

    @Transactional
    public NoteView update(String email, Long id, NoteRequest req) {
        Note n = find(email, id);
        apply(n, req);
        return NoteView.of(n);
    }

    @Transactional
    public void setEmoji(String email, Long id, String emoji) {
        find(email, id).setEmoji(blankToNull(emoji));
    }

    @Transactional
    public void delete(String email, Long id) {
        notes.delete(find(email, id));
    }

    private void apply(Note n, NoteRequest req) {
        n.setTitle(req.title().trim());
        n.setDescription(blankToNull(req.description()));
        n.setEmoji(blankToNull(req.emoji()));
        n.setDate(req.date());
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private Note find(String email, Long id) {
        return notes.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private User user(String email) {
        return users.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}
