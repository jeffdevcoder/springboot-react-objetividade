import { PASSWORD_RULES, isStrongPassword } from '../password'
import '../styles/password.css'

// Barra de força da senha: vermelha (fraca) até verde (forte, todas as regras atendidas).
export default function PasswordStrength({ password }) {
    if (!password) return null

    const passed = PASSWORD_RULES.filter(r => r.test(password)).length
    const strong = isStrongPassword(password)
    const level = strong ? 'strong' : passed >= 2 ? 'medium' : 'weak'
    const label = { weak: 'Senha fraca', medium: 'Senha média', strong: 'Senha forte' }[level]

    return (
        <div className={`pwd-strength is-${level}`} aria-live="polite">
            <div className="pwd-bar">
                <span style={{ width: `${(strong ? 3 : Math.max(passed, 1)) / 3 * 100}%` }} />
            </div>
            <p className="pwd-label">{label}</p>
            <ul className="pwd-rules">
                {PASSWORD_RULES.map(r => {
                    const ok = r.test(password)
                    return (
                        <li key={r.label} className={ok ? 'is-ok' : ''}>
                            <span aria-hidden="true">{ok ? '✓' : '•'}</span>
                            {r.label}
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
