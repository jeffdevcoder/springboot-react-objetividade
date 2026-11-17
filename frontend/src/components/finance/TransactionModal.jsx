import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import { EMOJI_GROUPS, MAX_AMOUNT_CENTS, formatMoney, maskMoney, paletteFor, parseMoney } from '../../finance'
import DateField from '../DateField'
import EmojiPicker from '../EmojiPicker'
import InstallmentPicker, { MAX_INSTALLMENTS } from './InstallmentPicker'

const formatDay = iso => iso.split('-').reverse().join('/')
const rowKey = t => (t.id !== null ? `t${t.id}` : `r${t.recurringId}`)

const TYPES = [
    ['INCOME', 'Receita'],
    ['EXPENSE', 'Gasto'],
    ['PAY', 'Conta foi paga?'],
]

const DEFAULT_EMOJI = '🏷️'
const today = () => new Date().toLocaleDateString('en-CA')

export default function TransactionModal({
    open, transaction, month, expenses = [], onClose, onSaved, onPaid, onCategoriesChanged,
}) {
    const editing = Boolean(transaction)
    const wasFixed = editing && Boolean(transaction.recurringId)

    const [type, setType] = useState('INCOME')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState(today)
    const [monthly, setMonthly] = useState(false)
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState(null)
    const [installOpen, setInstallOpen] = useState(false)

    const [editor, setEditor] = useState(null)
    const [name, setName] = useState('')
    const [emoji, setEmoji] = useState(DEFAULT_EMOJI)
    const [color, setColor] = useState('')
    const [emojiOpen, setEmojiOpen] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)

    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [catSaving, setCatSaving] = useState(false)
    const [wasOpen, setWasOpen] = useState(false)
    const amountRef = useRef(null)
    const [installments, setInstallments] = useState('1')
    const [paid, setPaid] = useState(false)
    const [payPick, setPayPick] = useState(null)
    const [paying, setPaying] = useState(false)

    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            if (transaction) {
                setType(transaction.type)
                setAmount(maskMoney(String(transaction.amountCents)))
                setDescription(transaction.description)
                setDate(transaction.date)
                setCategoryId(transaction.category ? transaction.category.id : null)
                setMonthly(Boolean(transaction.recurringId))
                setInstallments(transaction.installmentTotal > 1 ? String(transaction.installmentTotal) : '1')
                setPaid(Boolean(transaction.paid))
            } else {
                setType('INCOME')
                setAmount('')
                setDescription('')
                setDate(month === today().slice(0, 7) ? today() : `${month}-01`)
                setCategoryId(null)
                setMonthly(false)
                setInstallments('1')
            }
            setEditor(null)
            setEmojiOpen(false)
            setInstallOpen(false)
            setConfirmDelete(false)
            setPayPick(null)
            setError('')
        }
    }

    useEffect(() => {
        if (!open) return
        let ignore = false
        api('/finance/categories')
            .then(list => { if (!ignore) setCategories(list) })
            .catch(err => { if (!ignore) setError(err.message) })
        return () => { ignore = true }
    }, [open])

    useEffect(() => {
        if (!open) return
        const timer = setTimeout(() => amountRef.current?.focus(), 80)
        const onKey = e => e.key === 'Escape' && onClose()
        window.addEventListener('keydown', onKey)
        return () => {
            clearTimeout(timer)
            window.removeEventListener('keydown', onKey)
        }
    }, [open, onClose])

    useEffect(() => {
        if (!confirmDelete) return
        const timer = setTimeout(() => setConfirmDelete(false), 4000)
        return () => clearTimeout(timer)
    }, [confirmDelete])

    const visible = categories.filter(c => c.type === type)
    const takenByOthers = new Set(
        categories.filter(c => c.id !== editor?.id).map(c => c.color.toUpperCase())
    )
    const freeColors = paletteFor(type).filter(c => !takenByOthers.has(c.hex))

    async function confirmPaid(t, paid = true) {
        setPaying(true)
        setError('')
        try {
            const url = t.recurringId
                ? `/finance/recurring/${t.recurringId}/paid?month=${month}`
                : `/finance/transactions/${t.id}/paid`
            await api(url, { method: 'PUT', body: { paid } })
            onPaid?.(t, paid)
            setPayPick(null)
        } catch (err) {
            setError(err.message)
        } finally {
            setPaying(false)
        }
    }

    function changeType(next) {
        setType(next)
        setPayPick(null)
        setCategoryId(null)
        setEditor(null)
        setEmojiOpen(false)
        setInstallOpen(false)
        setInstallments('1')
        setError('')
    }

    function handleAmountChange(e) {
        const masked = maskMoney(e.target.value)
        const cents = parseMoney(masked)

        if (cents && cents > MAX_AMOUNT_CENTS) return

        setAmount(masked)
    }

    function openCreate() {
        if (editor && editor.id === null) {
            setEditor(null)
            return
        }
        const free = paletteFor(type).find(
            c => !categories.some(k => k.color.toUpperCase() === c.hex)
        )
        setEditor({ id: null })
        setName('')
        setEmoji(DEFAULT_EMOJI)
        setColor(free ? free.hex : '')
        setEmojiOpen(false)
        setConfirmDelete(false)
        setError('')
    }

    function openEdit(c) {
        setEditor({ id: c.id })
        setName(c.name)
        setEmoji(c.emoji)
        setColor(c.color.toUpperCase())
        setEmojiOpen(false)
        setConfirmDelete(false)
        setError('')
    }

    function closeEditor() {
        setEditor(null)
        setEmojiOpen(false)
        setConfirmDelete(false)
    }

    async function saveCategory() {
        setError('')
        const clean = name.trim().replace(/\s+/g, ' ')
        if (!clean || !color) return

        if (categories.some(c => c.id !== editor.id && c.name.toLowerCase() === clean.toLowerCase())) {
            setError('Já existe uma categoria com esse nome')
            return
        }

        setCatSaving(true)
        try {
            if (editor.id === null) {
                const created = await api('/finance/categories', {
                    method: 'POST',
                    body: { type, name: clean, emoji, color },
                })
                setCategories(list => [...list, created])
                setCategoryId(created.id)
            } else {
                const updated = await api(`/finance/categories/${editor.id}`, {
                    method: 'PUT',
                    body: { name: clean, emoji, color },
                })
                setCategories(list => list.map(c => (c.id === updated.id ? updated : c)))
                onCategoriesChanged?.()
            }
            closeEditor()
        } catch (err) {
            setError(err.message)
        } finally {
            setCatSaving(false)
        }
    }

    async function deleteCategory() {
        if (!confirmDelete) {
            setConfirmDelete(true)
            return
        }
        try {
            await api(`/finance/categories/${editor.id}`, { method: 'DELETE' })
            setCategories(list => list.filter(c => c.id !== editor.id))
            setCategoryId(id => (id === editor.id ? null : id))
            onCategoriesChanged?.()
            closeEditor()
        } catch (err) {
            setError(err.message)
        }
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (payMode) return
        setError('')

        const amountCents = parseMoney(amount)
        if (!amountCents) {
            setError('Informe um valor válido')
            return
        }
        if (amountCents > MAX_AMOUNT_CENTS) {
            setError(`O valor máximo é ${formatMoney(MAX_AMOUNT_CENTS)}`)
            return
        }
        if (!description.trim() && !categoryId) {
            setError('Informe a descrição ou escolha uma categoria')
            return
        }

        setSaving(true)
        try {
            const body = { type, amountCents, description: description.trim(), categoryId, date, monthly}

            if (canInstall && monthly && installmentsN > 1) {
                body.installments = installmentsN
                body.monthly = false
            }

            if (isInstallment) body.installments = installmentsN

            let saved
            if (!editing) {
                saved = await api('/finance/transactions', { method: 'POST', body })
            } else if (transaction.recurringId) {
                saved = await api(`/finance/recurring/${transaction.recurringId}?month=${month}`, {
                    method: 'PUT',
                    body,
                })
            } else {
                saved = await api(`/finance/transactions/${transaction.id}`, { method: 'PUT', body })
            }

            if (editing && saved.type === 'EXPENSE' && saved.paid !== paid) {
                saved = saved.recurringId
                    ? await api(`/finance/recurring/${saved.recurringId}/paid?month=${saved.date.slice(0, 7)}`, {
                        method: 'PUT',
                        body: { paid },
                    })
                    : await api(`/finance/transactions/${saved.id}/paid`, { method: 'PUT', body: { paid } })
            }

            onSaved(saved)
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const payMode = type === 'PAY'
    const types = TYPES.filter(([value]) => value !== 'PAY' || (!editing && expenses.length > 0))
    const pendingCount = expenses.filter(t => !t.paid).length

    const invalid = !amount.trim() || !date || (!description.trim() && !categoryId)
    const installmentsN = Math.min(Math.max(parseInt(installments, 10) || 1, 1), MAX_INSTALLMENTS)
    const isInstallment = editing && transaction.installmentTotal > 1
    const canInstall = !editing && type === 'EXPENSE'

    let monthlyHint = ''
    if (monthly) {
        monthlyHint = wasFixed
            ? 'A mudança vale deste mês em diante (da data, só o dia conta).'
            : 'Aparece todo mês, a partir da data escolhida.'
    } else if (wasFixed) {
        monthlyHint = 'Deixa de ser fixo: este mês vira um lançamento comum, e os meses seguintes não terão mais.'
    }

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <form className="task-modal" onSubmit={handleSubmit} onMouseDown={e => e.stopPropagation()}>
                <h2>{payMode ? 'Conta foi paga?' : editing ? 'Editar lançamento' : 'Novo lançamento'}</h2>

                <div className="task-modal-body">
                    {editing && type === 'EXPENSE' && (
                        <div className="fin-paid">
                            <span className="form-label">Isso foi pago?</span>
                            <div className="fin-paid-toggle" role="radiogroup" aria-label="Isso foi pago?">
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={paid}
                                    className={`fin-paid-opt ${paid ? 'is-yes' : ''}`}
                                    onClick={() => setPaid(true)}
                                >
                                    Sim
                                </button>
                                <button
                                    type="button"
                                    role="radio"
                                    aria-checked={!paid}
                                    className={`fin-paid-opt ${!paid ? 'is-no' : ''}`}
                                    onClick={() => setPaid(false)}
                                >
                                    Não
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="task-options" role="radiogroup" aria-label="Tipo">
                        {types.map(([value, label]) => (
                            <label
                                key={value}
                                className={value === 'INCOME' ? 'opt-income' : value === 'EXPENSE' ? 'opt-expense' : 'opt-pay'}
                            >
                                <input
                                    type="radio"
                                    name="fin-type"
                                    value={value}
                                    checked={type === value}
                                    onChange={() => changeType(value)}
                                    autoComplete="off"
                                />
                                <span>{label}</span>
                            </label>
                        ))}
                    </div>

                    {payMode ? (
                        <div className="fin-field">
                            <p className="fin-sub fin-pay-hint">
                                {pendingCount > 0
                                    ? `${pendingCount} ${pendingCount === 1 ? 'gasto pendente' : 'gastos pendentes'} neste mês. Ao confirmar, entra uma receita em "Contas pagas" com o mesmo valor.`
                                    : 'Todos os gastos deste mês estão pagos. Toque num gasto para desfazer.'}
                            </p>
                            <ul className="fin-list">
                                {expenses.map(t => (
                                    <li key={rowKey(t)} className={`fin-row ${t.paid ? 'is-paid' : ''}`}>
                                        <button
                                            type="button"
                                            className="fin-open"
                                            onClick={() => setPayPick(k => (k === rowKey(t) ? null : rowKey(t)))}
                                        >
                                            <div className="fin-main">
                                                <span className="fin-title">
                                                    {t.description || (t.category ? t.category.name : 'Gasto')}
                                                </span>
                                                <span className="fin-sub">
                                                    {t.installmentTotal > 1 ? `${t.installmentNumber}/${t.installmentTotal} · ` : ''}
                                                    {t.recurringId ? '🔁 Fixo · ' : ''}
                                                    {formatDay(t.date)}
                                                </span>
                                            </div>
                                            <span className="fin-amount is-expense">− {formatMoney(t.amountCents)}</span>
                                        </button>

                                        {payPick === rowKey(t) ? (
                                            <button
                                                type="button"
                                                className={`fin-pay-confirm ${t.paid ? 'is-undo' : ''}`}
                                                disabled={paying}
                                                onClick={() => confirmPaid(t, !t.paid)}
                                            >
                                                {t.paid ? 'Desfazer' : 'Confirmar'}
                                            </button>
                                        ) : t.paid && (
                                            <span className="fin-paid-tag fin-pay-state">✓ Pago</span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (<>
                    <div className="fin-field">
                        <label className="form-label" htmlFor="fin-amount">Valor (R$)</label>
                        <input
                            ref={amountRef}
                            id="fin-amount"
                            className="form-input"
                            inputMode="numeric"
                            placeholder="0,00"
                            maxLength={13}
                            value={amount}
                            onChange={handleAmountChange}
                            autoComplete="off"
                        />
                    </div>

                    <div className="fin-field">
                        <label className="form-label" htmlFor="fin-description">
                            Descrição{categoryId ? ' (opcional)' : ''}
                        </label>
                        <input
                            id="fin-description"
                            className="form-input"
                            placeholder="Ex.: Mercado"
                            value={description}
                            maxLength={100}
                            onChange={e => setDescription(e.target.value)}
                            autoComplete="off"
                        />
                    </div>

                    <div className="fin-field">
                        <span className="form-label">
                            Categoria{description.trim() ? ' (opcional)' : ''}
                        </span>

                        <div className="cat-chips">
                            {visible.map(c => (
                                <div key={c.id} className="cat-item">
                                    <button
                                        type="button"
                                        className={`cat-chip ${categoryId === c.id ? 'is-selected' : ''}`}
                                        style={{ '--cat': c.color }}
                                        onClick={() => setCategoryId(id => (id === c.id ? null : c.id))}
                                    >
                                        <span className="cat-emoji">{c.emoji}</span>
                                        <span className="cat-name">{c.name}</span>
                                    </button>

                                    <button
                                        type="button"
                                        className="cat-edit"
                                        aria-label={`Editar ${c.name}`}
                                        title="Editar categoria"
                                        onClick={() => openEdit(c)}
                                    >
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                        </svg>
                                    </button>
                                </div>
                            ))}

                            <button type="button" className="cat-chip is-add" onClick={openCreate}>
                                {editor && editor.id === null ? 'Fechar' : '+ Nova'}
                            </button>
                        </div>

                        {editor && (
                            <div className="cat-new task-fade">
                                <div className="cat-new-row">
                                    <div className="cat-emoji-anchor">
                                        <button
                                            type="button"
                                            className="form-input cat-emoji-btn"
                                            onClick={() => setEmojiOpen(o => !o)}
                                            aria-label="Escolher emoji"
                                            aria-haspopup="dialog"
                                            aria-expanded={emojiOpen}
                                        >
                                            {emoji}
                                        </button>

                                        {emojiOpen && (
                                            <EmojiPicker
                                                groups={EMOJI_GROUPS}
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
                                        placeholder="Nome da categoria"
                                        value={name}
                                        maxLength={30}
                                        onChange={e => setName(e.target.value)}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault()
                                                saveCategory()
                                            }
                                        }}
                                        autoComplete="off"
                                    />
                                </div>

                                {freeColors.length > 0 ? (
                                    <div className="tag-swatches" role="radiogroup" aria-label="Cor da categoria">
                                        {freeColors.map(c => (
                                            <button
                                                key={c.hex}
                                                type="button"
                                                role="radio"
                                                aria-checked={color === c.hex}
                                                aria-label={c.name}
                                                title={c.name}
                                                className={`tag-swatch ${color === c.hex ? 'is-selected' : ''}`}
                                                style={{ background: c.hex }}
                                                onClick={() => setColor(c.hex)}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="tag-caption">
                                        Todas as cores de {type === 'INCOME' ? 'receita' : 'gasto'} já estão em uso.
                                    </p>
                                )}

                                <div className="cat-new-actions">
                                    {editor.id !== null && (
                                        <button
                                            type="button"
                                            className={`task-btn is-danger ${confirmDelete ? 'is-confirming' : ''}`}
                                            onClick={deleteCategory}
                                            aria-label={confirmDelete ? 'Confirmar exclusão' : 'Excluir categoria'}
                                            title="Excluir categoria"
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

                                    <button type="button" className="task-btn" onClick={closeEditor}>
                                        Cancelar
                                    </button>
                                    <button
                                        type="button"
                                        className="task-btn is-primary"
                                        disabled={!name.trim() || !color || catSaving}
                                        onClick={saveCategory}
                                    >
                                        {editor.id === null ? 'Criar categoria' : 'Salvar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="task-dates">
                        <div>
                            <span className="form-label">Data</span>
                            <DateField value={date} onChange={setDate} />
                        </div>
                    </div>

                    {!isInstallment && (
                        <label className="task-urgent">
                            <input
                                type="checkbox"
                                checked={monthly}
                                onChange={e => {
                                    setMonthly(e.target.checked)
                                    if (!e.target.checked) {
                                        setInstallments('1')
                                        setInstallOpen(false)
                                    }
                                }}
                            />
                            <span>🔁 {type === 'INCOME' ? 'Receita fixa mensal' : 'Gasto fixo mensal'}</span>
                        </label>
                    )}

                    {(isInstallment || (canInstall && monthly)) && (
                        <div className="fin-field">
                            <span className="form-label">Parcelas</span>

                            <div className="cat-emoji-anchor">
                                <button
                                    type="button"
                                    className="form-input installment-btn"
                                    onClick={() => setInstallOpen(o => !o)}
                                    aria-haspopup="dialog"
                                    aria-expanded={installOpen}
                                >
                                    <span>{installmentsN > 1 ? `${installmentsN}x` : 'Sem fim'}</span>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </button>

                                {installOpen && (
                                    <InstallmentPicker
                                        value={installmentsN}
                                        min={isInstallment ? transaction.installmentNumber : 2}
                                        allowNone={!isInstallment}
                                        onSelect={n => {
                                            setInstallments(String(n))
                                            setInstallOpen(false)
                                        }}
                                        onClose={() => setInstallOpen(false)}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    </>)}

                    {error && <p className="task-error">{error}</p>}
                </div>

                <div className="task-actions">
                    <button type="button" className="task-btn" onClick={onClose}>
                        {payMode ? 'Fechar' : 'Cancelar'}
                    </button>
                    {!payMode && (
                        <button type="submit" className="task-btn is-primary" disabled={saving || invalid}>
                            {editing ? 'Salvar' : 'Adicionar'}
                        </button>
                    )}
                </div>
            </form>
        </div>
    )
}
