import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import { STUDY_PALETTE } from '../../study'
import EmojiPicker from '../EmojiPicker'
import { STUDY_EMOJI_GROUPS } from '../../emojis'

const DEFAULT_EMOJI = '📚'

export default function SubjectModal({ open, subject, subjects, onClose, onChanged }) {
    const editing = Boolean(subject)
    const [name, setName] = useState('')
    const [emoji, setEmoji] = useState(DEFAULT_EMOJI)
    const [color, setColor] = useState('')
    const [emojiOpen, setEmojiOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [wasOpen, setWasOpen] = useState(false)
    const inputRef = useRef(null)

    const taken = new Set(subjects.filter(s => s.id !== subject?.id).map(s => s.color.toUpperCase()))
    const free = STUDY_PALETTE.filter(c => !taken.has(c.hex))

    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setName(subject?.name ?? '')
            setEmoji(subject?.emoji ?? DEFAULT_EMOJI)
            setColor(subject ? subject.color.toUpperCase() : (free[0]?.hex ?? ''))
            setEmojiOpen(false)
            setConfirmDelete(false)
            setError('')
        }
    }

    useEffect(() => {
        if (!open) return
        const timer = setTimeout(() => { if (!editing) inputRef.current?.focus() }, 80)
        const onKey = e => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('keydown', onKey)
        }
    }, [open, editing, onClose])

    useEffect(() => {
        if (!confirmDelete) return
        const timer = setTimeout(() => setConfirmDelete(false), 4000)
        return () => clearTimeout(timer)
    }, [confirmDelete])

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        const clean = name.trim().replace(/\s+/g, ' ')
        if (!clean || !color) return
        if (subjects.some(s => s.id !== subject?.id && s.name.toLowerCase() === clean.toLowerCase())) {
            setError('Já existe uma matéria com esse nome')
            return
        }

        setSaving(true)
        try {
            const body = { name: clean, emoji, color }
            const saved = editing
                ? await api(`/study/subjects/${subject.id}`, { method: 'PUT', body })
                : await api('/study/subjects', { method: 'POST', body })
            onChanged(saved)
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleDelete() {
        if (!confirmDelete) {
            setConfirmDelete(true)
            return
        }
        try {
            await api(`/study/subjects/${subject.id}`, { method: 'DELETE' })
            onChanged(null)
            onClose()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <form className="task-modal" onSubmit={handleSubmit} onMouseDown={e => e.stopPropagation()}>
                <h2>{editing ? 'Editar matéria' : 'Nova matéria'}</h2>

                <div className="cat-new-row">
                    <div className="cat-emoji-anchor">
                        <button
                            type="button"
                            className="form-input cat-emoji-btn"
                            onClick={() => setEmojiOpen(o => !o)}
                            aria-label="Escolher emoji"
                            aria-haspopup="dialog"
                            aria-expanded={emojiOpen}
                        >
                            {emoji}
                        </button>

                        {emojiOpen && (
                            <EmojiPicker
                                groups={STUDY_EMOJI_GROUPS}
                                value={emoji}
                                onSelect={e => {
                                    setEmoji(e)
                                    setEmojiOpen(false)
                                }}
                                onClose={() => setEmojiOpen(false)}
                            />
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        className="form-input"
                        placeholder="Nome da matéria"
                        value={name}
                        maxLength={30}
                        autoComplete="off"
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <div className="tag-swatches" role="radiogroup" aria-label="Cor da matéria">
                    {free.map(c => (
                        <button
                            key={c.hex}
                            type="button"
                            role="radio"
                            aria-checked={color === c.hex}
                            aria-label={c.name}
                            className={`tag-swatch ${color === c.hex ? 'is-selected' : ''}`}
                            style={{ background: c.hex }}
                            onClick={() => setColor(c.hex)}
                        />
                    ))}
                </div>

                {error && <p className="task-error">{error}</p>}

                <div className="task-actions">
                    {editing && (
                        <button
                            type="button"
                            className={`task-btn is-danger ${confirmDelete ? 'is-confirming' : ''}`}
                            onClick={handleDelete}
                            aria-label={confirmDelete ? 'Confirmar exclusão' : 'Excluir matéria'}
                            title="Excluir matéria"
                        >
                            <span className="task-trash" aria-hidden="true">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <path d="M10 11v6M14 11v6" />
                                </svg>
                            </span>
                            <span className="task-confirm-text">Tem certeza?</span>
                        </button>
                    )}

                    <button type="button" className="task-btn" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="task-btn is-primary" disabled={saving || !name.trim() || !color}>
                        Salvar
                    </button>
                </div>
            </form>
        </div>
    )
}