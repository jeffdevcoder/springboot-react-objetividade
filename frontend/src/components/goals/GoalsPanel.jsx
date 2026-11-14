import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { daysUntil } from '../../notes'
import { deadlineLabel, formatDate, progress, sortGoals } from '../../goals'
import GoalModal from './GoalModal'
import '../../styles/notes.css'
import '../../styles/goals.css'

export default function GoalsPanel() {
    const [goals, setGoals] = useState([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState('')
    const [modal, setModal] = useState({ open: false, goal: null })
    const [openSteps, setOpenSteps] = useState(() => new Set())
    const closeModal = useCallback(() => setModal(m => ({ ...m, open: false })), [])

    useEffect(() => {
        let ignore = false
        api('/goals')
            .then(list => { if (!ignore) { setGoals(list); setError('') } })
            .catch(err => { if (!ignore) setError(err.message) })
            .finally(() => { if (!ignore) setLoaded(true) })
        return () => { ignore = true }
    }, [])

    const replace = saved => setGoals(list => sortGoals([...list.filter(g => g.id !== saved.id), saved]))

    async function toggle(goal) {
        const achieved = !goal.achievedOn
        // mostra na hora; o backend devolve a data oficial da conquista
        replace({ ...goal, achievedOn: achieved ? new Date().toLocaleDateString('sv') : null })
        try {
            replace(await api(`/goals/${goal.id}/achieved`, { method: 'PATCH', body: { achieved } }))
        } catch (err) {
            replace(goal)
            setError(err.message)
        }
    }

    function toggleOpen(id) {
        setOpenSteps(set => {
            const next = new Set(set)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    async function toggleStep(goal, step) {
        const mark = done => setGoals(list => list.map(g => g.id === goal.id
            ? { ...g, steps: g.steps.map(st => (st.id === step.id ? { ...st, done } : st)) }
            : g))
        mark(!step.done)
        try {
            await api(`/goals/${goal.id}/steps/${step.id}`, { method: 'PATCH', body: { done: !step.done } })
        } catch (err) {
            mark(step.done)
            setError(err.message)
        }
    }

    const done = goals.filter(g => g.achievedOn).length

    return (
        <section className="dashboard-panel">
            <div className="panel-header">
                <div>
                    <h2 className="panel-title">Minhas metas</h2>
                    <p className="panel-description">
                        {goals.length === 1 ? '1 meta' : `${goals.length} metas`}
                        {done > 0 && ` · ${done === 1 ? '1 conquistada' : `${done} conquistadas`}`}
                    </p>
                </div>

                <button
                    className="task-add"
                    type="button"
                    onClick={() => setModal({ open: true, goal: null })}
                    aria-label="Nova meta"
                >
                    <span className="task-add-icon">+</span>
                    <span className="task-add-text"> Nova meta</span>
                </button>
            </div>

            {error && <p className="task-error">{error}</p>}

            {goals.length > 0 ? (
                <ul className="task-list note-list goal-list">
                    {goals.map(goal => {
                        const achieved = Boolean(goal.achievedOn)
                        const days = daysUntil(goal.deadline)
                        const state = achieved ? 'is-done' : days < 0 ? 'is-late' : days <= 7 ? 'is-soon' : ''
                        return (
                            <li key={goal.id} className={`task-item note-item goal-item ${state}`}>
                                <input
                                    className="task-check"
                                    type="checkbox"
                                    checked={achieved}
                                    onChange={() => toggle(goal)}
                                    aria-label={achieved
                                        ? `Desmarcar "${goal.title}" como conquistada`
                                        : `Marcar "${goal.title}" como conquistada`}
                                />

                                <button
                                    type="button"
                                    className="task-body"
                                    onClick={() => setModal({ open: true, goal })}
                                >
                                    <span className="task-text">
                                        <span className="task-title">{goal.title}</span>
                                        {goal.description && (
                                            <small className="task-desc note-desc">{goal.description}</small>
                                        )}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    className="note-when"
                                    title={`Conquistar até ${formatDate(goal.deadline)}`}
                                    onClick={() => setModal({ open: true, goal })}
                                >
                                    <span className="note-count">
                                        {achieved ? 'Conquistada 🎉' : deadlineLabel(goal.deadline)}
                                    </span>
                                    <span className="note-day">
                                        {achieved ? `em ${formatDate(goal.achievedOn)}` : `até ${formatDate(goal.deadline)}`}
                                    </span>
                                </button>

                                {goal.steps?.length > 0 && (() => {
                                    const pct = progress(goal.steps)
                                    const expanded = openSteps.has(goal.id)
                                    return (
                                        <>
                                            <button
                                                type="button"
                                                className={`task-progress goal-progress ${pct === 100 ? 'is-complete' : ''}`}
                                                onClick={() => toggleOpen(goal.id)}
                                                aria-expanded={expanded}
                                                title={expanded ? 'Esconder subtópicos' : 'Mostrar subtópicos'}
                                            >
                                                <span className="task-bar">
                                                    <span className="task-bar-fill" style={{ width: `${pct}%` }} />
                                                </span>
                                                <span className="task-progress-text">
                                                    {pct}% · {goal.steps.filter(st => st.done).length}/{goal.steps.length}
                                                </span>
                                                <svg className="goal-chevron" width="14" height="14" viewBox="0 0 24 24"
                                                     fill="none" stroke="currentColor" strokeWidth="2"
                                                     strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                    <path d="M6 9l6 6 6-6" />
                                                </svg>
                                            </button>

                                            {expanded && (
                                                <ul className="task-subs goal-steps">
                                                    {goal.steps.map(st => (
                                                        <li key={st.id} className={`task-sub ${st.done ? 'is-done' : ''}`}>
                                                            <input
                                                                className="task-check"
                                                                type="checkbox"
                                                                checked={st.done}
                                                                onChange={() => toggleStep(goal, st)}
                                                                aria-label={`Marcar "${st.title}" como feito`}
                                                            />
                                                            <span>{st.title}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </>
                                    )
                                })()}
                            </li>
                        )
                    })}
                </ul>
            ) : (
                loaded && !error && (
                    <p className="note-empty">Nenhuma meta ainda. Que tal definir a primeira com “+ Nova meta”?</p>
                )
            )}

            <GoalModal
                open={modal.open}
                goal={modal.goal}
                onClose={closeModal}
                onSaved={replace}
                onDeleted={id => setGoals(list => list.filter(g => g.id !== id))}
            />
        </section>
    )
}
