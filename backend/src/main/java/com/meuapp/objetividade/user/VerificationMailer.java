package com.meuapp.objetividade.user;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Locale;

@Component
public class VerificationMailer {

    private static final Logger log = LoggerFactory.getLogger(VerificationMailer.class);

    private final ObjectProvider<JavaMailSender> mailSender;
    private final TemplateEngine templates;
    private final String host;
    private final String from;

    public VerificationMailer(ObjectProvider<JavaMailSender> mailSender,
                              TemplateEngine templates,
                              @Value("${spring.mail.host:}") String host,
                              @Value("${app.mail.from:}") String from) {
        this.mailSender = mailSender;
        this.templates = templates;
        this.host = host;
        this.from = from;
    }

    public void sendCode(String to, String name, String code, int minutesValid) {
        send(to, name, code, minutesValid,
                "Confirme seu e-mail",
                "Use o código abaixo para concluir seu cadastro.",
                "Se você não pediu este cadastro, é só ignorar este e-mail.",
                code + " é o seu código de confirmação");
    }

    public void sendPasswordResetCode(String to, String name, String code, int minutesValid) {
        send(to, name, code, minutesValid,
                "Redefinir senha",
                "Recebemos um pedido para redefinir a sua senha. Use o código abaixo para criar uma nova.",
                "Se não foi você, ignore este e-mail: sua senha continua a mesma.",
                code + " é o seu código para redefinir a senha");
    }

    private void send(String to, String name, String code, int minutesValid,
                      String eyebrow, String intro, String ignoreNote, String subject) {
        JavaMailSender sender = mailSender.getIfAvailable();
        if (host.isBlank() || sender == null) {
            log.warn("E-mail não configurado (MAIL_HOST). [{}] Código para {}: {}", eyebrow, to, code);
            return;
        }

        Context ctx = new Context(Locale.forLanguageTag("pt-BR"));
        ctx.setVariable("name", name);
        ctx.setVariable("code", code);
        ctx.setVariable("minutes", minutesValid);
        ctx.setVariable("eyebrow", eyebrow);
        ctx.setVariable("intro", intro);
        ctx.setVariable("ignoreNote", ignoreNote);
        String html = templates.process("email/verification-code", ctx);
        String text = "Olá, " + name + "!\n\n" + intro + "\n\nCódigo: " + code
                + "\n\nEle vale por " + minutesValid + " minutos. " + ignoreNote;

        try {
            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            if (!from.isBlank()) helper.setFrom(from, "Objetividade");
            helper.setSubject(subject);
            helper.setText(text, html);
            helper.addInline("logo", new ClassPathResource("mail/logo.png"), "image/png");
            sender.send(message);
        } catch (Exception e) {
            log.error("Falha ao enviar e-mail ({}) para {}", eyebrow, to, e);
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Não foi possível enviar o e-mail. Tente novamente em instantes.");
        }
    }
}
