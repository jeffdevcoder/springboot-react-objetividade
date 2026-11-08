package com.meuapp.objetividade.task;

import com.meuapp.objetividade.user.User;
import com.meuapp.objetividade.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TagService {

    private final TagRepository tags;
    private final TaskRepository tasks;
    private final UserRepository users;

    public TagService(TagRepository tags, TaskRepository tasks, UserRepository users) {
        this.tags = tags;
        this.tasks = tasks;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<TagView> list(String email) {
        return tags.findByUserOrderByIdAsc(user(email)).stream().map(TagView::of).toList();
    }

    @Transactional
    public TagView create(String email, CreateTagRequest req) {
        User user = user(email);
        String name = clean(req.name());
        validate(user, name, req.color(), -1L);

        Tag tag = new Tag();
        tag.setUser(user);
        tag.setName(name);
        tag.setColor(req.color().name());
        tags.save(tag);
        return TagView.of(tag);
    }

    @Transactional
    public TagView update(String email, Long id, CreateTagRequest req) {
        User user = user(email);
        Tag tag = tags.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        String name = clean(req.name());
        validate(user, name, req.color(), id);

        tag.setName(name);
        tag.setColor(req.color().name());
        return TagView.of(tag);
    }

    @Transactional
    public void delete(String email, Long id) {
        Tag tag = tags.findByIdAndUser(id, user(email))
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        tasks.clearTag(tag);
        tags.delete(tag);
    }

    private void validate(User user, String name, TagColor color, long selfId) {
        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome da tag");
        }
        if (name.split(" ").length > 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A tag pode ter no máximo 4 palavras");
        }
        if (color == TagColor.DEFAULT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escolha uma cor para a tag");
        }
        if (tags.existsByUserAndNameIgnoreCaseAndIdNot(user, name, selfId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma tag com esse nome");
        }
        if (tags.existsByUserAndColorAndIdNot(user, color.name(), selfId)) {
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