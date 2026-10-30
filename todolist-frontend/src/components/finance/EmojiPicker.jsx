import { useEffect, useState } from 'react'
import { EMOJI_GROUPS } from '../../finance'

export default function EmojiPicker({ value, onSelect, onClose }) {
    const [group, setGroup] = useState(0)

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

    const current = EMOJI_GROUPS[group]

    return (
        <>
            <div className="calendar-backdrop" onMouseDown={onClose} />

            <div className="emoji-pop" role="dialog" aria-label="Escolher emoji">
                <div className="emoji-tabs" role="tablist">
                    {EMOJI_GROUPS.map((g, i) => (
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
                            className={`emoji-item ${emoji === value ? 'is-selected' : ''}`}
                            onClick={() => onSelect(emoji)}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            </div>
        </>
    )
}