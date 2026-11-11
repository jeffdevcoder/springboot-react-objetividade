import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { useTheme } from '../ThemeContext'
import AccountModal from './AccountModal'
import Avatar from './Avatar'

export default function UserMenu() {
    const { user, logout } = useAuth()
    const { theme, toggle } = useTheme()
    const navigate = useNavigate()
    const [open, setOpen] = useState(false)
    const [account, setAccount] = useState(false)
    const dark = theme === 'dark'

    useEffect(() => {
        if (!open) return
        const onKey = e => {
            if (e.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    async function handleLogout() {
        setOpen(false)
        await logout()
        navigate('/login')
    }

    return (
        <div className="user-menu">
            <button
                type="button"
                className="user-trigger"
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <Avatar user={user} className="user-avatar" />
                <span className="user-name">{user?.name}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </button>

            {open && (
                <>
                    <div className="calendar-backdrop" onMouseDown={() => setOpen(false)} />

                    <div className="user-pop" role="menu">
                        <button
                            type="button"
                            role="menuitem"
                            className="user-pop-item"
                            onClick={() => {
                                setOpen(false)
                                setAccount(true)
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <circle cx="12" cy="8" r="4" />
                                <path d="M4 21a8 8 0 0 1 16 0" />
                            </svg>
                            Configurações de conta
                        </button>

                        <button type="button" role="menuitem" className="user-pop-item" onClick={toggle}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                {dark ? (
                                    <>
                                        <circle cx="12" cy="12" r="4" />
                                        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
                                    </>
                                ) : (
                                    <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
                                )}
                            </svg>
                            {dark ? 'Modo claro' : 'Modo noturno'}
                        </button>

                        <div className="user-pop-sep" />

                        <button type="button" role="menuitem" className="user-pop-item" onClick={handleLogout}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                                <path d="M16 17l5-5-5-5" />
                                <path d="M21 12H9" />
                            </svg>
                            Sair
                        </button>
                    </div>
                </>
            )}

            <AccountModal open={account} onClose={() => setAccount(false)} />
        </div>
    )
}