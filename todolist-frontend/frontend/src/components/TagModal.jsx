import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { TAG_COLORS, tagHex } from '../tagColors'

function limitWords(text) {
    const clean = text.replace(/^\s+/, '')
    const words = clean.split(/\s+/).filter(Boolean)
    return words.length <= 4 ? clean : words.slice(0, 4).join(' ')
}

export default function TagModal({ open, task, onClose, onAssigned }) {
    const [tags, setTags] = useState([])
    const [mode, setMode] = useState('list')
    const [name, setName] = useState('')
    const [color, setColor] = useState('')
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [wasOpen, setWasOpen] = useState(false)
    const inputRef = useRef(null)

    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setMode('list')
            setName('')
            setColor('')
            setError('')
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

    const used = new Set(tags.map(t => t.color))
    const freeColors = TAG_COLORS.filter(c => c.hex && !used.has(c.key))

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
        setName('')
        setColor(freeColors[0]?.key ?? '')
        setError('')
        setMode('create')
    }

    async function handleCreate(e) {
        e.preventDefault()
        setError('')

        const clean = name.trim().replace(/\s+/g, ' ')
        if (tags.some(t => t.name.toLowerCase() === clean.toLowerCase())) {
            setError('Já existe uma tag com esse nome')
            return
        }

        setSaving(true)
        try {
            const created = await api('/tags', { method: 'POST', body: { name: clean, color } })
            await api(`/tasks/${task.id}/tag`, { method: 'PATCH', body: { tagId: created.id } })
            onAssigned(task.id, created)
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const currentId = task?.tag?.id ?? null
    const selectedColor = TAG_COLORS.find(c => c.key === color)

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
                                <li key={tag.id}>
                                    <button
                                        type="button"
                                        className={`tag-option ${currentId === tag.id ? 'is-selected' : ''}`}
                                        onClick={() => assign(tag.id, tag)}
                                    >
                                        <span className="tag-dot" style={{ background: tagHex(tag.color) }} />
                                        <span className="tag-option-name">{tag.name}</span>
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
                    <form className="tag-form" onSubmit={handleCreate}>
                        <h2>Nova tag</h2>

                        <input
                            ref={inputRef}
                            className="form-input"
                            placeholder="Nome (até 4 palavras)"
                            value={name}
                            maxLength={40}
                            onChange={e => setName(limitWords(e.target.value))}
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
                        <p className="tag-caption">{selectedColor?.name}</p>

                        {error && <p className="task-error">{error}</p>}

                        <div className="task-actions">
                            <button type="button" className="task-btn" onClick={() => setMode('list')}>
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