package com.meuapp.objetividade.user;

import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Bloqueia o login de um e-mail depois de várias senhas erradas seguidas,
 * para dificultar ataques de força bruta. Fica em memória: reiniciar o backend zera os contadores.
 */
@Service
public class LoginAttemptService {

    public static final int MAX_ATTEMPTS = 5;
    public static final Duration LOCK_TIME = Duration.ofMinutes(15);

    private record Attempts(int failures, Instant lockedUntil, Instant lastFailure) {}

    private final Map<String, Attempts> attempts = new ConcurrentHashMap<>();

    /** Segundos restantes de bloqueio, ou 0 se o login está liberado. */
    public long secondsLocked(String email) {
        Attempts a = attempts.get(key(email));
        if (a == null || a.lockedUntil() == null) return 0;
        long left = Duration.between(Instant.now(), a.lockedUntil()).toSeconds();
        if (left <= 0) {
            attempts.remove(key(email));
            return 0;
        }
        return left;
    }

    public void failed(String email) {
        Instant now = Instant.now();
        attempts.compute(key(email), (k, a) -> {
            // falhas antigas (fora da janela) não contam mais
            int failures = (a == null || a.lastFailure().isBefore(now.minus(LOCK_TIME))) ? 1 : a.failures() + 1;
            Instant lockedUntil = failures >= MAX_ATTEMPTS ? now.plus(LOCK_TIME) : null;
            return new Attempts(failures, lockedUntil, now);
        });
    }

    public void succeeded(String email) {
        attempts.remove(key(email));
    }

    private static String key(String email) {
        return email.trim().toLowerCase();
    }
}
