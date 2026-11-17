package com.meuapp.objetividade.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

/**
 * Backup automático do banco H2 (checklist.mv.db).
 * <p>
 * Usa o comando {@code BACKUP TO} do H2, que gera um .zip consistente com o app rodando
 * (copiar o .mv.db na mão durante uma escrita pode dar um arquivo corrompido).
 * Roda todo dia no horário de {@code app.backup.cron} e também ao iniciar, se o último
 * backup tiver mais de um dia (cobre servidor desligado na hora agendada).
 * Mantém só os {@code app.backup.keep} mais recentes.
 * <p>
 * Restaurar: pare o app, descompacte o .zip dentro da pasta data/ (substituindo checklist.mv.db) e suba de novo.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.backup.enabled", havingValue = "true", matchIfMissing = true)
public class DatabaseBackup {

    private static final Logger log = LoggerFactory.getLogger(DatabaseBackup.class);
    private static final String PREFIX = "checklist-";
    private static final String SUFFIX = ".zip";
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");

    private final JdbcTemplate jdbc;
    private final Path dir;
    private final int keep;

    public DatabaseBackup(JdbcTemplate jdbc,
                          @Value("${app.backup.dir:./backups}") String dir,
                          @Value("${app.backup.keep:14}") int keep) {
        this.jdbc = jdbc;
        this.dir = Path.of(dir).toAbsolutePath().normalize();
        this.keep = Math.max(1, keep);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        Instant last = latest().map(this::modified).orElse(Instant.EPOCH);
        if (Duration.between(last, Instant.now()).toHours() >= 24) run();
    }

    @Scheduled(cron = "${app.backup.cron:0 0 3 * * *}", zone = "${app.backup.zone:America/Sao_Paulo}")
    public synchronized void run() {
        try {
            Files.createDirectories(dir);
            String name = PREFIX + LocalDateTime.now().format(STAMP);
            Path tmp = dir.resolve(name + ".tmp");
            Path target = dir.resolve(name + SUFFIX);

            // grava num .tmp e só renomeia no fim: um backup interrompido nunca parece válido
            Files.deleteIfExists(tmp);
            jdbc.execute("BACKUP TO '" + tmp.toString().replace("'", "''") + "'");
            Files.move(tmp, target, StandardCopyOption.ATOMIC_MOVE);

            log.info("Backup do banco criado: {} ({} KB)", target, Files.size(target) / 1024);
            prune();
        } catch (Exception e) {
            // nunca derruba o app: só registra para aparecer no log
            log.error("Falha no backup automático do banco em {}", dir, e);
        }
    }

    /** Apaga os backups mais antigos, mantendo os {@code keep} mais recentes. */
    private void prune() throws IOException {
        List<Path> all = backups();
        for (int i = keep; i < all.size(); i++) {
            Files.deleteIfExists(all.get(i));
            log.info("Backup antigo removido: {}", all.get(i).getFileName());
        }
    }

    private java.util.Optional<Path> latest() {
        try {
            return backups().stream().findFirst();
        } catch (IOException e) {
            return java.util.Optional.empty();
        }
    }

    /** Backups da pasta, do mais novo para o mais antigo (o nome tem data e hora). */
    private List<Path> backups() throws IOException {
        if (!Files.isDirectory(dir)) return List.of();
        try (Stream<Path> files = Files.list(dir)) {
            List<Path> list = new ArrayList<>(files
                    .filter(p -> {
                        String n = p.getFileName().toString();
                        return n.startsWith(PREFIX) && n.endsWith(SUFFIX);
                    })
                    .toList());
            list.sort(Comparator.comparing((Path p) -> p.getFileName().toString()).reversed());
            return list;
        }
    }

    private Instant modified(Path p) {
        try {
            FileTime t = Files.getLastModifiedTime(p);
            return t.toInstant();
        } catch (IOException e) {
            return Instant.EPOCH;
        }
    }
}
