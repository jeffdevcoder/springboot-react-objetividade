import { useEffect, useState } from 'react'

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export default function MonthPicker({ value, current, onSelect, onClose }) {
    const [year, setYear] = useState(() => Number(value.split('-')[0]))

    useEffect(() => {
        const onKey = e => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [onClose])

    return (
        <>
            <div className="calendar-backdrop" onMouseDown={onClose} />

            <div className="emoji-pop month-pop" role="dialog" aria-label="Escolher mês">
                <div className="calendar-head">
                    <button type="button" className="day-btn" onClick={() => setYear(y => y - 1)} aria-label="Ano anterior">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    <span className="calendar-title">{year}</span>

                    <button type="button" className="day-btn" onClick={() => setYear(y => y + 1)} aria-label="Próximo ano">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>
                </div>

                <div className="month-grid">
                    {MONTHS.map((label, i) => {
                        const key = `${year}-${String(i + 1).padStart(2, '0')}`
                        const classes = ['emoji-item', 'month-item']
                        if (key === value) classes.push('is-selected')
                        if (key === current) classes.push('is-current')

                        return (
                            <button
                                key={key}
                                type="button"
                                className={classes.join(' ')}
                                onClick={() => onSelect(key)}
                            >
                                {label}
                            </button>
                        )
                    })}
                </div>

                {value !== current && (
                    <button type="button" className="calendar-today" onClick={() => onSelect(current)}>
                        Mês atual
                    </button>
                )}
            </div>
        </>
    )
}