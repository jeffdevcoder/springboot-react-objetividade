package com.meuapp.todolist.user;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@Service
public class UserService {
    private final UserRepository repository;
    private final PasswordEncoder encoder;


    public UserService(UserRepository repository, PasswordEncoder encoder) {
        this.repository = repository;
        this.encoder = encoder;
    }

    public boolean emailExists(String email) {
        return repository.existsByEmail(email.toLowerCase());
    }

    public void register(RegisterForm form) {
        String name = form.getName().trim();
        String email = form.getEmail().trim().toLowerCase();

        if (repository.existsByNameIgnoreCase(name)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este nome de usuário já está em uso"
            );
        }

        if (repository.existsByEmail(email)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Este e-mail já está cadastrado"
            );
        }

        User user = new User();
        user.setName(name);
        user.setEmail(email);
        user.setPassword(encoder.encode(form.getPassword()));

        repository.save(user);
    }

    public User findByEmail(String email) {
        return repository.findByEmail(email.toLowerCase()).orElseThrow();
    }

    public User updateName(String email, String name) {
        User user = findByEmail(email);
        String clean = name.trim();
        if (repository.existsByNameIgnoreCaseAndIdNot(clean, user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este nome de usuário já está em uso");
        }
        user.setName(clean);
        return repository.save(user);
    }

    public User changeEmail(String email, String newEmail, String currentPassword) {
        User user = findByEmail(email);
        checkPassword(user, currentPassword);

        String clean = newEmail.trim().toLowerCase();
        if (!clean.equals(user.getEmail()) && repository.existsByEmail(clean)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Este e-mail já está cadastrado");
        }
        user.setEmail(clean);
        return repository.save(user);
    }

    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = findByEmail(email);
        checkPassword(user, currentPassword);
        user.setPassword(encoder.encode(newPassword));
        repository.save(user);
    }

    private void checkPassword(User user, String password) {
        if (!encoder.matches(password, user.getPassword())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Senha atual incorreta");
        }
    }

    public boolean nameExists(String name) {
        return repository.existsByNameIgnoreCase(name.trim());
    }
}
