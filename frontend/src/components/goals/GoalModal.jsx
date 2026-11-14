import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import { MAX_STEPS, deadlineLabel, progress } from '../../goals'
import DateField from '../DateField'

export default function GoalModal({ open, goal, onClose, onSaved, onDeleted }) {
    const editing = Boolean(goal)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [deadline, setDeadline] = useState('')
    const [steps, setSteps] = useState([])
    const [newStep, setNewStep] = useState('')
    const [dragKey, setDragKey] = useState(null)
    const stepKey = useRef(0)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [wasOpen, setWasOpen] = useState(false)
    const titleRef = useRef(null)

    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setTitle(goal?.title ?? '')
            setDescription(goal?.description ?? '')
            setDeadline(goal?.deadline ?? '')
            setSteps(goal?.steps?.map(st => ({ key: `s${st.id}`, id: st.id, title: st.title, done: st.done })) ?? [])
            setNewStep('')
            setDragKey(null)
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

    // arrastar subtópicos para mudar a ordem
    useEffect(() => {
        if (dragKey === null) return

        const onMove = e => {
            const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-step-key]')
            if (!el || el.dataset.stepKey === dragKey) return
            const over = el.dataset.stepKey
            setSteps(list => {
                const from = list.findIndex(x => x.key === dragKey)
                const to = list.findIndex(x => x.key === over)
                if (from < 0 || to < 0) return list
                const next = [...list]
                const [item] = next.splice(from, 1)
                next.splice(to, 0, item)
                return next
            })
        }
        const onUp = () => setDragKey(null)

        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
        window.addEventListener('pointercancel', onUp)
        return () => {
            window.removeEventListener('pointermove', onMove)
            window.removeEventListener('pointerup', onUp)
            window.removeEventListener('pointercancel', onUp)
        }
    }, [dragKey])

    function addStep() {
        if (steps.length >= MAX_STEPS) return
        const text = newStep.trim()
        if (!text) return
        setSteps(list => [...list, { key: `n${stepKey.current++}`, id: null, title: text, done: false }])
        setNewStep('')
    }

    const updateStep = (i, change) =>
        setSteps(list => list.map((x, idx) => (idx === i ? { ...x, ...change } : x)))

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
            const body = {
                title,
                description,
                deadline: deadline || null,
                steps: steps
                    .filter(st => st.title.trim())
                    .map(st => ({ id: st.id, title: st.title.trim(), done: st.done })),
            }
            const saved = editing
                ? await api(`/goals/${goal.id}`, { method: 'PUT', body })
                : await api('/goals', { method: 'POST', body })
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
            await api(`/goals/${goal.id}`, { method: 'DELETE' })
            onDeleted(goal.id)
            onClose()
        } catch (err) {
            setError(err.message)
        }
    }

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <form className="task-modal note-modal" onSubmit={handleSubmit} onMouseDown={e => e.stopPropagation()}>
                <h2>{editing ? 'Meta' : 'Nova meta'}</h2>

                <div className="task-modal-body">
                    <input
                        className="form-input"
                        ref={titleRef}
                        placeholder="Tópico (ex.: Ler 12 livros)"
                        value={title}
                        maxLength={100}
                        onChange={e => setTitle(e.target.value)}
                        required
                        autoComplete="off"
                    />

                    <textarea
                        className="form-input"
                        placeholder="Descrição (opcional)"
                        value={description}
                        maxLength={2000}
                        rows={5}
                        onChange={e => setDescription(e.target.value)}
                    />

                    <div className="note-date">
                        <span className="form-label">Conquistar até</span>
                        <div className="note-date-row">
                            <DateField value={deadline} onChange={setDeadline} placeholder="Escolha a data" align="left" />
                        </div>
                        {deadline && !goal?.achievedOn && (
                            <small className="note-date-hint">{deadlineLabel(deadline)}</small>
                        )}
                    </div>

                    <div className="task-subs-edit">
                        <span className="form-label">
                            Subtópicos ({steps.length}/{MAX_STEPS})
                            {steps.length > 0 && ` · ${progress(steps)}% concluído`}
                        </span>
                        {steps.length < MAX_STEPS && (
                            <input
                                className="form-input"
                                placeholder="Adicionar subtópico"
                                value={newStep}
                                maxLength={100}
                                autoComplete="off"
                                onChange={e => setNewStep(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        addStep()
                                    }
                                }}
                                onBlur={addStep}
                            />
                        )}

                        {steps.length > 0 && (
                            <div className="goal-steps-edit">
                                {steps.map((st, i) => (
                                    <div
                                        key={st.key}
                                        data-step-key={st.key}
                                        className={`task-sub task-sub-row ${st.done ? 'is-done' : ''} ${dragKey === st.key ? 'is-dragging' : ''}`}
                                    >
                                        <button
                                            type="button"
                                            className="task-sub-grip"
                                            aria-label="Arrastar subtópico"
                                            title="Arrastar"
                                            onPointerDown={e => {
                                                e.preventDefault()
                                                setDragKey(st.key)
                                            }}
                                        >
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                                <circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" />
                                                <circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" />
                                                <circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" />
                                            </svg>
                                        </button>

                                        <input
                                            className="task-check"
                                            type="checkbox"
                                            checked={st.done}
                                            onChange={() => updateStep(i, { done: !st.done })}
                                            aria-label={`Marcar "${st.title}" como feito`}
                                        />

                                        <input
                                            className="task-sub-input"
                                            value={st.title}
                                            maxLength={100}
                                            autoComplete="off"
                                            onChange={e => updateStep(i, { title: e.target.value })}
                                        />

                                        <button
                                            type="button"
                                            className="task-sub-del"
                                            aria-label="Remover subtópico"
                                            title="Remover subtópico"
                                            onClick={() => setSteps(list => list.filter((_, idx) => idx !== i))}
                                        >
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <path d="M3 6h18" />
                                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                <path d="M10 11v6M14 11v6" />
                                            </svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {error && <p className="task-error">{error}</p>}
                </div>

                <div className={`task-actions ${confirmDelete ? 'is-confirming' : ''}`}>
                    {editing && (
                        <button
                            type="button"
                            className={`task-btn is-danger ${confirmDelete ? 'is-confirming' : ''}`}
                            onClick={handleDelete}
                            aria-label={confirmDelete ? 'Confirmar exclusão' : 'Excluir meta'}
                            title="Excluir meta"
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
                    <button
                        type="submit"
                        className="task-btn is-primary"
                        disabled={saving || !title.trim() || !deadline}
                    >
                        {editing ? 'Salvar' : 'Adicionar'}
                    </button>
                </div>
            </form>
        </div>
    )
}
