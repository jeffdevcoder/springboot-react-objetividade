package com.meuapp.objetividade.user;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
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
            @NotBlank(message = "Informe a nova senha")
            @Size(min = 6, message = "A senha deve ter no mínimo 6 caracteres") String newPassword) {}

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository contextRepository = new HttpSessionSecurityContextRepository();

    public AuthController(UserService userService, AuthenticationManager authenticationManager) {
        this.userService = userService;
        this.authenticationManager = authenticationManager;
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
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(body.email().toLowerCase(), body.password()));

            SecurityContext context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(auth);
            SecurityContextHolder.setContext(context);
            contextRepository.saveContext(context, request, response);

            User user = userService.findByEmail(auth.getName());
            return ResponseEntity.ok(view(user));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "E-mail ou senha inválidos"));
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
        User user = userService.changeEmail(auth.getName(), body.email(), body.currentPassword());

        Authentication fresh = new UsernamePasswordAuthenticationToken(
                user.getEmail(), null, auth.getAuthorities());
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(fresh);
        SecurityContextHolder.setContext(context);
        contextRepository.saveContext(context, request, response);

        return view(user);
    }

    @PutMapping("/password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody PasswordRequest body, Principal principal) {
        userService.changePassword(principal.getName(), body.currentPassword(), body.newPassword());
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
