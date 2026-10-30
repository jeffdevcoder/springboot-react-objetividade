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
} from '../../finance'
import DonutChart from './DonutChart'
import TransactionModal from './TransactionModal'
import '../../styles/finance.css'

const formatDay = iso => iso.split('-').reverse().slice(0, 2).join('/')

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

    const currentMonth = toMonthKey(new Date())
    const isCurrent = month === currentMonth

    useEffect(() => {
        let ignore = false
        api(`/finance/transactions?month=${month}`)
            .then(list => { if (!ignore) { setItems(list); setError('') } })
            .catch(err => { if (!ignore) setError(err.message) })
        return () => { ignore = true }
    }, [month])

    // a confirmação de excluir se desfaz sozinha em 3 segundos
    useEffect(() => {
        if (confirmId === null) return
        const timer = setTimeout(() => setConfirmId(null), 3000)
        return () => clearTimeout(timer)
    }, [confirmId])

    function handleSaved(created) {
        const key = created.date.slice(0, 7)
        if (key !== month) {
            setMonth(key) // vai para o mês do lançamento
            return
        }
        api(`/finance/transactions?month=${month}`)
            .then(setItems)
            .catch(err => setError(err.message))
    }

    async function handleDelete(id) {
        if (confirmId !== id) {
            setConfirmId(id)
            return
        }
        try {
            await api(`/finance/transactions/${id}`, { method: 'DELETE' })
            setItems(list => list.filter(t => t.id !== id))
            setConfirmId(null)
        } catch (err) {
            setError(err.message)
        }
    }

    const totals = summarize(items)
    const segments = buildSegments(totals, items)

    let hint = ''
    if (totals.income > 0) hint = `${Math.round((totals.expense / totals.income) * 100)}% gasto`
    else if (totals.expense > 0) hint = 'sem receitas'

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

                <button className="task-add" type="button" onClick={() => setModalOpen(true)}>
                    + Lançamento
                </button>
            </div>

            {error && <p className="task-error">{error}</p>}

            <div className="fin-overview">
                <DonutChart
                    segments={segments}
                    centerLabel="Saldo"
                    centerValue={formatMoney(totals.balance)}
                    centerHint={hint}
                    negative={totals.balance < 0}
                />

                <div className="fin-stats">
                    <div className="fin-stat">
                        <span className="fin-stat-label">
                            <span className="fin-dot" style={{ background: INCOME_COLOR }} />
                            Receitas
                        </span>
                        <span className="fin-stat-value">{formatMoney(totals.income)}</span>
                    </div>

                    <div className="fin-stat">
                        <span className="fin-stat-label">
                            <span className="fin-dot" style={{ background: EXPENSE_COLOR }} />
                            Gastos
                        </span>
                        <span className="fin-stat-value">{formatMoney(totals.expense)}</span>
                    </div>

                    <div className="fin-stat">
                        <span className="fin-stat-label">Saldo do mês</span>
                        <span className={`fin-stat-value ${totals.balance < 0 ? 'is-negative' : ''}`}>
                            {formatMoney(totals.balance)}
                        </span>
                    </div>
                </div>
            </div>

            <h3 className="fin-list-title">Lançamentos</h3>

            {items.length > 0 ? (
                <ul className="fin-list">
                    {items.map(t => (
                        <li key={t.id} className="fin-row">
                            <span
                                className="fin-badge"
                                style={{ background: `color-mix(in srgb, ${rowVisual(t).color} 20%, transparent)` }}
                                >
                                {rowVisual(t).icon}
                            </span>

                            <div className="fin-main">
                                <span className="fin-title">{t.description}</span>
                                <span className="fin-sub">
                                    {t.category ? `${t.category.name} · ` : ''}{formatDay(t.date)}
                                </span>
                            </div>

                            <span className={`fin-amount ${t.type === 'INCOME' ? 'is-income' : 'is-expense'}`}>
                                {t.type === 'INCOME' ? '+ ' : '− '}{formatMoney(t.amountCents)}
                            </span>

                            <button
                                type="button"
                                className={`fin-del ${confirmId === t.id ? 'is-confirming' : ''}`}
                                onClick={() => handleDelete(t.id)}
                                aria-label={confirmId === t.id ? 'Confirmar exclusão' : 'Excluir lançamento'}
                                title="Excluir lançamento"
                            >
                                {confirmId === t.id ? (
                                    'Excluir?'
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M3 6h18" />
                                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    </svg>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="fin-empty">Nenhum lançamento neste mês.</p>
            )}

            <TransactionModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                onSaved={handleSaved}
            />
        </section>
    )
}