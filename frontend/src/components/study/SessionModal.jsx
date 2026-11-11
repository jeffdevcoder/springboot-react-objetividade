import { useEffect, useState } from 'react'
import { api } from '../../api'
import { formatDuration } from '../../study'

export default function SessionModal({ session, subject, onClose, onSaved }) {
    const open = Boolean(session)
    const [editing, setEditing] = useState(false)
    const [text, setText] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [shownId, setShownId] = useState(null)

    // cada vez que abre uma sessão diferente, volta ao modo leitura
    const id = session?.id ?? null
    if (id !== shownId) {
        setShownId(id)
        setEditing(false)
        setError('')
    }

    useEffect(() => {
        if (!open) return
        const onKey = e => {
            if (e.key !== 'Escape') return
            if (editing) setEditing(false)
            else onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, editing, onClose])

    function startEdit() {
        setText(session.description ?? '')
        setError('')
        setEditing(true)
    }

    async function save(e) {
        e.preventDefault()
        setSaving(true)
        try {
            const updated = await api(`/study/sessions/${session.id}/description`, {
                method: 'PATCH',
                body: { description: text.trim() || null },
            })
            onSaved(updated)
            setEditing(false)
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const unchanged = text.trim() === (session?.description ?? '')

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <form
                className="task-modal"
                role="dialog"
                aria-modal="true"
                onSubmit={save}
                onMouseDown={e => e.stopPropagation()}
            >
                {session && (
                    <>
                        <h2>{subject ? `${subject.emoji} ${subject.name}` : 'Matéria removida'}</h2>
                        <p className="study-session-meta">
                            {session.date.split('-').reverse().join('/')} · {formatDuration(session.seconds)}
                        </p>

                        {editing ? (
                            <input
                                className="form-input"
                                placeholder="Descrição"
                                maxLength={120}
                                autoComplete="off"
                                autoFocus
                                value={text}
                                onChange={e => setText(e.target.value)}
                            />
                        ) : (
                            <p className={`study-session-full ${session.description ? '' : 'is-empty'}`}>
                                {session.description || 'Sem descrição'}
                            </p>
                        )}

                        {error && <p className="task-error">{error}</p>}

                        <div className="task-actions">
                            {editing ? (
                                <>
                                    <button type="button" className="task-btn" onClick={() => setEditing(false)}>
                                        Cancelar
                                    </button>
                                    <button type="submit" className="task-btn is-primary" disabled={saving || unchanged}>
                                        Salvar
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button type="button" className="task-btn" onClick={startEdit}>
                                        {session.description ? 'Editar descrição' : 'Adicionar descrição'}
                                    </button>
                                    <button type="button" className="task-btn is-primary" onClick={onClose}>
                                        Fechar
                                    </button>
                                </>
                            )}
                        </div>
                    </>
                )}
            </form>
        </div>
    )
}
