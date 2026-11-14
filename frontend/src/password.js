// Regras de senha forte. Manter igual a StrongPasswordValidator no backend.
export const PASSWORD_RULES = [
    { label: 'Mínimo de 8 caracteres', test: p => p.length >= 8 },
    { label: 'Pelo menos um número', test: p => /\d/.test(p) },
    { label: 'Pelo menos um caractere especial', test: p => /[^\p{L}\p{N}\s]/u.test(p) },
]

export const isStrongPassword = p =>
    PASSWORD_RULES.every(r => r.test(p)) && new TextEncoder().encode(p).length <= 72
