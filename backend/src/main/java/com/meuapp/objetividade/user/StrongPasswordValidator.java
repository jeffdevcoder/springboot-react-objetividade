package com.meuapp.objetividade.user;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

public class StrongPasswordValidator implements ConstraintValidator<StrongPassword, String> {

    @Override
    public boolean isValid(String value, ConstraintValidatorContext ctx) {
        if (value == null) return true; // @NotBlank cuida do vazio

        String error = null;
        if (value.length() < 8) error = "A senha deve ter no mínimo 8 caracteres";
        else if (value.getBytes(StandardCharsets.UTF_8).length > 72) error = "A senha é longa demais";
        else if (value.chars().noneMatch(Character::isDigit)) error = "A senha deve ter pelo menos um número";
        else if (value.chars().allMatch(c -> Character.isLetterOrDigit(c) || Character.isWhitespace(c)))
            error = "A senha deve ter pelo menos um caractere especial";

        if (error == null) return true;
        ctx.disableDefaultConstraintViolation();
        ctx.buildConstraintViolationWithTemplate(error).addConstraintViolation();
        return false;
    }
}
