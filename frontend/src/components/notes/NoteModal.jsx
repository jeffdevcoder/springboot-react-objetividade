import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import { NOTE_EMOJI_GROUPS, NOTE_EMOJI_PLACEHOLDER } from '../../emojis'
import { countdown } from '../../notes'
import DateField from '../DateField'
import EmojiPicker from '../EmojiPicker'

export default function NoteModal({ open, note, onClose, onSaved, onDeleted }) {
    const editing = Boolean(note)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [emoji, setEmoji] = useState('')
    const [date, setDate] = useState('')
    const [emojiOpen, setEmojiOpen] = useState(false)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [wasOpen, setWasOpen] = useState(false)
    const titleRef = useRef(null)

    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setTitle(note?.title ?? '')
            setDescription(note?.description ?? '')
            setEmoji(note?.emoji ?? '')
            setDate(note?.date ?? '')
            setEmojiOpen(false)
            setError('')
            setConfirmDelete(false)
        }
    }

    useEffect(() => {
        if (!open) return
        const timer = setTimeout(() => { if (!editing) titleRef.current?.focus() }, 50)
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
        setSaving(true)
        try {
            const body = { title, description, emoji: emoji || null, date: date || null }
            const saved = editing
                ? await api(`/notes/${note.id}`, { method: 'PUT', body })
                : await api('/notes', { method: 'POST', body })
            onSaved(saved)
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
            await api(`/notes/${note.id}`, { method: 'DELETE' })
            onDeleted(note.id)
            onClose()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <form className="task-modal note-modal" onSubmit={handleSubmit} onMouseDown={e => e.stopPropagation()}>
                <h2>{editing ? 'Anotação' : 'Nova anotação'}</h2>

                <div className="task-modal-body">
                    <div className="task-title-row">
                        <div className="task-emoji-anchor">
                            <button
                                type="button"
                                className="form-input task-emoji-field"
                                onClick={() => setEmojiOpen(o => !o)}
                                aria-label={emoji ? 'Trocar emoji' : 'Escolher emoji'}
                                title={emoji ? 'Trocar emoji' : 'Escolher emoji'}
                                aria-haspopup="dialog"
                                aria-expanded={emojiOpen}
                            >
                                <span className={emoji ? '' : 'emoji-empty'}>{emoji || NOTE_EMOJI_PLACEHOLDER}</span>
                            </button>

                            {emojiOpen && (
                                <EmojiPicker
                                    groups={NOTE_EMOJI_GROUPS}
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
                            className="form-input"
                            ref={titleRef}
                            placeholder="Tópico"
                            value={title}
                            maxLength={100}
                            onChange={e => setTitle(e.target.value)}
                            required
                            autoComplete="off"
                        />
                    </div>

                    <textarea
                        className="form-input"
                        placeholder="Descrição (opcional)"
                        value={description}
                        maxLength={2000}
                        rows={5}
                        onChange={e => setDescription(e.target.value)}
                    />

                    <div className="note-date">
                        <span className="form-label">Data (opcional)</span>
                        <div className="note-date-row">
                            <DateField value={date} onChange={setDate} placeholder="Sem data" align="left" />
                            {date && (
                                <button type="button" className="note-date-clear" onClick={() => setDate('')}>
                                    Remover
                                </button>
                            )}
                        </div>
                        {date && <small className="note-date-hint">{countdown(date)}</small>}
                    </div>

                    {error && <p className="task-error">{error}</p>}
                </div>

                <div className={`task-actions ${confirmDelete ? 'is-confirming' : ''}`}>
                    {editing && (
                        <button
                            type="button"
                            className={`task-btn is-danger ${confirmDelete ? 'is-confirming' : ''}`}
                            onClick={handleDelete}
                            aria-label={confirmDelete ? 'Confirmar exclusão' : 'Excluir anotação'}
                            title="Excluir anotação"
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
                    <button type="submit" className="task-btn is-primary" disabled={saving || !title.trim()}>
                        {editing ? 'Salvar' : 'Adicionar'}
                    </button>
                </div>
            </form>
        </div>
    )
}
