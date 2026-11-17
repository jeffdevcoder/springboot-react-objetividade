import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../AuthContext'
import AccountModal from '../components/AccountModal'
import Avatar from '../components/Avatar'
import Logo from '../components/Logo'
import UserMenu from '../components/UserMenu'
import { formatMoney } from '../finance'
import { formatDuration } from '../study'
import { deadlineLabel } from '../goals'
import { tagHex } from '../tagColors'
import { countdown, formatDate } from '../notes'
import '../styles/auth.css'
import '../styles/tasks.css'
import '../styles/finance.css'
import '../styles/profile.css'

const PERIODS = [
    { key: 'week', label: 'Semana', question: 'O que você fez nesta semana?', noun: 'nesta semana' },
    { key: 'month', label: 'Mês', question: 'O que você fez neste mês?', noun: 'neste mês' },
    { key: 'year', label: 'Ano', question: 'O que você fez neste ano?', noun: 'neste ano' },
]

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const pct = (part, total) => (total ? Math.round((part * 100) / total) : 0)
const parseIso = iso => new Date(`${iso}T00:00:00`)
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`

export default function Profile() {
    const { user } = useAuth()
    const [period, setPeriod] = useState('week')
    // resultado da última busca: { period, stats } ou { period, error }
    const [result, setResult] = useState(null)
    const [editing, setEditing] = useState(false)

    useEffect(() => {
        let ignore = false
        api(`/profile/stats?period=${period}`)
            .then(stats => { if (!ignore) setResult({ period, stats }) })
            .catch(err => {
                if (!ignore) setResult({ period, error: err.message || 'Não foi possível carregar as estatísticas.' })
            })
        return () => { ignore = true }
    }, [period])

    const current = PERIODS.find(p => p.key === period)
    const loading = result?.period !== period
    const stats = result?.stats
    const showTabs = stats && !stats.empty

    return (
        <main className="dashboard">
            <header className="dashboard-header">
                <Link to="/home" className="brand">
                    <Logo />
                    <span>Objetividade</span>
                </Link>

                <div className="user-area">
                    <UserMenu />
                </div>
            </header>

            <section className="dashboard-content profile-page">
                <div className="dashboard-heading">
                    <Link to="/home" className="profile-back">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                        Voltar ao painel
                    </Link>

                    <div className="profile-head">
                        <Avatar user={user} className="user-avatar profile-avatar" />
                        <div className="profile-id">
                            <div className="profile-name">
                                <h1 className="dashboard-title">{user?.name}</h1>
                                <button
                                    type="button"
                                    className="profile-edit"
                                    onClick={() => setEditing(true)}
                                    aria-label="Editar conta"
                                    title="Editar conta"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M12 20h9" />
                                        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                                    </svg>
                                </button>
                            </div>
                            <span>{user?.email}</span>
                        </div>
                    </div>
                </div>

                <div className={`profile-toolbar ${showTabs ? '' : 'is-hidden'}`}>
                    <h2 className="profile-question">{current.question}</h2>

                    <div className="section-tabs profile-tabs" role="tablist" aria-label="Período">
                        {PERIODS.map(p => (
                            <button
                                key={p.key}
                                type="button"
                                role="tab"
                                aria-selected={period === p.key}
                                className={`section-tab ${period === p.key ? 'is-active' : ''}`}
                                onClick={() => setPeriod(p.key)}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className={`profile-body ${loading && stats ? 'is-refreshing' : ''}`}>
                    {result?.error ? (
                        <p className="auth-error" role="alert">{result.error}</p>
                    ) : !stats ? (
                        <div className="profile-grid">
                            <div className="dashboard-panel profile-skeleton" />
                            <div className="dashboard-panel profile-skeleton" />
                        </div>
                    ) : stats.empty ? (
                        <div className="dashboard-panel profile-empty">
                            <span aria-hidden="true">🌱</span>
                            <strong>Você ainda não adicionou nada.</strong>
                            <p>Crie tarefas, registre gastos, estude, anote ou defina metas: suas estatísticas aparecem aqui.</p>
                            <Link to="/home" className="task-btn is-primary profile-empty-cta">Ir para o painel</Link>
                        </div>
                    ) : (
                        <div className="profile-grid" key={stats.period}>
                            {stats.tasks && <TasksCard data={stats.tasks} noun={current.noun} />}
                            {stats.finance && <FinanceCard data={stats.finance} noun={current.noun} />}
                            {stats.study && <StudyCard data={stats.study} noun={current.noun} period={stats.period} />}
                            {stats.goals && <GoalsCard data={stats.goals} noun={current.noun} />}
                            {stats.notes && <NotesCard data={stats.notes} noun={current.noun} />}
                        </div>
                    )}
                </div>

                <p className="dashboard-footer">
                    Feito para manter as coisas simples.
                </p>
            </section>

            <AccountModal open={editing} onClose={() => setEditing(false)} />
        </main>
    )
}

/* ---------- blocos comuns ---------- */

function Card({ icon, title, wide, children }) {
    return (
        <article className={`dashboard-panel profile-card ${wide ? 'is-wide' : ''}`}>
            <h3 className="profile-card-title">
                <span aria-hidden="true">{icon}</span>
                {title}
            </h3>
            {children}
        </article>
    )
}

function Empty({ children }) {
    return <p className="profile-muted">{children}</p>
}

function Ring({ percent, label }) {
    const r = 34
    const c = 2 * Math.PI * r
    return (
        <div className="profile-ring" role="img" aria-label={`${percent}% ${label}`}>
            <svg viewBox="0 0 80 80" aria-hidden="true">
                <circle className="profile-ring-track" cx="40" cy="40" r={r} />
                <circle
                    className="profile-ring-value"
                    cx="40" cy="40" r={r}
                    strokeDasharray={c}
                    style={{ '--ring-offset': c * (1 - percent / 100), '--ring-full': c }}
                />
            </svg>
            <span>{percent}%</span>
        </div>
    )
}

function Progress({ value, label, detail }) {
    return (
        <div className="profile-progress">
            <div className="profile-progress-top">
                <span>{label}</span>
                <strong>{detail}</strong>
            </div>
            <div className="profile-progress-track">
                <div className="profile-progress-fill" style={{ width: `${value}%` }} />
            </div>
        </div>
    )
}

function Stat({ value, label, tone }) {
    return (
        <div className={`profile-stat ${tone ? `is-${tone}` : ''}`}>
            <strong>{value}</strong>
            <span>{label}</span>
        </div>
    )
}

// barras por dia: height = valor do dia em relação ao maior; fill = parte "feita"
// no ano, os dias viram 12 barras (uma por mês), somando os campos numéricos
function byMonth(days) {
    const months = []
    for (const d of days) {
        const m = parseIso(d.date).getMonth()
        const acc = months[m] ??= { date: d.date, future: true }
        acc.future &&= d.future
        for (const [k, v] of Object.entries(d)) {
            if (typeof v === 'number') acc[k] = (acc[k] ?? 0) + v
        }
    }
    return months.filter(Boolean)
}

function DayBars({ days, period, value, fill, tip }) {
    const year = period === 'year'
    const month = period === 'month'
    const bars = year ? byMonth(days) : days
    const max = Math.max(1, ...bars.map(value))
    return (
        <div className={`profile-bars ${month ? 'is-month' : ''}`}>
            {bars.map((d, i) => {
                const date = parseIso(d.date)
                const label = year ? MONTHS[date.getMonth()] : month ? date.getDate() : WEEKDAYS[date.getDay()]
                const showLabel = !month || i === 0 || (i + 1) % 5 === 0 || i === bars.length - 1
                const day = year
                    ? date.toLocaleDateString('pt-BR', { month: 'long' })
                    : date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                return (
                    <div key={d.date} className={`profile-bar ${d.future ? 'is-future' : ''}`}
                         title={`${day}: ${d.future ? 'ainda não chegou' : tip(d)}`}>
                        <div className="profile-bar-track">
                            <div
                                className="profile-bar-value"
                                style={{ height: `${(value(d) / max) * 100}%`, animationDelay: `${i * 20}ms` }}
                            >
                                <div className="profile-bar-fill" style={{ height: `${fill(d)}%` }} />
                            </div>
                        </div>
                        <span className="profile-bar-label">{showLabel ? label : ''}</span>
                    </div>
                )
            })}
        </div>
    )
}

// lista com barra horizontal proporcional (categorias, matérias)
function ShareList({ items, total, format }) {
    return (
        <ul className="profile-shares">
            {items.slice(0, 5).map(it => (
                <li key={it.name}>
                    <div className="profile-share-top">
                        <span className="profile-item-title">
                            <span aria-hidden="true">{it.emoji} </span>{it.name}
                        </span>
                        <strong>{format(it)}</strong>
                        <em>{pct(it.value, total)}%</em>
                    </div>
                    <div className="profile-progress-track">
                        <div className="profile-progress-fill"
                             style={{ width: `${pct(it.value, total)}%`, background: it.color }} />
                    </div>
                </li>
            ))}
        </ul>
    )
}

/* ---------- tarefas ---------- */

function TasksCard({ data, noun }) {
    if (data.planned === 0) {
        return (
            <Card icon="✅" title="Tarefas" wide>
                <Empty>Nada programado {noun} até agora.</Empty>
            </Card>
        )
    }

    const donePct = pct(data.done, data.planned)
    return (
        <Card icon="✅" title="Tarefas" wide>
            <div className="profile-tasks">
                <div className="profile-summary">
                    <Ring percent={donePct} label="feito" />
                    <ul className="profile-legend">
                        <li>
                            <span className="profile-dot is-done" />
                            Feito
                            <strong>{data.done}</strong>
                            <em>{donePct}%</em>
                        </li>
                        <li>
                            <span className="profile-dot is-missed" />
                            Não feito
                            <strong>{data.missed}</strong>
                            <em>{100 - donePct}%</em>
                        </li>
                        <li className="profile-legend-total">
                            Programado <strong>{data.planned}</strong>
                        </li>
                    </ul>
                </div>

                <DayBars
                    days={data.days}
                    period={data.period}
                    value={d => d.planned}
                    fill={d => pct(d.done, d.planned)}
                    tip={d => (d.planned ? `${d.done} de ${d.planned} feitas` : 'nada programado')}
                />
            </div>

            <TagList tags={data.tags} />
        </Card>
    )
}

// feito / não feito por tag: barra na cor da tag mostra a parte feita
function TagList({ tags }) {
    return (
        <ul className="profile-shares">
            {tags.map(t => {
                const total = t.done + t.missed
                const color = tagHex(t.color) ?? 'var(--color-muted)'
                return (
                    <li key={t.id ?? 'none'}>
                        <div className="profile-share-top">
                            <span className="profile-dot" style={{ background: color }} />
                            <span className="profile-item-title">{t.name}</span>
                            <strong>{t.done} de {total}</strong>
                            <em>{pct(t.done, total)}%</em>
                        </div>
                        <div className="profile-progress-track">
                            <div className="profile-progress-fill"
                                 style={{ width: `${pct(t.done, total)}%`, background: color }} />
                        </div>
                    </li>
                )
            })}
        </ul>
    )
}

/* ---------- finanças ---------- */

function FinanceCard({ data, noun }) {
    if (data.count === 0) {
        return (
            <Card icon="💰" title="Finanças">
                <Empty>Nenhum lançamento {noun}.</Empty>
            </Card>
        )
    }

    const tone = data.balanceCents > 0 ? 'positive' : data.balanceCents < 0 ? 'negative' : ''
    return (
        <Card icon="💰" title="Finanças">
            <div className="profile-stats-row">
                <Stat value={formatMoney(data.incomeCents)} label="Receitas" tone="positive" />
                <Stat value={formatMoney(data.expenseCents)} label="Gastos" tone="negative" />
                <Stat value={formatMoney(data.balanceCents)} label="Saldo" tone={tone} />
            </div>

            {data.bills > 0 && (
                <Progress
                    value={pct(data.billsPaid, data.bills)}
                    label="Contas pagas"
                    detail={`${data.billsPaid} de ${data.bills} · ${pct(data.billsPaid, data.bills)}%`}
                />
            )}

            {data.expenses.length > 0 && (
                <>
                    <h4 className="profile-subtitle">Para onde foi o dinheiro</h4>
                    <ShareList
                        items={data.expenses.map(c => ({ ...c, value: c.cents }))}
                        total={data.expenseCents}
                        format={c => formatMoney(c.cents)}
                    />
                </>
            )}
        </Card>
    )
}

/* ---------- estudos ---------- */

function StudyCard({ data, noun, period }) {
    if (data.seconds === 0) {
        return (
            <Card icon="📚" title="Estudos">
                <Empty>Nenhuma sessão de estudo {noun}.</Empty>
            </Card>
        )
    }

    return (
        <Card icon="📚" title="Estudos">
            <div className="profile-stats-row">
                <Stat value={formatDuration(data.seconds)} label="Tempo estudado" />
                <Stat value={data.sessions} label={data.sessions === 1 ? 'Sessão' : 'Sessões'} />
            </div>

            <DayBars
                days={data.days}
                period={period}
                value={d => d.seconds}
                fill={() => 100}
                tip={d => (d.seconds ? formatDuration(d.seconds) : 'sem estudo')}
            />

            <ShareList
                items={data.subjects.map(s => ({ ...s, value: s.seconds }))}
                total={data.seconds}
                format={s => formatDuration(s.seconds)}
            />
        </Card>
    )
}

/* ---------- metas ---------- */

function GoalsCard({ data, noun }) {
    return (
        <Card icon="🎯" title="Metas">
            <div className="profile-stats-row">
                <Stat value={data.achieved} label={data.achieved === 1 ? 'Conquistada' : 'Conquistadas'} tone="positive" />
                <Stat value={data.inProgress} label="Em andamento" />
                {data.overdue > 0 && (
                    <Stat value={data.overdue} label={data.overdue === 1 ? 'Atrasada' : 'Atrasadas'} tone="negative" />
                )}
            </div>

            {data.achievedInPeriod > 0 && (
                <p className="profile-highlight">
                    🎉 {plural(data.achievedInPeriod, 'meta conquistada', 'metas conquistadas')} {noun}!
                </p>
            )}

            {data.stepsTotal > 0 && (
                <Progress
                    value={pct(data.stepsDone, data.stepsTotal)}
                    label="Etapas concluídas"
                    detail={`${data.stepsDone} de ${data.stepsTotal} · ${pct(data.stepsDone, data.stepsTotal)}%`}
                />
            )}

            {data.active.length > 0 && (
                <>
                    <h4 className="profile-subtitle">Em andamento</h4>
                    <ul className="profile-goals">
                        {data.active.map(g => {
                            const late = parseIso(g.deadline) < parseIso(new Date().toLocaleDateString('en-CA'))
                            return (
                                <li key={g.id}>
                                    <div className="profile-share-top">
                                        <span className="profile-item-title">{g.title}</span>
                                        <em className={late ? 'is-late' : ''}>{deadlineLabel(g.deadline)}</em>
                                    </div>
                                    {g.stepsTotal > 0 && (
                                        <div className="profile-progress-track">
                                            <div className="profile-progress-fill"
                                                 style={{ width: `${pct(g.stepsDone, g.stepsTotal)}%` }} />
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </>
            )}
        </Card>
    )
}

/* ---------- anotações ---------- */

function NotesCard({ data, noun }) {
    return (
        <Card icon="📝" title="Anotações">
            <div className="profile-stats-row">
                <Stat value={data.total} label="No total" />
                <Stat value={data.created} label={`Criadas ${noun}`} />
            </div>

            <h4 className="profile-subtitle">Próximas datas</h4>
            {data.upcoming.length === 0 ? (
                <Empty>Nenhuma anotação com data marcada pela frente.</Empty>
            ) : (
                <ul className="profile-list-plain">
                    {data.upcoming.map(n => (
                        <li key={n.id}>
                            <span className="profile-item-title">
                                {n.emoji && <span aria-hidden="true">{n.emoji} </span>}
                                {n.title}
                            </span>
                            <span className="profile-pill" title={formatDate(n.date)}>{countdown(n.date)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    )
}
