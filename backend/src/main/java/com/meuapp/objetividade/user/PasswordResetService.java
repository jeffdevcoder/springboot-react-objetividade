package com.meuapp.objetividade.user;

import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

@Service
public class PasswordResetService {

    static final int CODE_MINUTES = 15;
    static final int RESEND_SECONDS = 60;
    static final int MAX_ATTEMPTS = 5;

    private static final String INVALID = "Código inválido ou expirado. Peça um novo código.";

    private final PasswordResetRepository resets;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final VerificationMailer mailer;
    private final SecureRandom random = new SecureRandom();

    public PasswordResetService(PasswordResetRepository resets, UserRepository users,
                                PasswordEncoder encoder, VerificationMailer mailer) {
        this.resets = resets;
        this.users = users;
        this.encoder = encoder;
        this.mailer = mailer;
    }

    @Transactional
    public void request(String rawEmail) {
        String email = normalize(rawEmail);
        Optional<User> user = users.findByEmail(email);
        if (user.isEmpty()) return;

        PasswordReset r = resets.findByEmail(email).orElseGet(PasswordReset::new);
        if (r.getId() != null
                && Duration.between(r.getLastSentAt(), Instant.now()).toSeconds() < RESEND_SECONDS) {
            return;
        }

        String code = String.format("%06d", random.nextInt(1_000_000));
        Instant now = Instant.now();
        r.setEmail(email);
        r.setCodeHash(encoder.encode(code));
        r.setExpiresAt(now.plus(Duration.ofMinutes(CODE_MINUTES)));
        r.setLastSentAt(now);
        r.setAttempts(0);
        resets.save(r);
        mailer.sendPasswordResetCode(email, user.get().getName(), code, CODE_MINUTES);
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public String reset(String rawEmail, String rawCode, String newPassword) {
        String email = normalize(rawEmail);
        PasswordReset r = resets.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID));
        String code = rawCode == null ? "" : rawCode.replaceAll("\\D", "");

        if (Instant.now().isAfter(r.getExpiresAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID);
        }
        if (r.getAttempts() >= MAX_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas incorretas. Peça um novo código.");
        }
        if (!encoder.matches(code, r.getCodeHash())) {
            r.setAttempts(r.getAttempts() + 1);
            int left = MAX_ATTEMPTS - r.getAttempts();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, left > 0
                    ? "Código incorreto. " + (left == 1 ? "Resta 1 tentativa." : "Restam " + left + " tentativas.")
                    : "Código incorreto. Peça um novo código.");
        }

        User user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID));
        user.setPassword(encoder.encode(newPassword));
        users.save(user);
        resets.delete(r);
        return user.getEmail();
    }

    private static String normalize(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }
}
