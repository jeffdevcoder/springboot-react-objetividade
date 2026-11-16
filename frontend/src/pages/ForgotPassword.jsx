import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import '../styles/auth.css'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import PasswordInput from '../components/PasswordInput'
import PasswordStrength from '../components/PasswordStrength'
import { isStrongPassword } from '../password'

const RESEND_SECONDS = 60

export default function ForgotPassword() {
    const navigate = useNavigate()

    // etapa 1: e-mail · etapa 2: código + nova senha
    const [step, setStep] = useState('email')
    const [email, setEmail] = useState('')
    const [code, setCode] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')

    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [loading, setLoading] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const codeRef = useRef(null)

    useEffect(() => {
        if (cooldown <= 0) return
        const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
        return () => clearTimeout(timer)
    }, [cooldown])

    useEffect(() => {
        if (step === 'reset') codeRef.current?.focus()
    }, [step])

    async function sendCode() {
        await api('/auth/password/forgot', {
            method: 'POST',
            body: { email: email.trim() }
        })
        setCode('')
        setCooldown(RESEND_SECONDS)
    }

    async function handleRequest(e) {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await sendCode()
            setNotice('')
            setStep('reset')
        } catch (err) {
            setError(err.message || 'Não foi possível enviar o código. Tente novamente.')
        } finally {
            setLoading(false)
        }
    }

    async function handleResend() {
        setError('')
        setNotice('')
        try {
            await sendCode()
            setNotice('Se o e-mail tiver uma conta, enviamos um novo código.')
            codeRef.current?.focus()
        } catch (err) {
            setError(err.message || 'Não foi possível reenviar o código.')
        }
    }

    async function handleReset(e) {
        e.preventDefault()
        setError('')
        setNotice('')

        if (!isStrongPassword(password)) {
            setError('A senha precisa ter no mínimo 8 caracteres, um número e um caractere especial.')
            return
        }
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.')
            return
        }

        setLoading(true)
        try {
            await api('/auth/password/reset', {
                method: 'POST',
                body: { email: email.trim(), code, newPassword: password }
            })
            navigate('/login', { state: { notice: 'Senha redefinida! Entre com a nova senha.' } })
        } catch (err) {
            setError(err.message || 'Não foi possível redefinir a senha.')
        } finally {
            setLoading(false)
        }
    }

    function backToEmail() {
        setStep('email')
        setError('')
        setNotice('')
    }

    return (
        <main className="auth-page">
            <ThemeToggle className="is-floating" />

            <Link to="/login" className="brand" aria-label="objetividade - início">
                <Logo />
                <span>Objetividade</span>
            </Link>

            {step === 'email' ? (
                <section className="auth-card">
                    <p className="auth-eyebrow">Esqueceu a senha?</p>

                    <h1 className="auth-title">Vamos redefinir.</h1>

                    <p className="auth-description">
                        Informe o e-mail da sua conta e enviaremos um código
                        para você criar uma nova senha.
                    </p>

                    <form className="auth-form" onSubmit={handleRequest}>
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
                                autoFocus
                            />
                        </div>

                        {error && (
                            <p className="auth-error" role="alert">
                                {error}
                            </p>
                        )}

                        <button className="primary-button" type="submit" disabled={loading}>
                            {loading ? 'Enviando código...' : 'Enviar código'}
                            {!loading && <span aria-hidden="true">→</span>}
                        </button>
                    </form>

                    <p className="auth-footer">
                        Lembrou a senha?{' '}
                        <Link className="auth-link" to="/login">
                            Entrar
                        </Link>
                    </p>
                </section>
            ) : (
                <section className="auth-card">
                    <p className="auth-eyebrow">Redefinir senha</p>

                    <h1 className="auth-title">Crie uma nova senha.</h1>

                    <p className="auth-description">
                        Se <strong className="auth-strong">{email.trim()}</strong> tiver
                        uma conta, você vai receber um código de 6 dígitos.
                        Ele vale por 15 minutos.
                    </p>

                    <form className="auth-form" onSubmit={handleReset}>
                        <div className="form-field">
                            <label className="form-label" htmlFor="code">
                                Código recebido
                            </label>

                            <input
                                ref={codeRef}
                                className="form-input code-input"
                                id="code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="000000"
                                maxLength={6}
                                value={code}
                                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                            />
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="newPassword">
                                Nova senha
                            </label>

                            <PasswordInput
                                id="newPassword"
                                placeholder="Mínimo de 8 caracteres"
                                autoComplete="new-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                minLength={8}
                                required
                            />

                            <PasswordStrength password={password} />
                        </div>

                        <div className="form-field">
                            <label className="form-label" htmlFor="confirmPassword">
                                Confirme a nova senha
                            </label>

                            <PasswordInput
                                id="confirmPassword"
                                placeholder="Digite a nova senha novamente"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={e => setConfirmPassword(e.target.value)}
                                minLength={8}
                                required
                            />
                        </div>

                        {error && (
                            <p className="auth-error" role="alert">
                                {error}
                            </p>
                        )}

                        {notice && (
                            <p className="auth-notice" role="status">
                                {notice}
                            </p>
                        )}

                        <button
                            className="primary-button"
                            type="submit"
                            disabled={loading || code.length !== 6}
                        >
                            {loading ? 'Salvando...' : 'Salvar nova senha'}
                            {!loading && <span aria-hidden="true">→</span>}
                        </button>
                    </form>

                    <p className="auth-footer">
                        Não recebeu?{' '}
                        {cooldown > 0 ? (
                            <span>Reenviar em {cooldown}s</span>
                        ) : (
                            <button type="button" className="auth-link auth-link-button" onClick={handleResend}>
                                Reenviar código
                            </button>
                        )}
                        <br />
                        <button type="button" className="auth-link auth-link-button auth-back" onClick={backToEmail}>
                            Alterar e-mail
                        </button>
                    </p>
                </section>
            )}

            <p className="auth-legal">
                {step === 'email'
                    ? 'Simplicidade para organizar o seu dia.'
                    : 'Confira também a caixa de spam.'}
            </p>
        </main>
    )
}
