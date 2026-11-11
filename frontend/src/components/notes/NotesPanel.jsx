import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { NOTE_EMOJI_GROUPS, NOTE_EMOJI_PLACEHOLDER } from '../../emojis'
import { countdown, daysUntil, formatDate } from '../../notes'
import EmojiPicker from '../EmojiPicker'
import NoteModal from './NoteModal'
import '../../styles/notes.css'

// mesma ordem do backend: com data (mais próxima primeiro), depois sem data
const sortNotes = list => [...list].sort((a, b) => {
    if (a.date && b.date) return a.date.localeCompare(b.date) || b.id - a.id
    if (a.date) return -1
    if (b.date) return 1
    return b.id - a.id
})

export default function NotesPanel() {
    const [notes, setNotes] = useState([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState('')
    const [modal, setModal] = useState({ open: false, note: null })
    const [emojiFor, setEmojiFor] = useState(null)
    const closeModal = useCallback(() => setModal(m => ({ ...m, open: false })), [])
    const closeEmoji = useCallback(() => setEmojiFor(null), [])

    useEffect(() => {
        let ignore = false
        api('/notes')
            .then(list => { if (!ignore) { setNotes(list); setError('') } })
            .catch(err => { if (!ignore) setError(err.message) })
            .finally(() => { if (!ignore) setLoaded(true) })
        return () => { ignore = true }
    }, [])

    function handleSaved(saved) {
        setNotes(list => sortNotes([...list.filter(n => n.id !== saved.id), saved]))
    }

    function handleDeleted(id) {
        setNotes(list => list.filter(n => n.id !== id))
    }

    async function saveEmoji(note, emoji) {
        const old = note.emoji
        const set = value => setNotes(list => list.map(n => (n.id === note.id ? { ...n, emoji: value } : n)))
        set(emoji)
        setEmojiFor(null)
        try {
            await api(`/notes/${note.id}/emoji`, { method: 'PATCH', body: { emoji } })
        } catch (err) {
            set(old)
            setError(err.message)
        }
    }

    return (
        <section className="dashboard-panel">
            <div className="panel-header">
                <div>
                    <h2 className="panel-title">Minhas anotações</h2>
                    <p className="panel-description">
                        {notes.length === 1 ? '1 anotação' : `${notes.length} anotações`}
                    </p>
                </div>

                <button
                    className="task-add"
                    type="button"
                    onClick={() => setModal({ open: true, note: null })}
                    aria-label="Nova anotação"
                >
                    <span className="task-add-icon">+</span>
                    <span className="task-add-text"> Nova anotação</span>
                </button>
            </div>

            {error && <p className="task-error">{error}</p>}

            {notes.length > 0 ? (
                <ul className="task-list note-list">
                    {notes.map(note => {
                        const days = note.date ? daysUntil(note.date) : null
                        const state = days === null ? '' : days < 0 ? 'is-past' : days <= 3 ? 'is-soon' : ''
                        return (
                            <li key={note.id} className={`task-item note-item ${state}`}>
                                <div className="task-emoji-anchor">
                                    <button
                                        type="button"
                                        className="task-emoji"
                                        aria-label={note.emoji ? 'Trocar emoji' : 'Escolher emoji'}
                                        title={note.emoji ? 'Trocar emoji' : 'Escolher emoji'}
                                        aria-haspopup="dialog"
                                        aria-expanded={emojiFor === note.id}
                                        onClick={() => setEmojiFor(id => (id === note.id ? null : note.id))}
                                    >
                                        <span className={note.emoji ? '' : 'emoji-empty'}>
                                            {note.emoji || NOTE_EMOJI_PLACEHOLDER}
                                        </span>
                                    </button>

                                    {emojiFor === note.id && (
                                        <EmojiPicker
                                            groups={NOTE_EMOJI_GROUPS}
                                            value={note.emoji}
                                            onSave={e => saveEmoji(note, e)}
                                            onClose={closeEmoji}
                                        />
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="task-body"
                                    onClick={() => setModal({ open: true, note })}
                                >
                                    <span className="task-text">
                                        <span className="task-title">{note.title}</span>
                                        {note.description && (
                                            <small className="task-desc note-desc">{note.description}</small>
                                        )}
                                    </span>
                                </button>

                                {note.date && (
                                    <button
                                        type="button"
                                        className="note-when"
                                        title={formatDate(note.date)}
                                        onClick={() => setModal({ open: true, note })}
                                    >
                                        <span className="note-count">{countdown(note.date)}</span>
                                        <span className="note-day">{formatDate(note.date)}</span>
                                    </button>
                                )}
                            </li>
                        )
                    })}
                </ul>
            ) : (
                loaded && !error && (
                    <p className="note-empty">Nenhuma anotação ainda. Que tal começar com “+ Nova anotação”?</p>
                )
            )}

            <NoteModal
                open={modal.open}
                note={modal.note}
                onClose={closeModal}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
            />
        </section>
    )
}
