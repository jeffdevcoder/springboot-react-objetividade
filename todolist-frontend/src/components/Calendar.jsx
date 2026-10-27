import { useEffect, useState } from 'react'

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const pad = n => String(n).padStart(2, '0')
const makeIso = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`

export default function Calendar({ value, min, today, align = 'center', onSelect, onClose }) {
    const [view, setView] = useState(() => {
        const [year, month] = (value || min || today).split('-').map(Number)
        return { year, month: month - 1 }
    })

    useEffect(() => {
        // em fase de captura, para o Esc fechar só o calendário e não o pop-up que está atrás
        const onKey = e => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [onClose])

    function shift(delta) {
        setView(({ year, month }) => {
            const date = new Date(year, month + delta, 1)
            return { year: date.getFullYear(), month: date.getMonth() }
        })
    }

    const firstWeekday = new Date(view.year, view.month, 1).getDay() // 0 = domingo
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
    const cells = [
        ...Array(firstWeekday).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ]

    const rawTitle = new Date(view.year, view.month, 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    })
    const title = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1)

    return (
        <>
            <div className="calendar-backdrop" onMouseDown={onClose} />

            <div className={`calendar is-${align}`} role="dialog" aria-label="Escolher data">
                <div className="calendar-head">
                    <button type="button" className="day-btn" onClick={() => shift(-1)} aria-label="Mês anterior">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <span className="calendar-title">{title}</span>

                    <button type="button" className="day-btn" onClick={() => shift(1)} aria-label="Próximo mês">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>

                <div className="calendar-grid calendar-weekdays" aria-hidden="true">
                    {WEEKDAYS.map((letter, i) => (
                        <span key={i}>{letter}</span>
                    ))}
                </div>

                <div className="calendar-grid">
                    {cells.map((day, i) => {
                        if (!day) return <span key={`empty-${i}`} />

                        const iso = makeIso(view.year, view.month, day)
                        const classes = ['calendar-day']
                        if (iso === today) classes.push('is-today')
                        if (iso === value) classes.push('is-selected')

                        return (
                            <button
                                key={iso}
                                type="button"
                                className={classes.join(' ')}
                                disabled={Boolean(min) && iso < min}
                                onClick={() => onSelect(iso)}
                            >
                                {day}
                            </button>
                        )
                    })}
                </div>

                {value !== today && (
                    <button
                        type="button"
                        className="calendar-today"
                        disabled={Boolean(min) && today < min}
                        onClick={() => onSelect(today)}
                    >
                        Hoje
                    </button>
                )}
            </div>
        </>
    )
}