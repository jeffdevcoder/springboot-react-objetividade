import { useEffect, useRef, useState } from 'react'
import EmojiPicker from './EmojiPicker'
import { TASK_EMOJI_GROUPS, TASK_EMOJI_PLACEHOLDER } from '../emojis'
import { api } from '../api'
import DateField from './DateField'

const OPTIONS = [
    ['ONCE', 'Uma vez'],
    ['DAILY', 'Diária'],
    ['WEEKDAYS', 'Dias da semana'],
    ['WEEKENDS', 'Fins de semana'],
    ['WEEKLY', 'Semanal'],
    ['MONTHLY', 'Mensal'],
    ['YEARLY', 'Anual'],
    ['CUSTOM', 'Personalizado']
]

const DAYS = [
    ['MONDAY', 'Seg'],
    ['TUESDAY', 'Ter'],
    ['WEDNESDAY', 'Qua'],
    ['THURSDAY', 'Qui'],
    ['FRIDAY', 'Sex'],
    ['SATURDAY', 'Sáb'],
    ['SUNDAY', 'Dom'],
]

const today = () => new Date().toLocaleDateString('en-CA')

export default function TaskModal({ open, task, defaultDate, canCheck = true, onClose, onSaved, onDeleted, onToggleSub }) {
    const editing = Boolean(task)
    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [emoji, setEmoji] = useState('')
    const [emojiOpen, setEmojiOpen] = useState(false)
    const [recurrence, setRecurrence] = useState('ONCE')
    const [startDate, setStartDate] = useState(today)
    const [endDate, setEndDate] = useState('')
    const [noEnd, setNoEnd] = useState(false)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [wasOpen, setWasOpen] = useState(false)
    const titleRef = useRef(null)
    const [urgent, setUrgent] = useState(false)
    const [weekdays, setWeekdays] = useState([])
    const [time, setTime] = useState('')
    const [subtasks, setSubtasks] = useState([])
    const [newSub, setNewSub] = useState('')
    const [dragKey, setDragKey] = useState(null)
    const subKey = useRef(0)

    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setTitle(task?.title ?? '')
            setDescription(task?.description ?? '')
            setEmoji(task?.emoji ?? '')
            setEmojiOpen(false)
            setRecurrence(task?.recurrence ?? 'ONCE')
            setStartDate(task?.startDate ?? defaultDate ?? today())
            setEndDate(task?.endDate ?? '')
            setNoEnd(task ? !task.endDate : false)
            setError('')
            setConfirmDelete(false)
            setUrgent(task?.urgent ?? false)
            setWeekdays(task?.weekdays ?? [])
            setTime(task?.time ? task.time.slice(0, 5) : '')
            setSubtasks(task?.subtasks?.map(s => ({ key: `s${s.id}`, id: s.id, title: s.title, done: s.done })) ?? [])
            setNewSub('')
        }
    }

    useEffect(() => {
        if (!open) return
        const timer = setTimeout(() => {
            if (!editing) titleRef.current?.focus()
        }, 80)
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
            const body = {
                title,
                description,
                emoji: emoji || null,
                recurrence,
                startDate,
                endDate: once || noEnd ? null : endDate,
                urgent,
                weekdays: custom ? weekdays : [],
                time: time || null,
                subtasks: subtasks.map(s => ({ id: s.id, title: s.title }))
            }
            const saved = editing
                ? await api(`/tasks/${task.id}`, { method: 'PUT', body })
                : await api('/tasks', { method: 'POST', body })
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
            await api(`/tasks/${task.id}`, { method: 'DELETE' })
            onDeleted(task.id)
            onClose()
        } catch (err) {
            setError(err.message)
        }
    }

    const once = recurrence === 'ONCE'
    const custom = recurrence === 'CUSTOM'

    const toggleDay = day =>
        setWeekdays(list => (list.includes(day) ? list.filter(d => d !== day) : [...list, day]))

    const invalid =
        !title.trim() || !startDate ||
        (!once && !noEnd && !endDate) ||
        (custom && weekdays.length === 0)

    function addSub() {
        if (subtasks.length >= 10) return
        const text = newSub.trim()
        if (!text) return
        setSubtasks(list => [...list, { key: `n${subKey.current++}`, id: null, title: text, done: false }])
        setNewSub('')
    }

    function toggleSub(i) {
        const s = subtasks[i]
        if (!s.id) return
        onToggleSub?.(task, s)
        setSubtasks(list => list.map((x, idx) => (idx === i ? { ...x, done: !x.done } : x)))
    }

    function editSub(i, title) {
        setSubtasks(list => list.map((x, idx) => (idx === i ? { ...x, title } : x)))
    }

    useEffect(() => {
        if (dragKey === null) return

        const onMove = e => {
            const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-sub-key]')
            if (!el || el.dataset.subKey === dragKey) return
            const over = el.dataset.subKey

            setSubtasks(list => {
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

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <form className="task-modal" onSubmit={handleSubmit} onMouseDown={e => e.stopPropagation()}>
                <h2>{editing ? 'Tarefa' : 'Nova tarefa'}</h2>

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
                                <span className={emoji ? '' : 'emoji-empty'}>{emoji || TASK_EMOJI_PLACEHOLDER}</span>
                            </button>

                            {emojiOpen && (
                                <EmojiPicker
                                    groups={TASK_EMOJI_GROUPS}
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
                            placeholder="Nome da tarefa"
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
                        maxLength={500}
                        rows={3}
                        onChange={e => setDescription(e.target.value)}
                    />

                    <div className="task-subs-edit">
                        <span className="form-label">Subtarefas ({subtasks.length}/10)</span>
                        {subtasks.length < 10 && (
                            <input
                                className="form-input"
                                placeholder="Adicionar subtarefa"
                                value={newSub}
                                maxLength={100}
                                autoComplete="off"
                                onChange={e => setNewSub(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        addSub()
                                    }
                                }}
                                onBlur={addSub}
                            />
                        )}

                        {subtasks.map((s, i) => (
                            <div
                                key={s.key}
                                data-sub-key={s.key}
                                className={`task-sub task-sub-row ${s.done ? 'is-done' : ''} ${dragKey === s.key ? 'is-dragging' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="task-sub-grip"
                                    aria-label="Arrastar subtarefa"
                                    title="Arrastar"
                                    onPointerDown={e => {
                                        e.preventDefault()
                                        setDragKey(s.key)
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
                                    checked={s.done}
                                    disabled={!s.id || !canCheck}
                                    onChange={() => toggleSub(i)}
                                    aria-label={`Marcar "${s.title}" como feita`}
                                />

                                <input
                                    className="task-sub-input"
                                    value={s.title}
                                    maxLength={100}
                                    autoComplete="off"
                                    onChange={e => editSub(i, e.target.value)}
                                />

                                <button
                                    type="button"
                                    className="task-sub-del"
                                    aria-label="Remover subtarefa"
                                    title="Remover subtarefa"
                                    onClick={() => setSubtasks(list => list.filter((_, idx) => idx !== i))}
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

                    <div className="task-dates">
                        <div>
                            <span className="form-label">{once ? 'Data' : 'Início'}</span>
                            <DateField
                                value={startDate}
                                onChange={iso => {
                                    setStartDate(iso)
                                    if (endDate && endDate < iso) setEndDate(iso)
                                }}
                            />
                        </div>

                        {!once && (
                            <div className="task-fade">
                                <span className="form-label">Fim</span>
                                <DateField
                                    value={endDate}
                                    min={startDate}
                                    disabled={noEnd}
                                    align="right"
                                    onChange={setEndDate}
                                />
                            </div>
                        )}
                </div>

                {!once && (
                    <label className="task-noend task-fade">
                        <input
                            type="checkbox"
                            checked={noEnd}
                            onChange={e => setNoEnd(e.target.checked)}
                            autoComplete="off"
                        />
                        <span>Sem data final</span>
                    </label>
                )}

                <div className="task-time">
                    <div className="task-time-head">
                        <label className="form-label" htmlFor="task-time">Horário (opcional)</label>
                        {time && (
                            <button
                                type="button"
                                className="task-clear"
                                onClick={() => setTime('')}
                                aria-label="Limpar horário"
                                title="Limpar horário"
                            >
                                −
                            </button>
                        )}
                    </div>
                    <input
                        id="task-time"
                        className="form-input"
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        autoComplete="off"
                    />
                </div>

                <div className="task-options" role="radiogroup" aria-label="Repetição">
                    {OPTIONS.map(([value, label]) => (
                        <label key={value}>
                            <input
                                type="radio"
                                name="recurrence"
                                value={value}
                                checked={recurrence === value}
                                onChange={() => setRecurrence(value)}
                                autoComplete="off"
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>

                {custom && (
                    <div className="task-options task-days task-fade" role="group" aria-label="Dias da semana">
                        {DAYS.map(([value, label]) => (
                            <label key={value}>
                                <input
                                    type="checkbox"
                                    checked={weekdays.includes(value)}
                                    onChange={() => toggleDay(value)}
                                    autoComplete="off"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>
                )}

                <label className="task-urgent">
                    <input
                        type="checkbox"
                        checked={urgent}
                        onChange={e => setUrgent(e.target.checked)}
                        autoComplete="off"
                    />
                    <span>🚨 É urgente?</span>
                </label>

                {error && <p className="task-error">{error}</p>}
                </div>

                <div className={`task-actions ${confirmDelete ? 'is-confirming' : ''}`}>
                    {editing && (
                        <button
                            type="button"
                            className={`task-btn is-danger ${confirmDelete ? 'is-confirming' : ''}`}
                            onClick={handleDelete}
                            aria-label={confirmDelete ? 'Confirmar exclusão' : 'Excluir tarefa'}
                            title="Excluir tarefa"
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
                    <button type="submit" className="task-btn is-primary" disabled={saving || invalid}>
                        {editing ? 'Salvar' : 'Adicionar'}
                    </button>
                </div>
            </form>
        </div>
    )
}