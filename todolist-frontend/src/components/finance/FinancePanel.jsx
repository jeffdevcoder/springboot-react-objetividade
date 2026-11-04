import { useEffect, useState } from 'react'
import { api } from '../../api'
import {
    EXPENSE_COLOR,
    INCOME_COLOR,
    buildSegments,
    formatMoney,
    monthLabel,
    shiftMonth,
    summarize,
    toMonthKey,
    formatCenter
} from '../../finance'
import DonutChart from './DonutChart'
import TransactionModal from './TransactionModal'
import '../../styles/finance.css'

const formatDay = iso => iso.split('-').reverse().join('/')

const remainingLabel = iso => {
    const [y, m, d] = iso.split('-').map(Number)
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const days = Math.round((new Date(y, m - 1, d) - today) / 86400000)

    if (days < 0) return ''
    if (days === 0) return 'hoje'
    if (days === 1) return '1 dia restante'
    return `${days} dias restantes`
}

const rowKey = t => (t.id !== null ? `t${t.id}` : `r${t.recurringId}`)

function rowVisual(t) {
    if (t.category) return { icon: t.category.emoji, color: t.category.color }
    return t.type === 'INCOME'
        ? { icon: '💰', color: INCOME_COLOR }
        : { icon: '💸', color: EXPENSE_COLOR }
}

