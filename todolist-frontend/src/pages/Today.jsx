import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'
import Logo from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'
import TaskModal from '../components/TaskModal'
import '../styles/auth.css'
import '../styles/tasks.css'
import Calendar from '../components/Calendar'
import TagModal from '../components/TagModal'
import { tagHex } from '../tagColors'
import FinancePanel from '../components/finance/FinancePanel.jsx'

const LABELS = {
    ONCE: 'Uma vez',
    DAILY: 'Diária',
    WEEKDAYS: 'Dias da semana',
    WEEKENDS: 'Fins de semana',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensal',
    YEARLY: 'Anual',
    CUSTOM: 'Personalizado',
}

const toIso = date => date.toLocaleDateString('en-CA')

function fromIso(iso) {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year, month - 1, day)
}

function addDays(iso, amount) {
    const date = fromIso(iso)
    date.setDate(date.getDate() + amount)
    return toIso(date)
}

const capitalize = text => text.charAt(0).toUpperCase() + text.slice(1)

function longLabel(iso) {
    return capitalize(
        fromIso(iso).toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        })
    )
}

function shortLabel(iso) {
    const date = fromIso(iso)
    const weekday = capitalize(date.toLocaleDateString('pt-BR', { weekday: 'long' }))
    const numeric = date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    })
    return `${weekday}, ${numeric}`
}

function lateByTime(task, now) {
    const [hour, minute] = task.time.split(':').map(Number)
    const late = now.getHours() * 60 + now.getMinutes() - (hour * 60 + minute)
    if (late <= 0) return null
    if (late < 60) return `Atrasada há ${late} min`

    const h = Math.floor(late / 60)
    const m = late % 60
    return m ? `Atrasada há ${h}h ${m}min` : `Atrasada há ${h}h`
}

function overdueLabel(task, now, viewedDate) {
    if (task.done) return null

    const today = toIso(now)

    // tarefas que se repetem: só ficam atrasadas no próprio dia
    if (task.recurrence !== 'ONCE') {
        if (viewedDate < today) return 'Tarefa não feita'
        if (viewedDate === today && task.time) return lateByTime(task, now)
        return null
    }

    // "uma vez": continua atrasada até ser feita
    if (task.dueDate < today) {
        const days = Math.round((fromIso(today) - fromIso(task.dueDate)) / 86400000)
        return `Atrasada há ${days} ${days === 1 ? 'dia' : 'dias'}`
    }
    if (task.dueDate === today && task.time) return lateByTime(task, now)
    return null
}

