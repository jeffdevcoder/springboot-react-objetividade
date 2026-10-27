import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import '../styles/auth.css'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

export default function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            await login(email, password)
            navigate('/today')
        } catch (err) {
            setError(err.message || 'Não foi possível entrar. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="auth-page">
            <ThemeToggle className="is-floating" />

            <Link to="/login" className="brand" aria-label="objetividade- início">
                <Logo />
                <span>Objetividade</span>
            </Link>

            <section className="auth-card">
                <p className="auth-eyebrow">Bem-vindo de volta</p>

                <h1 className="auth-title">Entre na sua conta.</h1>

                <p className="auth-description">
                    Organize suas pendências e continue de onde parou.
                </p>

                <form className="auth-form" onSubmit={handleSubmit}>
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
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-field">
                        <label className="form-label" htmlFor="password">
                            Senha
                        </label>

                        <div className="password-wrapper">
                            <input
                                className="form-input password-input"
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Digite sua senha"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                            />

                            <button
                                className="password-toggle"
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M3 3l18 18" />
                                        <path d="M10.6 10.6a2 2 0 002.8 2.8" />
                                        <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.5 9.5 7a11.5 11.5 0 01-3 4.1" />
                                        <path d="M6.2 6.2A13 13 0 002.5 12c1 2.5 4.5 7 9.5 7a10.5 10.5 0 004-.8" />
                                    </svg>
                                ) : (
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
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
                        {loading ? 'Entrando...' : 'Entrar na conta'}
                        {!loading && <span aria-hidden="true">→</span>}
                    </button>
                </form>

                <p className="auth-footer">
                    Ainda não tem uma conta?{' '}
                    <Link className="auth-link" to="/register">
                        Criar conta
                    </Link>
                </p>
            </section>

            <p className="auth-legal">
                Simplicidade para organizar o seu dia.
            </p>
        </main>
    )
}