import { useEffect, useState } from 'react'

const FunnelIcon = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 5h18l-7 8.5V19l-4 2v-7.5L3 5z" />
    </svg>
)

const Mark = ({ option }) =>
    option.emoji ? <span className="filter-emoji">{option.emoji}</span>
        : option.color ? <span className="tag-dot" style={{ background: option.color }} />
            : null

export default function FilterMenu({ options, value, onChange, placeholder, emptyText, onOpen }) {
    const [open, setOpen] = useState(false)
    const current = options.find(o => o.key === value) ?? options[0]
    const active = current.key !== options[0].key

    useEffect(() => {
        if (!open) return
        onOpen?.()
        const onKey = e => e.key === 'Escape' && setOpen(false)
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open])

    function pick(key) {
        onChange(key)
        setOpen(false)
    }

    return (
        <div className="tag-filter">
            <button
                type="button"
                className={`tag-filter-btn ${active ? 'is-active' : ''} ${active && current.tone ? `tone-${current.tone}` : ''}`}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                title="Filtrar"
            >
                {active && (current.emoji || current.color) ? <Mark option={current} /> : <FunnelIcon />}
                <span className="tag-filter-label">{active ? current.label : placeholder}</span>
            </button>

            {open && (
                <>
                    <div className="calendar-backdrop" onMouseDown={() => setOpen(false)} />

                    <div className="user-pop tag-filter-pop" role="menu">
                        {options.map(o => (
                            <div key={o.key} className="filter-opt">
                                {o.divider && <div className="user-pop-sep" />}
                                <button
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={o.key === current.key}
                                    className={`user-pop-item ${o.key === current.key ? 'is-selected' : ''} ${o.tone ? `tone-${o.tone}` : ''}`}
                                    onClick={() => pick(o.key)}
                                >
                                    <Mark option={o} />
                                    <span className="tag-filter-name">{o.label}</span>
                                </button>
                            </div>
                        ))}

                        {emptyText && <p className="tag-filter-empty">{emptyText}</p>}
                    </div>
                </>
            )}
        </div>
    )
}
