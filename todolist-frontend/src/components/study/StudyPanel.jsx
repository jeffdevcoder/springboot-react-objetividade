import { useCallback, useEffect, useState } from 'react'
import { api } from '../../api'
import { formatDuration, fromIso, periodLabel, periodRange, shiftAnchor, toIso } from '../../study'
import DonutChart from '../finance/DonutChart'
import Pomodoro from './Pomodoro.jsx'
import SubjectModal from './SubjectModal.jsx'
import '../../styles/finance.css'
import '../../styles/study.css'
import Calendar from '../Calendar'
import MonthPicker from '../finance/MonthPicker'

const PERIODS = [
    ['day', 'Dia'],
    ['week', 'Semana'],
    ['month', 'Mês'],
]
const WEEKDAY = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function StudyPanel() {
    const [subjects, setSubjects] = useState([])
    const [sessions, setSessions] = useState([])
    const [period, setPeriod] = useState('week')
    const [anchor, setAnchor] = useState(() => toIso(new Date()))
    const [tick, setTick] = useState(0)
    const [modal, setModal] = useState({ open: false, subject: null })
    const [error, setError] = useState('')
    const [pickerOpen, setPickerOpen] = useState(false)
    const closePicker = useCallback(() => setPickerOpen(false), [])

    const { from, to } = periodRange(period, anchor)
    const todayIso = toIso(new Date())
    const isCurrent = todayIso >= from && todayIso <= to

    useEffect(() => {
        let ignore = false
        api('/study/subjects')
            .then(list => { if (!ignore) setSubjects(list) })
            .catch(err => { if (!ignore) setError(err.message) })
        return () => { ignore = true }
    }, [tick])

    useEffect(() => {
        let ignore = false
        api(`/study/sessions?from=${from}&to=${to}`)
            .then(list => { if (!ignore) { setSessions(list); setError('') } })
            .catch(err => { if (!ignore) setError(err.message) })
        return () => { ignore = true }
    }, [from, to, tick])

    const reload = () => setTick(n => n + 1)

    const byId = new Map()
    const byDay = new Map()
    const byDaySub = new Map()
    for (const s of sessions) {
        byId.set(s.subjectId, (byId.get(s.subjectId) ?? 0) + s.seconds)
        byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.seconds)

        const m = byDaySub.get(s.date) ?? new Map()
        m.set(s.subjectId, (m.get(s.subjectId) ?? 0) + s.seconds)
        byDaySub.set(s.date, m)
    }
    const colorOf = new Map(subjects.map(s => [s.id, s.color]))

    const segments = subjects
        .filter(s => byId.has(s.id))
        .map(s => ({ key: `s${s.id}`, label: s.name, emoji: s.emoji, color: s.color, value: byId.get(s.id) }))
        .sort((a, b) => b.value - a.value)
    const total = segments.reduce((sum, s) => sum + s.value, 0)

    const days = []
    for (let d = fromIso(from); toIso(d) <= to; d.setDate(d.getDate() + 1)) days.push(toIso(d))
    const maxDay = Math.max(...days.map(d => byDay.get(d) ?? 0), 1)

    return (
        <section className="dashboard-panel">
            <div className="panel-header">
            </div>

            <Pomodoro
                subjects={subjects}
                onSaved={reload}
                onManage={subject => setModal({ open: true, subject })}
            />

            <div className="panel-header study-metrics-head">
                <div>
                    <div className="panel-description day-nav">
                        <button
                            type="button"
                            className="day-btn"
                            aria-label="Período anterior"
                            onClick={() => setAnchor(a => shiftAnchor(period, a, -1))}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        <div className="month-anchor">
                            <button
                                type="button"
                                className={`date-chip ${isCurrent ? 'is-today' : ''}`}
                                onClick={() => setPickerOpen(o => !o)}
                                aria-haspopup="dialog"
                                aria-expanded={pickerOpen}
                            >
                                {periodLabel(period, anchor)}
                            </button>

                            {pickerOpen && period !== 'month' && (
                                <Calendar
                                    value={anchor}
                                    today={todayIso}
                                    onSelect={iso => {
                                        setAnchor(iso)
                                        setPickerOpen(false)
                                    }}
                                    onClose={closePicker}
                                />
                            )}

                            {pickerOpen && period === 'month' && (
                                <MonthPicker
                                    value={anchor.slice(0, 7)}
                                    current={todayIso.slice(0, 7)}
                                    onSelect={key => {
                                        setAnchor(`${key}-01`)
                                        setPickerOpen(false)
                                    }}
                                    onClose={closePicker}
                                />
                            )}
                        </div>

                        <button
                            type="button"
                            className="day-btn"
                            aria-label="Próximo período"
                            onClick={() => setAnchor(a => shiftAnchor(period, a, 1))}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div className="section-tabs study-periods" role="tablist" aria-label="Período">
                {PERIODS.map(([value, label]) => (
                    <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={period === value}
                        className={`section-tab ${period === value ? 'is-active' : ''}`}
                        onClick={() => {
                            setPeriod(value)
                            setPickerOpen(false)
                        }}

                    >
                        {label}
                    </button>
                ))}
            </div>

            {error && <p className="task-error">{error}</p>}

            <div className="fin-overview study-overview">
                <DonutChart
                    segments={segments}
                    centerLabel="Total"
                    centerValue={formatDuration(total)}
                    centerHint=""
                />

                <div className="fin-stats">
                    <div className="fin-stats-scroll">
                        {segments.map(s => (
                            <div key={s.key} className="fin-stat">
                                <span className="fin-stat-label">
                                    <span className="fin-dot" style={{ background: s.color }} />
                                    {s.emoji} {s.label}
                                </span>
                                <span className="fin-stat-value">{formatDuration(s.value)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="fin-stat fin-stat-total">
                        <span className="fin-stat-label">Total</span>
                        <span className="fin-stat-value">{formatDuration(total)}</span>
                    </div>
                </div>
            </div>

            {period !== 'day' && (
                <div className={`study-bars ${period === 'month' ? 'is-month' : ''}`}>
                    {days.map(d => {
                        const v = byDay.get(d) ?? 0
                        return (
                            <div
                                key={d}
                                className="study-bar-col"
                                title={`${d.split('-').reverse().slice(0, 2).join('/')} · ${formatDuration(v)}`}
                            >
                                <span className="study-bar-track">
                                    <span
                                        className="study-bar-stack"
                                        style={{ height: v ? `${Math.max((v / maxDay) * 100, 4)}%` : '0%' }}
                                    >
                                        {[...(byDaySub.get(d) ?? [])].map(([id, seconds]) => (
                                            <span
                                                key={id}
                                                className="study-bar-seg"
                                                style={{ flex: seconds, background: colorOf.get(id) ?? 'var(--color-primary)' }}
                                            />
                                        ))}
                                    </span>
                                </span>

                                <span className="study-bar-label">
                                    {period === 'week' ? WEEKDAY[fromIso(d).getDay()] : Number(d.slice(8))}
                                </span>
                            </div>
                        )
                    })}
                </div>
            )}

            <SubjectModal
                open={modal.open}
                subject={modal.subject}
                subjects={subjects}
                onClose={() => setModal(m => ({ ...m, open: false }))}
                onChanged={reload}
            />
        </section>
    )
}