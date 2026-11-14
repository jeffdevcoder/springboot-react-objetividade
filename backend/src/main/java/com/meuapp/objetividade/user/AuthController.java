package com.meuapp.objetividade.user;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

import java.security.Principal;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    public record LoginRequest(@NotBlank String email, @NotBlank String password) {}
    public record ProfileRequest(
            @NotBlank(message = "Informe o nome") @Size(max = 100) String name) {}

    public record AvatarRequest(@Size(max = 64) String avatar) {}

    public record EmailRequest(
            @NotBlank(message = "Informe o e-mail") @Email(message = "E-mail inválido") String email,
            @NotBlank(message = "Informe a senha atual") String currentPassword) {}

    public record PasswordRequest(
            @NotBlank(message = "Informe a senha atual") String currentPassword,
            @NotBlank(message = "Informe a nova senha") @StrongPassword String newPassword) {}

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final LoginAttemptService loginAttempts;
    private final FindByIndexNameSessionRepository<? extends Session> sessions;
    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(UserService userService,
                          AuthenticationManager authenticationManager,
                          LoginAttemptService loginAttempts,
                          FindByIndexNameSessionRepository<? extends Session> sessions) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
        this.loginAttempts = loginAttempts;
        this.sessions = sessions;
    }

    @GetMapping("/csrf")
    public Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken());
    }

    @PostMapping("/register")
    public ResponseEntity<Void> register(@Valid @RequestBody RegisterForm form) {
        userService.register(form);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest body,
                                   HttpServletRequest request,
                                   HttpServletResponse response) {
        String email = body.email().trim().toLowerCase();

        long locked = loginAttempts.secondsLocked(email);
        if (locked > 0) return tooManyAttempts(locked);

        Authentication auth;
        try {
            auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, body.password()));
        } catch (AuthenticationException e) {
            loginAttempts.failed(email);
            locked = loginAttempts.secondsLocked(email);
            if (locked > 0) return tooManyAttempts(locked);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "E-mail ou senha inválidos"));
        }

        loginAttempts.succeeded(email);
        startSession(auth, request, response);

        User user = userService.findByEmail(auth.getName());
        return ResponseEntity.ok(view(user));
    }

    private static ResponseEntity<Map<String, String>> tooManyAttempts(long seconds) {
        long minutes = Math.max(1, (seconds + 59) / 60);
        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("message", "Muitas tentativas de login. Tente novamente em "
                        + minutes + (minutes == 1 ? " minuto." : " minutos.")));
    }

    /** Autentica a sessão trocando o ID dela, para evitar fixação de sessão. */
    private void startSession(Authentication auth, HttpServletRequest request, HttpServletResponse response) {
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(auth);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);
    }

    /** Encerra as sessões do usuário em todos os dispositivos (menos a atual, se keepCurrent). */
    private void endSessions(String email, HttpServletRequest request, boolean keepCurrent) {
        HttpSession current = request.getSession(false);
        String currentId = current != null ? current.getId() : null;

        sessions.findByPrincipalName(email).keySet().stream()
                .filter(id -> !(keepCurrent && id.equals(currentId)))
                .forEach(sessions::deleteById);

        if (!keepCurrent) {
            if (current != null) current.invalidate();
            SecurityContextHolder.clearContext();
        }
    }

    @GetMapping("/me")
    public Map<String, Object> me(Principal principal) {
        User user = userService.findByEmail(principal.getName());
        return view(user);
    }

    @PutMapping("/profile")
    public Map<String, Object> updateProfile(@Valid @RequestBody ProfileRequest body, Principal principal) {
        User user = userService.updateName(principal.getName(), body.name());
        return view(user);
    }

    @PutMapping("/avatar")
    public Map<String, Object> updateAvatar(@Valid @RequestBody AvatarRequest body, Principal principal) {
        return view(userService.updateAvatar(principal.getName(), body.avatar()));
    }

    @PutMapping("/email")
    public Map<String, Object> changeEmail(@Valid @RequestBody EmailRequest body,
                                           Authentication auth,
                                           HttpServletRequest request,
                                           HttpServletResponse response) {
        String oldEmail = auth.getName();
        User user = userService.changeEmail(oldEmail, body.email(), body.currentPassword());

        // sessões em outros dispositivos ainda apontam para o e-mail antigo: encerra todas
        endSessions(oldEmail, request, true);

        Authentication fresh = new UsernamePasswordAuthenticationToken(
                user.getEmail(), null, auth.getAuthorities());
        startSession(fresh, request, response);

        return view(user);
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordRequest body,
                                               Principal principal,
                                               HttpServletRequest request) {
        userService.changePassword(principal.getName(), body.currentPassword(), body.newPassword());
        // desloga em todos os dispositivos (inclusive este): é preciso entrar de novo com a nova senha
        endSessions(principal.getName(), request, false);
        return ResponseEntity.noContent().build();
    }

    private static Map<String, Object> view(User user) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("email", user.getEmail());
        m.put("name", user.getName());
        m.put("avatar", user.getAvatar());
        return m;
    }
}
