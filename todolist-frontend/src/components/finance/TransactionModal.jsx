import { useEffect, useRef, useState } from 'react'
import { api } from '../../api'
import { CATEGORY_COLORS, parseMoney } from '../../finance'
import DateField from '../DateField'
import EmojiPicker from './EmojiPicker'

const TYPES = [
    ['EXPENSE', 'Gasto'],
    ['INCOME', 'Receita'],
]

const today = () => new Date().toLocaleDateString('en-CA')

export default function TransactionModal({ open, onClose, onSaved }) {
    const [type, setType] = useState('EXPENSE')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState(today)
    const [categories, setCategories] = useState([])
    const [categoryId, setCategoryId] = useState(null)
    const [creating, setCreating] = useState(false)
    const [newName, setNewName] = useState('')
    const [newEmoji, setNewEmoji] = useState('🏷️')
    const [newColor, setNewColor] = useState(CATEGORY_COLORS[0].hex)
    const [emojiOpen, setEmojiOpen] = useState(false)
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
            setCreating(false)
            setEmojiOpen(false)
            setError('')
        }
    }

    // categorias já criadas
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

    function toggleNew() {
        if (!creating) {
            // sugere a primeira cor que ainda não está em uso
            const free = CATEGORY_COLORS.find(
                c => !categories.some(k => k.color.toLowerCase() === c.hex.toLowerCase())
            )
            setNewColor((free ?? CATEGORY_COLORS[0]).hex)
            setNewName('')
            setNewEmoji('🏷️')
        }
        setEmojiOpen(false)
        setCreating(v => !v)
    }

    async function createCategory() {
        setError('')
        const name = newName.trim().replace(/\s+/g, ' ')
        if (!name) return

        if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            setError('Já existe uma categoria com esse nome')
            return
        }

        setCatSaving(true)
        try {
            const created = await api('/finance/categories', {
                method: 'POST',
                body: { name, emoji: newEmoji, color: newColor },
            })
            setCategories(list => [...list, created])
            setCategoryId(created.id)
            setCreating(false)
        } catch (err) {
            setError(err.message)
        } finally {
            setCatSaving(false)
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
                                onChange={() => setType(value)}
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
                        inputMode="decimal"
                        placeholder="0,00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
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
                        {categories.map(c => (
                            <button
                                key={c.id}
                                type="button"
                                className={`cat-chip ${categoryId === c.id ? 'is-selected' : ''}`}
                                style={{ '--cat': c.color }}
                                onClick={() => setCategoryId(id => (id === c.id ? null : c.id))}
                            >
                                <span className="cat-emoji">{c.emoji}</span>
                                <span className="cat-name">{c.name}</span>
                            </button>
                        ))}

                        <button type="button" className="cat-chip is-add" onClick={toggleNew}>
                            {creating ? 'Fechar' : '+ Nova'}
                        </button>
                    </div>

                    {creating && (
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
                                        {newEmoji}
                                    </button>

                                    {emojiOpen && (
                                        <EmojiPicker
                                            value={newEmoji}
                                            onSelect={emoji => {
                                                setNewEmoji(emoji)
                                                setEmojiOpen(false)
                                            }}
                                            onClose={() => setEmojiOpen(false)}
                                        />
                                    )}
                                </div>

                                <input
                                    className="form-input"
                                    placeholder="Nome da categoria"
                                    value={newName}
                                    maxLength={30}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault() // não envia o lançamento inteiro
                                            createCategory()
                                        }
                                    }}
                                />
                            </div>

                            <div className="tag-swatches" role="radiogroup" aria-label="Cor da categoria">
                                {CATEGORY_COLORS.map(c => (
                                    <button
                                        key={c.hex}
                                        type="button"
                                        role="radio"
                                        aria-checked={newColor === c.hex}
                                        aria-label={c.name}
                                        title={c.name}
                                        className={`tag-swatch ${newColor === c.hex ? 'is-selected' : ''}`}
                                        style={{ background: c.hex }}
                                        onClick={() => setNewColor(c.hex)}
                                    />
                                ))}
                            </div>

                            <div className="cat-new-actions">
                                <button
                                    type="button"
                                    className="task-btn is-primary"
                                    disabled={!newName.trim() || catSaving}
                                    onClick={createCategory}
                                >
                                    Criar categoria
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