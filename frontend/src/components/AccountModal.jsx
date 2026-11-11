import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import AvatarCarousel from './AvatarCarousel'

export default function AccountModal({ open, onClose }) {
    const { user, updateUser } = useAuth()
    const [name, setName] = useState('')
    const [avatar, setAvatar] = useState(null)
    const [email, setEmail] = useState('')
    const [emailPwd, setEmailPwd] = useState('')
    const [curPwd, setCurPwd] = useState('')
    const [newPwd, setNewPwd] = useState('')
    const [busy, setBusy] = useState('')
    const [status, setStatus] = useState(null)
    const [wasOpen, setWasOpen] = useState(false)

    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setName(user?.name ?? '')
            setAvatar(user?.avatar ?? null)
            setEmail(user?.email ?? '')
            setEmailPwd('')
            setCurPwd('')
            setNewPwd('')
            setStatus(null)
        }
    }

    useEffect(() => {
        if (!open) return
        const onKey = e => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    async function run(key, action) {
        setStatus(null)
        setBusy(key)

        try {
            await action()
            setStatus({ key, ok: true, text: 'Salvo com sucesso!' })
        } catch (err) {
            setStatus({
                key,
                ok: false,
                text: err.message || 'Ocorreu um erro inesperado'
            })
        } finally {
            setBusy('')
        }
    }

    const saveAvatar = async () => {
        const data = await api('/auth/avatar', { method: 'PUT', body: { avatar } })
        updateUser(data)
    }

    const saveName = async () => {
        const data = await api('/auth/profile', { method: 'PUT', body: { name: name.trim() } })
        updateUser(data)
    }

    const saveEmail = async () => {
        const data = await api('/auth/email', {
            method: 'PUT',
            body: { email: email.trim(), currentPassword: emailPwd },
        })
        updateUser(data)
        setEmail(data.email)
        setEmailPwd('')
    }

    const savePassword = async () => {
        await api('/auth/password', {
            method: 'PUT',
            body: { currentPassword: curPwd, newPassword: newPwd },
        })
        setCurPwd('')
        setNewPwd('')
    }

    const message = key =>
        status?.key === key && status.text ? (
            <p className={`account-msg ${status.ok ? '' : 'is-error'}`}>{status.text}</p>
        ) : null

    const avatarChanged = avatar !== (user?.avatar ?? null)
    const nameChanged = name.trim() && name.trim() !== user?.name
    const emailChanged = email.trim() && email.trim().toLowerCase() !== user?.email

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <div className="task-modal" onMouseDown={e => e.stopPropagation()}>
                <h2>Configurações de conta</h2>

                <div className="task-modal-body">
                    <form
                        className="account-section account-avatar-section"
                        onSubmit={e => { e.preventDefault(); run('avatar', saveAvatar) }}
                    >
                        <span className="form-label">Foto de perfil</span>
                        {open && <AvatarCarousel user={user} value={avatar} onChange={setAvatar} />}
                        <button
                            type="submit"
                            className={`task-btn is-primary account-avatar-save ${avatarChanged ? '' : 'is-hidden'}`}
                            disabled={!avatarChanged || busy === 'avatar'}
                        >
                            Salvar
                        </button>
                        {message('avatar')}
                    </form>

                    <form
                        className="account-section"
                        onSubmit={e => { e.preventDefault(); run('name', saveName) }}
                    >
                        <label className="form-label" htmlFor="acc-name">Nome de usuário</label>
                        <div className="account-row">
                            <input
                                id="acc-name"
                                className="form-input"
                                value={name}
                                maxLength={100}
                                autoComplete="off"
                                onChange={e => setName(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="task-btn is-primary"
                                disabled={!nameChanged || busy === 'name'}
                            >
                                Salvar
                            </button>
                        </div>
                        {message('name')}
                    </form>

                    <form
                        className="account-section"
                        onSubmit={e => { e.preventDefault(); run('email', saveEmail) }}
                    >
                        <label className="form-label" htmlFor="acc-email">E-mail</label>
                        <input
                            id="acc-email"
                            className="form-input"
                            type="email"
                            value={email}
                            autoComplete="off"
                            onChange={e => setEmail(e.target.value)}
                        />
                        {emailChanged && (
                            <div className="account-row task-fade">
                                <input
                                    className="form-input"
                                    type="password"
                                    placeholder="Senha atual"
                                    value={emailPwd}
                                    autoComplete="off"
                                    onChange={e => setEmailPwd(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="task-btn is-primary"
                                    disabled={!emailPwd || busy === 'email'}
                                >
                                    Salvar
                                </button>
                            </div>
                        )}
                        {message('email')}
                    </form>

                    <form
                        className="account-section"
                        onSubmit={e => { e.preventDefault(); run('password', savePassword) }}
                    >
                        <span className="form-label">Senha</span>
                        <input
                            className="form-input"
                            type="password"
                            placeholder="Senha atual"
                            value={curPwd}
                            autoComplete="off"
                            onChange={e => setCurPwd(e.target.value)}
                        />
                        <div className="account-row">
                            <input
                                className="form-input"
                                type="password"
                                placeholder="Nova senha"
                                value={newPwd}
                                autoComplete="new-password"
                                onChange={e => setNewPwd(e.target.value)}
                            />
                            <button
                                type="submit"
                                className="task-btn is-primary"
                                disabled={!curPwd || newPwd.length < 6 || busy === 'password'}
                            >
                                Salvar
                            </button>
                        </div>
                        {message('password')}
                    </form>
                </div>

                <div className="task-actions">
                    <button type="button" className="task-btn" onClick={onClose}>Fechar</button>
                </div>
            </div>
        </div>
    )
}