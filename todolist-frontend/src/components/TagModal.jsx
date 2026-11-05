import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { TAG_COLORS, tagHex } from '../tagColors'

function limitWords(text) {
    const clean = text.replace(/^\s+/, '')
    const words = clean.split(/\s+/).filter(Boolean)
    return words.length <= 4 ? clean : words.slice(0, 4).join(' ')
}

export default function TagModal({ open, task, onClose, onAssigned, onChanged }) {
    const [tags, setTags] = useState([])
    const [mode, setMode] = useState('list')
    const [editId, setEditId] = useState(null)
    const [name, setName] = useState('')
    const [color, setColor] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [wasOpen, setWasOpen] = useState(false)
    const inputRef = useRef(null)

    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setMode('list')
            setEditId(null)
            setName('')
            setColor('')
            setError('')
            setConfirmDelete(false)
        }
    }

    useEffect(() => {
        if (!open) return
        let ignore = false
        api('/tags')
            .then(list => { if (!ignore) setTags(list) })
            .catch(err => { if (!ignore) setError(err.message) })
        return () => { ignore = true }
    }, [open])

    useEffect(() => {
        if (!open) return
        const onKey = e => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [open, onClose])

    useEffect(() => {
        if (!open || mode !== 'create') return
        const timer = setTimeout(() => inputRef.current?.focus(), 80)
        return () => clearTimeout(timer)
    }, [open, mode])

    useEffect(() => {
        if (!confirmDelete) return
        const timer = setTimeout(() => setConfirmDelete(false), 4000)
        return () => clearTimeout(timer)
    }, [confirmDelete])

    const used = new Set(tags.filter(t => t.id !== editId).map(t => t.color))
    const freeColors = TAG_COLORS.filter(c => c.hex && !used.has(c.key))
    const editing = editId !== null

    async function assign(tagId, tag) {
        setError('')
        try {
            await api(`/tasks/${task.id}/tag`, { method: 'PATCH', body: { tagId } })
            onAssigned(task.id, tag)
            onClose()
        } catch (err) {
            setError(err.message)
        }
    }

    function startCreate() {
        setEditId(null)
        setName('')
        setColor(freeColors[0]?.key ?? '')
        setError('')
        setConfirmDelete(false)
        setMode('create')
    }

    function startEdit(tag) {
        setEditId(tag.id)
        setName(tag.name)
        setColor(tag.color)
        setError('')
        setConfirmDelete(false)
        setMode('create')
    }

    function backToList() {
        setMode('list')
        setEditId(null)
        setError('')
        setConfirmDelete(false)
    }

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')

        const clean = name.trim().replace(/\s+/g, ' ')
        if (tags.some(t => t.id !== editId && t.name.toLowerCase() === clean.toLowerCase())) {
            setError('Já existe uma tag com esse nome')
            return
        }

        setSaving(true)
        try {
            if (editing) {
                const updated = await api(`/tags/${editId}`, { method: 'PUT', body: { name: clean, color } })
                setTags(list => list.map(t => (t.id === updated.id ? updated : t)))
                onChanged?.()
                backToList()
            } else {
                const created = await api('/tags', { method: 'POST', body: { name: clean, color } })
                await api(`/tasks/${task.id}/tag`, { method: 'PATCH', body: { tagId: created.id } })
                onAssigned(task.id, created)
                onClose()
            }
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
            await api(`/tags/${editId}`, { method: 'DELETE' })
            setTags(list => list.filter(t => t.id !== editId))
            onChanged?.()
            backToList()
        } catch (err) {
            setError(err.message)
        }
    }

    const currentId = task?.tag?.id ?? null

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <div className="task-modal tag-modal" onMouseDown={e => e.stopPropagation()}>
                {mode === 'list' ? (
                    <>
                        <h2>Tags</h2>

                        <ul className="tag-list">
                            <li>
                                <button
                                    type="button"
                                    className={`tag-option ${currentId === null ? 'is-selected' : ''}`}
                                    onClick={() => assign(null, null)}
                                >
                                    <span className="tag-dot is-default" />
                                    <span className="tag-option-name">Sem tag</span>
                                </button>
                            </li>

                            {tags.map(tag => (
                                <li key={tag.id} className="tag-row">
                                    <button
                                        type="button"
                                        className={`tag-option ${currentId === tag.id ? 'is-selected' : ''}`}
                                        onClick={() => assign(tag.id, tag)}
                                    >
                                        <span className="tag-dot" style={{ background: tagHex(tag.color) }} />
                                        <span className="tag-option-name">{tag.name}</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="tag-edit"
                                        aria-label={`Editar ${tag.name}`}
                                        title="Editar tag"
                                        onClick={() => startEdit(tag)}
                                    >
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                        </svg>
                                    </button>
                                </li>
                            ))}
                        </ul>

                        {tags.length === 0 && <p className="tag-caption">Você ainda não criou nenhuma tag.</p>}
                        {error && <p className="task-error">{error}</p>}

                        <button
                            type="button"
                            className="task-btn is-primary"
                            disabled={freeColors.length === 0}
                            onClick={startCreate}
                        >
                            Adicionar
                        </button>
                        {freeColors.length === 0 && (
                            <p className="tag-caption">Todas as cores já estão em uso.</p>
                        )}
                    </>
                ) : (
                    <form className="tag-form" onSubmit={handleSubmit}>
                        <h2>{editing ? 'Editar tag' : 'Nova tag'}</h2>

                        <input
                            ref={inputRef}
                            className="form-input"
                            placeholder="Nome (até 4 palavras)"
                            value={name}
                            maxLength={40}
                            onChange={e => setName(limitWords(e.target.value))}
                            autoComplete="off"
                        />

                        <div className="tag-swatches" role="radiogroup" aria-label="Cor da tag">
                            {freeColors.map(c => (
                                <button
                                    key={c.key}
                                    type="button"
                                    role="radio"
                                    aria-checked={color === c.key}
                                    aria-label={c.name}
                                    title={c.name}
                                    className={`tag-swatch ${color === c.key ? 'is-selected' : ''}`}
                                    style={{ background: c.hex }}
                                    onClick={() => setColor(c.key)}
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
                                    aria-label={confirmDelete ? 'Confirmar exclusão' : 'Excluir tag'}
                                    title="Excluir tag"
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

                            <button type="button" className="task-btn" onClick={backToList}>
                                Voltar
                            </button>
                            <button
                                type="submit"
                                className="task-btn is-primary"
                                disabled={saving || !name.trim() || !color}
                            >
                                Salvar
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}