package com.meuapp.todolist.task;

import com.meuapp.todolist.user.User;
import com.meuapp.todolist.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class TagService {

    private final TagRepository tags;
    private final UserRepository users;

    public TagService(TagRepository tags, UserRepository users) {
        this.tags = tags;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<TagView> list(String email) {
        return tags.findByUserOrderByIdAsc(user(email)).stream().map(TagView::of).toList();
    }

    @Transactional
    public TagView create(String email, CreateTagRequest req) {
        User user = user(email);
        String name = req.name().trim().replaceAll("\\s+", " ");

        if (name.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome da tag");
        }
        if (name.split(" ").length > 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A tag pode ter no máximo 4 palavras");
        }
        if (req.color() == TagColor.DEFAULT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escolha uma cor para a tag");
        }
        if (tags.existsByUserAndNameIgnoreCase(user, name)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Já existe uma tag com esse nome");
        }
        if (tags.existsByUserAndColor(user, req.color().name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Essa cor já está em uso");
        }

        Tag tag = new Tag();
        tag.setUser(user);
        tag.setName(name);
        tag.setColor(req.color().name());
        tags.save(tag);
        return TagView.of(tag);
    }

    private User user(String email) {
        return users.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }
}