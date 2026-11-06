import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'

const KEY = 'pomodoro'
const MODES = ['focus', 'short', 'long']
const LABELS = { focus: 'Foco', short: 'Pausa curta', long: 'Pausa longa' }
const MIN_LABELS = { focus: 'Foco', short: 'Pausa', long: 'Longa' }

const SIZE = 220
const STROKE = 14
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

const today = () => new Date().toLocaleDateString('en-CA')

const initial = () => ({
    mode: 'focus',
    cycle: 0,
    running: false,
    endAt: 0,
    remainingMs: 25 * 60000,
    startDate: null,
    subjectId: null,
    mins: { focus: 25, short: 5, long: 15 },
})

function load() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY))
        return saved && saved.mins ? saved : initial()
    } catch {
        return initial()
    }
}

function clock(ms) {
    const s = Math.ceil(ms / 1000)
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export default function Pomodoro({ subjects, onSaved, onManage }) {
    const [t, setT] = useState(load)
    const [now, setNow] = useState(() => Date.now())
    const [settings, setSettings] = useState(false)
    const [error, setError] = useState('')
    const finishing = useRef(false)
    const audio = useRef(null)

    const subjectId = subjects.some(s => s.id === t.subjectId) ? t.subjectId : (subjects[0]?.id ?? null)
    const subject = subjects.find(s => s.id === subjectId)

    const total = t.mins[t.mode] * 60000
    const remaining = t.running ? Math.max(t.endAt - now, 0) : t.remainingMs
    const elapsed = Math.round((total - remaining) / 1000)
    const progress = total ? (total - remaining) / total : 0
    const done = t.running && remaining <= 0
    const locked = t.mode === 'focus' && (t.running || elapsed > 0)
    const text = clock(remaining)

    useEffect(() => {
        try { localStorage.setItem(KEY, JSON.stringify(t)) } catch { /* sem armazenamento */ }
    }, [t])

    useEffect(() => {
        if (!t.running) return
        const id = setInterval(() => setNow(Date.now()), 250)
        return () => clearInterval(id)
    }, [t.running])

    useEffect(() => {
        if (!t.running) return
        const old = document.title
        document.title = `${text} · ${LABELS[t.mode]}`
        return () => { document.title = old }
    }, [t.running, t.mode, text])

    useEffect(() => {
        if (!done || finishing.current) return
        finishing.current = true
        finish().finally(() => { finishing.current = false })
    }, [done])

    function unlockAudio() {
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext
            if (!audio.current) audio.current = new Ctx()
            if (audio.current.state === 'suspended') audio.current.resume()
        } catch { }
    }

    function chime() {
        const ctx = audio.current
        if (!ctx) return
        const t0 = ctx.currentTime
        ;[880, 1318.5].forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            const s = t0 + i * 0.18
            osc.type = 'sine'
            osc.frequency.value = freq
            gain.gain.setValueAtTime(0.0001, s)
            gain.gain.exponentialRampToValueAtTime(0.12, s + 0.02)
            gain.gain.exponentialRampToValueAtTime(0.0001, s + 1.2)
            osc.connect(gain).connect(ctx.destination)
            osc.start(s)
            osc.stop(s + 1.3)
        })
    }

    function elapsedNow() {
        const rem = t.running ? Math.max(t.endAt - Date.now(), 0) : t.remainingMs
        return Math.round((total - rem) / 1000)
    }

    async function save(seconds) {
        if (seconds < 1 || !subjectId) return true
        try {
            await api('/study/sessions', {
                method: 'POST',
                body: { subjectId, seconds, date: t.startDate ?? today() },
            })
            setError('')
            onSaved()
            return true
        } catch (err) {
            setError(err.message)
            return false
        }
    }

    async function goTo(mode, cycle = t.cycle) {
        if (t.mode === 'focus' && !(await save(elapsedNow()))) return
        setT(s => ({
            ...s,
            mode,
            cycle,
            running: false,
            remainingMs: s.mins[mode] * 60000,
            startDate: null,
        }))
    }

    useEffect(() => {
        if (!done || finishing.current) return
        finishing.current = true
        chime()
        finish().finally(() => { finishing.current = false })
    }, [done])

    async function finish() {
        if (t.mode === 'focus') {
            const cycle = t.cycle + 1
            await goTo(cycle % 4 === 0 ? 'long' : 'short', cycle)
        } else {
            await goTo('focus')
        }
    }

    function start() {
        unlockAudio()
        const n = Date.now()
        setNow(n)
        setT(s => ({
            ...s,
            running: true,
            endAt: n + s.remainingMs,
            startDate: s.mode === 'focus' && !s.startDate ? today() : s.startDate,
        }))
    }

    function pause() {
        setT(s => ({ ...s, running: false, remainingMs: Math.max(s.endAt - Date.now(), 0) }))
    }

    function setMin(key, value) {
        const v = Math.min(Math.max(parseInt(value, 10) || 1, 1), 180)
        setT(s => ({
            ...s,
            mins: { ...s.mins, [key]: v },
            remainingMs:
                s.mode === key && !s.running && s.remainingMs === s.mins[key] * 60000
                    ? v * 60000
                    : s.remainingMs,
        }))
    }

    const filled = t.mode === 'long' ? 4 : t.cycle % 4
    const ringColor = t.mode === 'focus' ? (subject?.color ?? 'var(--color-text)') : 'var(--color-muted)'

    return (
        <div className="study-timer">
            <div className="section-tabs" role="tablist" aria-label="Modo">
                {MODES.map(m => (
                    <button
                        key={m}
                        type="button"
                        role="tab"
                        aria-selected={t.mode === m}
                        className={`section-tab ${t.mode === m ? 'is-active' : ''}`}
                        onClick={() => m !== t.mode && goTo(m)}
                    >
                        {LABELS[m]}
                    </button>
                ))}
            </div>

            <div className="donut-wrap study-ring">
                <svg className="donut" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
                    <circle className="donut-track" cx={SIZE / 2} cy={SIZE / 2} r={R} strokeWidth={STROKE} />
                    <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
                        <circle
                            className="study-ring-fill"
                            cx={SIZE / 2}
                            cy={SIZE / 2}
                            r={R}
                            strokeWidth={STROKE}
                            strokeLinecap="round"
                            strokeDasharray={`${C * progress} ${C}`}
                            style={{ stroke: ringColor }}
                        />
                    </g>
                </svg>

                <div className="donut-center">
                    <span className="donut-label">{LABELS[t.mode]}</span>
                    <strong className="study-time">{text}</strong>
                    {t.mode === 'focus' && subject && (
                        <span className="donut-hint">{subject.emoji} {subject.name}</span>
                    )}
                </div>
            </div>

            <div className="study-dots" aria-hidden="true">
                {[0, 1, 2, 3].map(i => (
                    <span key={i} className={`study-dot ${i < filled ? 'is-filled' : ''}`} />
                ))}
            </div>

            <div className="study-controls">
                <button
                    type="button"
                    className="task-btn is-primary"
                    disabled={t.mode === 'focus' && !subjectId}
                    onClick={t.running ? pause : start}
                >
                    {t.running ? 'Pausar' : elapsed > 0 ? 'Continuar' : 'Iniciar'}
                </button>

                {(t.running || elapsed > 0) && (
                    <button type="button" className="task-btn" onClick={() => goTo('focus')}>
                        {t.mode === 'focus' ? 'Encerrar' : 'Pular'}
                    </button>
                )}

                <button
                    type="button"
                    className="day-btn"
                    aria-label="Ajustar tempos"
                    title="Ajustar tempos"
                    aria-expanded={settings}
                    onClick={() => setSettings(o => !o)}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" />
                        <line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" />
                        <line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" />
                        <line x1="17" y1="16" x2="23" y2="16" />
                    </svg>
                </button>
            </div>

            {settings && (
                <div className="study-mins task-fade">
                    {MODES.map(m => (
                        <label key={m}>
                            <span>{MIN_LABELS[m]} (min)</span>
                            <input
                                className="form-input"
                                inputMode="numeric"
                                autoComplete="off"
                                value={t.mins[m]}
                                disabled={t.running}
                                onChange={e => setMin(m, e.target.value.replace(/\D/g, ''))}
                            />
                        </label>
                    ))}
                </div>
            )}

            <div className="cat-chips study-subjects">
                {subjects.map(s => (
                    <div key={s.id} className="cat-item">
                        <button
                            type="button"
                            className={`cat-chip ${subjectId === s.id ? 'is-selected' : ''}`}
                            style={{ '--cat': s.color }}
                            disabled={locked}
                            onClick={() => setT(x => ({ ...x, subjectId: s.id }))}
                        >
                            <span className="cat-emoji">{s.emoji}</span>
                            <span className="cat-name">{s.name}</span>
                        </button>

                        <button
                            type="button"
                            className="cat-edit"
                            aria-label={`Editar ${s.name}`}
                            title="Editar matéria"
                            onClick={() => onManage(s)}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    className="cat-chip is-add study-add"
                    onClick={() => onManage(null)}
                    aria-label="Nova matéria"
                    title="Nova matéria"
                >
                    +
                </button>
            </div>

            {error && <p className="task-error">{error}</p>}
        </div>
    )
}