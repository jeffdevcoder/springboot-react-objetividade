import { useEffect, useState } from 'react'
import { usePopoverPosition } from '../usePopoverPosition'
import '../styles/emoji.css'

// Sem onSave: escolher um emoji já chama onSelect.
// Com onSave: o emoji fica pendente até clicar em "Salvar".
export default function EmojiPicker({ groups, value, onSelect, onSave, onClose }) {
    const [group, setGroup] = useState(() => Math.max(groups.findIndex(g => g.emojis.includes(value)), 0))
    const [pending, setPending] = useState(value ?? null)
    const confirm = Boolean(onSave)
    const [popRef, popStyle] = usePopoverPosition(confirm)

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

    const current = groups[group]
    const selected = confirm ? pending : value

    function pick(emoji) {
        if (confirm) setPending(emoji)
        else onSelect(emoji)
    }

    return (
        <>
            <div
                className="calendar-backdrop"
                onMouseDown={e => {
                    e.stopPropagation()
                    onClose()
                }}
            />

            <div
                ref={popRef}
                className="emoji-pop"
                style={popStyle}
                role="dialog"
                aria-label="Escolher emoji"
                onMouseDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
            >
                <div className="emoji-tabs" role="tablist">
                    {groups.map((g, i) => (
                        <button
                            key={g.name}
                            type="button"
                            role="tab"
                            aria-selected={i === group}
                            aria-label={g.name}
                            title={g.name}
                            className={`emoji-tab ${i === group ? 'is-active' : ''}`}
                            onClick={() => setGroup(i)}
                        >
                            {g.icon}
                        </button>
                    ))}
                </div>

                <p className="emoji-group-name">{current.name}</p>

                <div className="emoji-grid">
                    {current.emojis.map(emoji => (
                        <button
                            key={emoji}
                            type="button"
                            className={`emoji-item ${emoji === selected ? 'is-selected' : ''}`}
                            onClick={() => pick(emoji)}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {confirm && (
                    <div className="emoji-actions">
                        <span className="emoji-preview" aria-live="polite">{pending ?? ''}</span>
                        <button type="button" className="task-btn" onClick={onClose}>Cancelar</button>
                        <button
                            type="button"
                            className="task-btn is-primary"
                            disabled={!pending || pending === value}
                            onClick={() => onSave(pending)}
                        >
                            Salvar
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
