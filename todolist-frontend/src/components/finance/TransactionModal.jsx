import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import DateField from '../DateField'
import EmojiPicker from './EmojiPicker'
import { MAX_AMOUNT_CENTS, formatMoney, paletteFor, parseMoney, maskMoney } from '../../finance'

const TYPES = [
    ['EXPENSE', 'Gasto'],
    ['INCOME', 'Receita'],
]

const DEFAULT_EMOJI = '🏷️'
const today = () => new Date().toLocaleDateString('en-CA')

export default function TransactionModal({ open, onClose, onSaved, onCategoriesChanged }) {
    const [type, setType] = useState('EXPENSE')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState(today)
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState(null)

    // editor de categoria: null = fechado, { id: null } = nova, { id: 5 } = editando
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

    // formulário limpo toda vez que abre
    if (open !== wasOpen) {
        setWasOpen(open)
        if (open) {
            setType('EXPENSE')
            setAmount('')
            setDescription('')
            setDate(today())
            setCategoryId(null)
            setEditor(null)
            setEmojiOpen(false)
            setConfirmDelete(false)
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

    // a confirmação de excluir se desfaz sozinha em 4 segundos
    useEffect(() => {
        if (!confirmDelete) return
        const timer = setTimeout(() => setConfirmDelete(false), 4000)
        return () => clearTimeout(timer)
    }, [confirmDelete])

    // só aparecem categorias e cores do tipo escolhido
    const visible = categories.filter(c => c.type === type)
    const takenByOthers = new Set(
        categories.filter(c => c.id !== editor?.id).map(c => c.color.toUpperCase())
    )
    const freeColors = paletteFor(type).filter(c => !takenByOthers.has(c.hex))
    const colorName = paletteFor(type).find(c => c.hex === color)?.name

    function changeType(next) {
        setType(next)
        setCategoryId(null)
        setEditor(null)
        setEmojiOpen(false)
        setError('')
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

    function handleAmountChange(e) {
        const masked = maskMoney(e.target.value)
        const cents = parseMoney(masked)

        // não deixa digitar acima do limite
        if (cents && cents > MAX_AMOUNT_CENTS) return

        setAmount(masked)
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

        setSaving(true)
        try {
            const created = await api('/finance/transactions', {
                method: 'POST',
                body: { type, amountCents, description: description.trim(), categoryId, date },
            })
            onSaved(created)
            onClose()
        } catch (err) {
            setError(err.message)
        } finally {
            setSaving(false)
        }
    }

    const invalid = !amount.trim() || !description.trim() || !date

    return (
        <div className={`task-overlay ${open ? 'is-open' : ''}`} onMouseDown={onClose}>
            <form className="task-modal" onSubmit={handleSubmit} onMouseDown={e => e.stopPropagation()}>
                <h2>Novo lançamento</h2>

                <div className="task-options" role="radiogroup" aria-label="Tipo">
                    {TYPES.map(([value, label]) => (
                        <label key={value}>
                            <input
                                type="radio"
                                name="fin-type"
                                value={value}
                                checked={type === value}
                                onChange={() => changeType(value)}
                            />
                            <span>{label}</span>
                        </label>
                    ))}
                </div>

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
                    />
                </div>

                <div className="fin-field">
                    <label className="form-label" htmlFor="fin-description">Descrição</label>
                    <input
                        id="fin-description"
                        className="form-input"
                        placeholder="Ex.: Mercado"
                        value={description}
                        maxLength={100}
                        onChange={e => setDescription(e.target.value)}
                    />
                </div>

                <div className="fin-field">
                    <span className="form-label">Categoria (opcional)</span>

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
                                            e.preventDefault() // não envia o lançamento inteiro
                                            saveCategory()
                                        }
                                    }}
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
                            {colorName && <p className="tag-caption">{colorName}</p>}

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

                {error && <p className="task-error">{error}</p>}

                <div className="task-actions">
                    <button type="button" className="task-btn" onClick={onClose}>Cancelar</button>
                    <button type="submit" className="task-btn is-primary" disabled={saving || invalid}>
                        Adicionar
                    </button>
                </div>
            </form>
        </div>
    )
}