import { useState } from 'react'

// Campo de senha com o botão de "olhinho" para mostrar/ocultar o que foi digitado.
export default function PasswordInput({ className = '', ...props }) {
    const [visible, setVisible] = useState(false)

    return (
        <div className="password-wrapper">
            <input
                {...props}
                className={`form-input password-input ${className}`}
                type={visible ? 'text' : 'password'}
            />
            <button
                className="password-toggle"
                type="button"
                onClick={() => setVisible(v => !v)}
                aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={visible}
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    {visible ? (
                        <>
                            <path d="M3 3l18 18" />
                            <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                            <path d="M9.9 5.2A11 11 0 0 1 12 5c5 0 9 7 9 7a15 15 0 0 1-3 3.8" />
                            <path d="M6.2 6.2C3.6 8 2 12 2 12s4 7 10 7a9 9 0 0 0 4-.9" />
                        </>
                    ) : (
                        <>
                            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
                            <circle cx="12" cy="12" r="3" />
                        </>
                    )}
                </svg>
            </button>
        </div>
    )
}
