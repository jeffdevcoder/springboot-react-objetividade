import { useEffect, useState } from 'react'
import { usePopoverPosition } from '../usePopoverPosition'
import '../styles/emoji.css'

const RECENT_KEY = 'recentEmojis'
const RECENT_MAX = 16

function loadRecent() {
    try {
        const list = JSON.parse(localStorage.getItem(RECENT_KEY))
        return Array.isArray(list) ? list.slice(0, RECENT_MAX) : []
    } catch {
        return []
    }
}

function saveRecent(emoji) {
    const next = [emoji, ...loadRecent().filter(e => e !== emoji)].slice(0, RECENT_MAX)
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch {}
}

export default function EmojiPicker({ groups: baseGroups, value, onSelect, onSave, onClose }) {
    const [groups] = useState(() => {
        const recent = loadRecent()
        return recent.length ? [{ name: 'Recentes', icon: '🕘', emojis: recent }, ...baseGroups] : baseGroups
    })
    const [group, setGroup] = useState(() => {
        const own = groups.findIndex(g => g.name !== 'Recentes' && g.emojis.includes(value))
        return Math.max(own, 0)
    })
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
        else {
            saveRecent(emoji)
            onSelect(emoji)
        }
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
                            onClick={() => {
                                saveRecent(pending)
                                onSave(pending)
                            }}
                        >
                            Salvar
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}