export default function FinancePanel() {
    const [month, setMonth] = useState(() => toMonthKey(new Date()))
    const [items, setItems] = useState([])
    const [error, setError] = useState('')
    const [modalOpen, setModalOpen] = useState(false)
    const [confirmId, setConfirmId] = useState(null)
    const [editing, setEditing] = useState(null)

    const currentMonth = toMonthKey(new Date())
    const isCurrent = month === currentMonth

    useEffect(() => {
        let ignore = false
        api(`/finance/transactions?month=${month}`)
            .then(list => { if (!ignore) { setItems(list); setError('') } })
            .catch(err => { if (!ignore) setError(err.message) })
        return () => { ignore = true }
    }, [month])

    useEffect(() => {
        if (confirmId === null) return
        const timer = setTimeout(() => setConfirmId(null), 3000)
        return () => clearTimeout(timer)
    }, [confirmId])

    function handleSaved(created) {
        const key = created.date.slice(0, 7)
        if (key !== month) {
            setMonth(key)
            return
        }
        refresh()
    }

    async function handleDelete(t) {
        const key = rowKey(t)
        if (confirmId !== key) {
            setConfirmId(key)
            return
        }
        try {
            if (t.recurringId) {
                await api(`/finance/recurring/${t.recurringId}?month=${month}`, { method: 'DELETE' })
                refresh()
            } else {
                await api(`/finance/transactions/${t.id}`, { method: 'DELETE' })
                setItems(list => list.filter(x => x.id !== t.id))
            }
            setConfirmId(null)
        } catch (err) {
            setError(err.message)
        }
    }

    function refresh() {
        api(`/finance/transactions?month=${month}`)
            .then(setItems)
            .catch(err => setError(err.message))
    }

    const totals = summarize(items)
    const segments = buildSegments(items)

    let hint = ''
    if (totals.income > 0) {
        const pct = Math.round((totals.expense / totals.income) * 100)
        hint = pct > 999 ? '999%+ gasto' : `${pct}% gasto`
    } else if (totals.expense > 0) {
        hint = 'sem receitas'
    }

    function openNew() {
        setEditing(null)
        setModalOpen(true)
    }

    function openEdit(t) {
        setEditing(t)
        setModalOpen(true)
    }

    const progressOf = t =>
        t.installmentTotal > 1
            ? Math.round((t.installmentNumber / t.installmentTotal) * 100)
            : null

    return (
        <section className="dashboard-panel">
            <div className="panel-header">
                <div>
                    <h2 className="panel-title">Organização financeira</h2>

                    <div className="panel-description day-nav">
                        <button
                            type="button"
                            className="day-btn"
                            aria-label="Mês anterior"
                            onClick={() => setMonth(m => shiftMonth(m, -1))}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M15 18l-6-6 6-6" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            className={`date-chip ${isCurrent ? 'is-today' : ''}`}
                            onClick={() => setMonth(currentMonth)}
                            title="Ir para o mês atual"
                        >
                            {monthLabel(month)}
                        </button>

                        <button
                            type="button"
                            className="day-btn"
                            aria-label="Próximo mês"
                            onClick={() => setMonth(m => shiftMonth(m, 1))}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M9 18l6-6-6-6" />
                            </svg>
                        </button>
                    </div>
                </div>

                <button className="task-add" type="button" onClick={openNew}>
                    <span className="task-add-icon">+</span>
                    <span className="task-add-text"> Lançamento</span>
                </button>
            </div>

            {error && <p className="task-error">{error}</p>}

            <div className="fin-overview">
                <DonutChart
                    segments={segments}
                    centerLabel="Saldo"
                    centerValue={formatCenter(totals.balance)}
                    centerHint={hint}
                    negative={totals.balance < 0}
                />

                <div className="fin-stats">
                    <div className="fin-stats-scroll">
                        {segments.map(s => (
                            <div key={s.key} className="fin-stat">
                        <span className="fin-stat-label">
                            <span className="fin-dot" style={{ background: s.color }} />
                            {s.emoji} {s.label}
                        </span>
                                <span className="fin-stat-value">{formatMoney(s.value)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="fin-stat fin-stat-total">
                        <span className="fin-stat-label">Total</span>
                        <span
                            className={`fin-stat-value ${
                                totals.balance > 0 ? 'is-positive' : totals.balance < 0 ? 'is-negative' : ''
                            }`}
                        >
                            {formatMoney(totals.balance)}
                        </span>
                    </div>
                </div>
            </div>

            <h3 className="fin-list-title">Lançamentos</h3>

            {items.length > 0 ? (
                <ul className="fin-list">
                    {items.map(t => (
                        <li key={rowKey(t)} className="fin-row">
                            <button type="button" className="fin-open" onClick={() => openEdit(t)}>
        <span
            className="fin-badge"
            style={{ background: `color-mix(in srgb, ${rowVisual(t).color} 20%, transparent)` }}
        >
            {rowVisual(t).icon}
        </span>
        <div className="fin-main">
            <span className="fin-title">
                {t.description || (t.category ? t.category.name : t.type === 'INCOME' ? 'Receita' : 'Gasto')}
            </span>
            <span className="fin-sub">
                {t.installmentTotal > 1 ? `${t.installmentNumber}/${t.installmentTotal} · ` : ''}
                            {t.recurringId ? '🔁 Fixo · ' : ''}
                            {t.category && t.description ? `${t.category.name} · ` : ''}
                            {formatDay(t.date)}
                                {remainingLabel(t.date) && (
                                    <span className={`fin-remaining ${t.type === 'INCOME' ? 'is-income' : 'is-expense'}`}>
                                        {' '}({remainingLabel(t.date)})
                                    </span>)}
            </span>
                {progressOf(t) !== null && (
                    <span className="fin-progress">
                        <span className="fin-bar">
                            <span
                                className="fin-bar-fill"
                                style={{
                                    width: `${progressOf(t)}%`,
                                    background: t.type === 'INCOME' ? 'var(--fin-income-text)' : 'var(--fin-expense-text)',
                                }}
                            />
                        </span>
                    <span className="fin-progress-text">{progressOf(t)}%</span>
                </span>
                )}
        </div>
        <span className={`fin-amount ${t.type === 'INCOME' ? 'is-income' : 'is-expense'}`}>
            {t.type === 'INCOME' ? '+ ' : '− '}{formatMoney(t.amountCents)}
        </span>
        </button>
            <button
                type="button"
                className={`fin-del ${confirmId === rowKey(t) ? 'is-confirming' : ''}`}
                onClick={() => handleDelete(t)}
                aria-label={t.recurringId ? 'Encerrar lançamento fixo' : 'Excluir lançamento'}
                title={t.installmentTotal > 1 ? 'Excluir todas as parcelas' : 'Excluir lançamento'}>
                {confirmId === rowKey(t) ? (
                    t.recurringId ? 'Encerrar?' : t.installmentTotal > 1 ? 'Excluir todas?' : 'Excluir?') : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="M3 6h18" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg> )}
            </button>
        </li> ))}
                </ul>
            ) : (
                <p className="fin-empty">Nenhum lançamento neste mês.</p>
            )}

            <TransactionModal
                open={modalOpen}
                transaction={editing}
                month={month}
                onClose={() => setModalOpen(false)}
                onSaved={handleSaved}
                onCategoriesChanged={refresh}
            />
        </section>
    )
}