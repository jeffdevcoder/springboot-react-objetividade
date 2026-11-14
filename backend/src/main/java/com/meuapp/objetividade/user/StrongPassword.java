package com.meuapp.objetividade.user;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/**
 * Senha forte: 8 a 72 caracteres, com pelo menos um número e um caractere especial.
 * (72 é o limite do BCrypt; o resto seria ignorado.) Manter igual a frontend/src/password.js.
 */
@Documented
@Constraint(validatedBy = StrongPasswordValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface StrongPassword {
    String message() default "Senha fraca";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