export default function Today() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [selectedDate, setSelectedDate] = useState(() => toIso(new Date()))
    const [tasks, setTasks] = useState([])
    const [modal, setModal] = useState({ open: false, task: null })
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [now, setNow] = useState(() => new Date())
    const [pickerOpen, setPickerOpen] = useState(false)
    const closePicker = useCallback(() => setPickerOpen(false), [])
    const [tagModal, setTagModal] = useState({ open: false, task: null })
    const closeTagModal = useCallback(() => setTagModal(m => ({ ...m, open: false })), [])

    const today = toIso(new Date())
    const isToday = selectedDate === today
    const isFuture = selectedDate > today
    const [section, setSection] = useState(() =>
        localStorage.getItem('section') === 'finance' ? 'finance' : 'tasks'
    )

    const closeModal = useCallback(() => setModal(m => ({ ...m, open: false })), [])

    function chooseSection(next) {
        setSection(next)
        try { localStorage.setItem('section', next) } catch { /* sem armazenamento */ }
    }

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60000)
        return () => clearInterval(id)
    }, [])

    useEffect(() => {
        let ignore = false
        api(`/tasks/day?date=${selectedDate}`)
            .then(list => { if (!ignore) setTasks(list) })
            .catch(err => { if (!ignore) setError(err.message) })
        return () => { ignore = true }
    }, [selectedDate])

    function pickDate(iso) {
        goTo(iso)
        setPickerOpen(false)
    }

    function goTo(iso) {
        setError('')
        setNotice('')
        setSelectedDate(iso)
    }

    function handleTagAssigned(taskId, tag) {
        setTasks(list => list.map(t => (t.id === taskId ? { ...t, tag } : t)))
    }

    async function toggle(task) {
        const done = !task.done
        const mark = value =>
            setTasks(list => list.map(t => (t.id === task.id ? { ...t, done: value } : t)))

        mark(done)
        try {
            await api(`/tasks/${task.id}/complete?date=${selectedDate}`, {
                method: done ? 'POST' : 'DELETE',
            })
        } catch (err) {
            mark(!done)
            setError(err.message)
        }
    }

    async function handleSaved(saved) {
        try {
            const list = await api(`/tasks/day?date=${selectedDate}`)
            setTasks(list)
            if (!list.some(t => t.id === saved.id)) {
                setNotice('Tarefa salva. Ela não cai neste dia, então só aparece nos dias em que acontece.')
                setTimeout(() => setNotice(''), 5000)
            }
        } catch (err) {
            setError(err.message)
        }
    }

    function handleDeleted(id) {
        setTasks(list => list.filter(t => t.id !== id))
    }

    async function handleLogout() {
        await logout()
        navigate('/login')
    }

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <a href="/today" className="brand">
                    <Logo />
                    <span>Objetividade</span>
                </a>

                <div className="user-area">
                    <span className="user-email">{user?.name}</span>
                    <ThemeToggle />
                    <button
                        className="logout-icon"
                        type="button"
                        onClick={handleLogout}
                        aria-label="Sair"
                        title="Sair"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                            <path d="M16 17l5-5-5-5" />
                            <path d="M21 12H9" />
                        </svg>
                    </button>
                </div>
            </header>

            <section className="dashboard-content">
                <div className="dashboard-heading">
                    <p className="dashboard-date">Seu espaço pessoal</p>

                    <h1 className="dashboard-title">
                        {section === 'finance'
                            ? 'Suas finanças.'
                            : isToday ? 'Checklist de hoje.' : 'Checklist do dia.'}
                    </h1>

                    <p className="dashboard-subtitle">
                        {section === 'finance'
                            ? 'Receitas, gastos e saldo do mês, num só lugar.'
                            : 'Um passo de cada vez. Organize o que importa e mantenha o foco no seu dia.'}
                    </p>
                </div>

                <div className="section-tabs" role="tablist" aria-label="Seção">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={section === 'tasks'}
                        className={`section-tab ${section === 'tasks' ? 'is-active' : ''}`}
                        onClick={() => chooseSection('tasks')}
                    >
                        Tarefas
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={section === 'finance'}
                        className={`section-tab ${section === 'finance' ? 'is-active' : ''}`}
                        onClick={() => chooseSection('finance')}
                    >
                        Finanças
                    </button>
                </div>

                {section === 'tasks' ? (
                <section className="dashboard-panel">
                    <div className="panel-header">
                        <div>
                            <h2 className="panel-title">Minhas tarefas</h2>

                            <div className="panel-description day-nav">
                                <button
                                    type="button"
                                    className="day-btn"
                                    aria-label="Dia anterior"
                                    onClick={() => goTo(addDays(selectedDate, -1))}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                         stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                         strokeLinejoin="round" aria-hidden="true">
                                        <path d="M15 18l-6-6 6-6" />
                                    </svg>
                                </button>

                                <button
                                    type="button"
                                    className={`date-chip ${isToday ? 'is-today' : ''}`}
                                    onClick={() => setPickerOpen(open => !open)}
                                    aria-haspopup="dialog"
                                    aria-expanded={pickerOpen}
                                    title="Escolher uma data"
                                >
                                    <span className="date-long">{longLabel(selectedDate)}</span>
                                    <span className="date-short">{shortLabel(selectedDate)}</span>
                                </button>

                                {pickerOpen && (
                                    <Calendar
                                        value={selectedDate}
                                        today={today}
                                        onSelect={pickDate}
                                        onClose={closePicker}
                                    />
                                )}

                                <button
                                    type="button"
                                    className="day-btn"
                                    aria-label="Próximo dia"
                                    onClick={() => goTo(addDays(selectedDate, 1))}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                         stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                                         strokeLinejoin="round" aria-hidden="true">
                                        <path d="M9 18l6-6-6-6" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <button
                            className="task-add"
                            type="button"
                            onClick={() => setModal({ open: true, task: null })}
                        >
                            + Nova tarefa
                        </button>
                    </div>

                    {error && <p className="task-error">{error}</p>}
                    {notice && <p className="panel-description">{notice}</p>}

                    {tasks.length > 0 ? (
                        <ul className="task-list">
                            {tasks.map(task => (
                                <li
                                    key={task.id}
                                    className={`task-item ${task.done ? 'is-done' : ''} ${overdueLabel(task, now, selectedDate) ? 'is-late' : ''}`}
                                >
                                    <input
                                        className="task-check"
                                        type="checkbox"
                                        checked={task.done}
                                        disabled={isFuture}
                                        onChange={() => toggle(task)}
                                        aria-label={`Marcar "${task.title}" como feita`}
                                    />

                                    <button
                                        className="task-body"
                                        type="button"
                                        onClick={() => setModal({ open: true, task })}
                                    >
        <span className="task-text">
            <span className="task-title">
                {task.urgent && (
                    <span className="task-flag" role="img" aria-label="Urgente">🚨</span>
                )}
                {task.title}
            </span>
            {overdueLabel(task, now, selectedDate) && (
                <small className="task-late">{overdueLabel(task, now, selectedDate)}</small>
            )}
            {task.description && (
                <small className="task-desc" title={task.description}>
                    {task.description}
                </small>
            )}
        </span>
                                    </button>

                                    <div className="task-meta" onClick={() => setModal({ open: true, task })}>
                                        {task.time && <span className="task-clock">{task.time.slice(0, 5)}</span>}
                                        <span className="task-tag">{LABELS[task.recurrence]}</span>

                                        <button
                                            type="button"
                                            className="tag-btn"
                                            title="Escolher tag"
                                            aria-label="Escolher tag"
                                            onClick={e => {
                                                e.stopPropagation()
                                                setTagModal({ open: true, task })
                                            }}
                                        >
    <span className={`tag-text ${task.tag ? '' : 'is-placeholder'}`}>
        {task.tag ? task.tag.name : 'Tag'}
    </span>
                                            <span
                                                className={`tag-dot ${task.tag ? '' : 'is-default'}`}
                                                style={task.tag ? { background: tagHex(task.tag.color) } : undefined}
                                            />
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon" aria-hidden="true">✓</div>

                            <h3 className="empty-title">Seu dia começa aqui</h3>

                            <p className="empty-description">
                                Este espaço está pronto para receber suas
                                tarefas e ajudar você a acompanhar o que
                                precisa ser feito.
                            </p>
                        </div>
                    )}
                </section>
                ) : (
                    <FinancePanel />
                )}
                <p className="dashboard-footer">
                    Feito para manter as coisas simples.
                </p>
            </section>

            <TaskModal
                open={modal.open}
                task={modal.task}
                defaultDate={isFuture ? selectedDate : today}
                onClose={closeModal}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
            />

            <TagModal
                open={tagModal.open}
                task={tagModal.task}
                onClose={closeTagModal}
                onAssigned={handleTagAssigned}
            />
        </main>
    )
}