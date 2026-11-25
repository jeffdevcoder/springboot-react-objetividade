package com.meuapp.objetividade.user;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

@Service
public class RegistrationService {

    static final int CODE_MINUTES = 15;
    static final int RESEND_SECONDS = 60;
    static final int MAX_ATTEMPTS = 5;

    private final PendingRegistrationRepository pending;
    private final UserService users;
    private final PasswordEncoder encoder;
    private final VerificationMailer mailer;
    private final boolean emailVerification;
    private final SecureRandom random = new SecureRandom();

    public RegistrationService(PendingRegistrationRepository pending, UserService users,
                               PasswordEncoder encoder, VerificationMailer mailer,
                               @Value("${app.email-verification}") boolean emailVerification) {
        this.pending = pending;
        this.users = users;
        this.encoder = encoder;
        this.mailer = mailer;
        this.emailVerification = emailVerification;
    }

    @Transactional
    public boolean start(RegisterForm form) {
        String name = form.getName().trim();
        String email = form.getEmail().trim().toLowerCase();
        users.checkAvailable(name, email);

        if (!emailVerification) {
            users.createVerified(name, email, encoder.encode(form.getPassword()));
            return false;
        }

        PendingRegistration p = pending.findByEmail(email).orElseGet(PendingRegistration::new);
        if (p.getId() != null) checkCooldown(p);

        p.setEmail(email);
        p.setName(name);
        p.setPasswordHash(encoder.encode(form.getPassword()));
        sendNewCode(p);
        return true;
    }

    @Transactional
    public void resend(String rawEmail) {
        PendingRegistration p = find(rawEmail);
        checkCooldown(p);
        sendNewCode(p);
    }

    @Transactional(noRollbackFor = ResponseStatusException.class)
    public void verify(String rawEmail, String rawCode) {
        PendingRegistration p = find(rawEmail);
        String code = rawCode == null ? "" : rawCode.replaceAll("\\D", "");

        if (Instant.now().isAfter(p.getExpiresAt())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "O código expirou. Peça um novo código.");
        }
        if (p.getAttempts() >= MAX_ATTEMPTS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Muitas tentativas incorretas. Peça um novo código.");
        }
        if (!encoder.matches(code, p.getCodeHash())) {
            p.setAttempts(p.getAttempts() + 1);
            int left = MAX_ATTEMPTS - p.getAttempts();
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, left > 0
                    ? "Código incorreto. " + (left == 1 ? "Resta 1 tentativa." : "Restam " + left + " tentativas.")
                    : "Código incorreto. Peça um novo código.");
        }

        users.createVerified(p.getName(), p.getEmail(), p.getPasswordHash());
        pending.delete(p);
    }

    private void sendNewCode(PendingRegistration p) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        Instant now = Instant.now();
        p.setCodeHash(encoder.encode(code));
        p.setExpiresAt(now.plus(Duration.ofMinutes(CODE_MINUTES)));
        p.setLastSentAt(now);
        p.setAttempts(0);
        pending.save(p);
        mailer.sendCode(p.getEmail(), p.getName(), code, CODE_MINUTES);
    }

    private void checkCooldown(PendingRegistration p) {
        long wait = RESEND_SECONDS - Duration.between(p.getLastSentAt(), Instant.now()).toSeconds();
        if (wait > 0) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Aguarde " + wait + (wait == 1 ? " segundo" : " segundos") + " para pedir um novo código.");
        }
    }

    private PendingRegistration find(String rawEmail) {
        String email = rawEmail == null ? "" : rawEmail.trim().toLowerCase();
        return pending.findByEmail(email).orElseThrow(() -> new ResponseStatusException(
                HttpStatus.BAD_REQUEST, "Cadastro não encontrado. Preencha o formulário novamente."));
    }
}
