import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import '../styles/auth.css'
import ThemeToggle from "../components/ThemeToggle.jsx";
import Logo from "../components/Logo.jsx";

export default function Register() {
    const navigate = useNavigate()

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: ''
    })

    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState('')

    const update = field => e => {
        setForm(prev => ({
            ...prev,
            [field]: e.target.value
        }))
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        if (form.password !== confirmPassword) {
            setError('As senhas não coincidem.')
            return
        }

        try {
            await api('/auth/register', {
                method: 'POST',
                body: form
            })

            navigate('/login')
        } catch (err) {
            setError(
                err.message || 'Não foi possível criar sua conta. Tente novamente.'
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="auth-page">
            <ThemeToggle className="is-floating" />

            <Link to="/login" className="brand" aria-label="objetividade - início">
                <Logo />
                <span>Objetividade</span>
            </Link>

            <section className="auth-card">
                <p className="auth-eyebrow">Comece por aqui</p>

                <h1 className="auth-title">Crie sua conta.</h1>

                <p className="auth-description">
                    Um espaço simples para organizar suas tarefas e
                    acompanhar seu progresso.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="form-field">
                        <label className="form-label" htmlFor="name">
                            Nome de usuário
                        </label>

                        <input
                            className="form-input"
                            id="name"
                            type="text"
                            placeholder="Como podemos te chamar?"
                            autoComplete="name"
                            value={form.name}
                            onChange={update('name')}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-label" htmlFor="email">
                            E-mail
                        </label>

                        <input
                            className="form-input"
                            id="email"
                            type="email"
                            placeholder="voce@exemplo.com"
                            autoComplete="email"
                            value={form.email}
                            onChange={update('email')}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-label" htmlFor="password">
                            Senha
                        </label>

                        <div className="password-wrapper">
                            <input
                                className="form-input"
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Mínimo de 6 caracteres"
                                autoComplete="new-password"
                                value={form.password}
                                onChange={update('password')}
                                minLength={6}
                                required
                            />

                            <button
                                className="password-toggle"
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                                {showPassword ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                        <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 7 9 7a15 15 0 0 1-3 3.8" />
                                        <path d="M6.2 6.2C3.6 8 2 12 2 12s4 7 10 7a9 9 0 0 0 4-.9" />
                                    </svg>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="form-field">
                        <label className="form-label" htmlFor="confirmPassword">
                            Confirme sua senha
                        </label>

                        <div className="password-wrapper">
                            <input
                                className="form-input"
                                id="confirmPassword"
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Digite sua senha novamente"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                minLength={6}
                                required
                            />

                            <button
                                className="password-toggle"
                                type="button"
                                onClick={() =>
                                    setShowConfirmPassword(!showConfirmPassword)
                                }
                                aria-label={
                                    showConfirmPassword
                                        ? 'Ocultar confirmação de senha'
                                        : 'Mostrar confirmação de senha'
                                }
                            >
                                {showConfirmPassword ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                        <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 7 9 7a15 15 0 0 1-3 3.8" />
                                        <path d="M6.2 6.2C3.6 8 2 12 2 12s4 7 10 7a9 9 0 0 0 4-.9" />
                                    </svg>
                                ) : (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="1.7"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                                        <circle cx="12" cy="12" r="3" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <p className="auth-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button
                        className="primary-button"
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? 'Criando conta...' : 'Criar minha conta'}
                        {!loading && <span aria-hidden="true">→</span>}
                    </button>
                </form>

                <p className="auth-footer">
                    Já tem uma conta?{' '}
                    <Link className="auth-link" to="/login">
                        Entrar
                    </Link>
                </p>
            </section>

            <p className="auth-legal">
                Comece com o essencial. Evolua no seu ritmo.
            </p>
        </main>
    )
}