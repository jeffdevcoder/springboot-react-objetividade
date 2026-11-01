export const INCOME_COLOR = '#4ADE80'
export const EXPENSE_COLOR = '#EF4444'

export const EXPENSE_PALETTE = [
    { name: 'Vinho', hex: '#660022' },
    { name: 'Vermelho', hex: '#991B1B' },
    { name: 'Magenta', hex: '#D946EF' },
    { name: 'Rosa', hex: '#F472B6' },
    { name: 'Rosa Claro', hex: '#FCE7F3' },
    { name: 'Carmim', hex: '#BE123C' },
    { name: 'Marrom', hex: '#A0522D' },
]

export const INCOME_PALETTE = [
    { name: 'Verde-escuro', hex: '#004D00' },
    { name: 'Verde', hex: '#007A33' },
    { name: 'Verde-sálvia', hex: '#66B3A1' },
    { name: 'Menta', hex: '#B2E0D4' },
    { name: 'Verde-claro', hex: '#E0F7F1' },
    { name: 'Índigo', hex: '#4F46E5' },
    { name: 'Violeta', hex: '#8B5CF6' },
]
export const paletteFor = type => (type === 'INCOME' ? INCOME_PALETTE : EXPENSE_PALETTE)

export const EMOJI_GROUPS = [
    { name: 'Dinheiro', icon: '💰', emojis: ['💰', '💵', '💳', '🏦', '💸', '🪙', '📈', '📉', '🧾', '💼', '🎁', '🤝', '🏷️', '💎', '🧮', '📊'] },
    { name: 'Comida', icon: '🍔', emojis: ['🍔', '🍕', '🛒', '🍎', '☕', '🍺', '🍷', '🥗', '🍰', '🍜', '🥖', '🥩', '🍫', '🍿', '🧃', '🥤'] },
    { name: 'Casa', icon: '🏠', emojis: ['🏠', '🛋️', '💡', '🚿', '🔧', '🧹', '🛏️', '🪴', '📶', '🔥', '🧺', '🔌', '🔑', '🏢', '📺', '🧴'] },
    { name: 'Transporte', icon: '🚗', emojis: ['🚗', '⛽', '🚌', '🚇', '🚲', '🏍️', '✈️', '🚕', '🚆', '🛵', '🅿️', '🛣️', '⛴️', '🧳', '🗺️', '🚦'] },
    { name: 'Lazer', icon: '🎮', emojis: ['🎮', '🎬', '🎵', '🎉', '🏖️', '📚', '🎨', '⚽', '🏋️', '🎟️', '🎲', '🎧', '📷', '🎤', '🏕️', '🎳'] },
    { name: 'Saúde', icon: '💊', emojis: ['💊', '🩺', '🏥', '🦷', '🧘', '💪', '🩹', '👓', '🧠', '🛌', '🧬', '🌡️', '🏃', '🥦', '💉', '🩸'] },
    { name: 'Estudos e trabalho', icon: '🎓', emojis: ['🎓', '💻', '📱', '🖥️', '✏️', '📓', '🧑‍💻', '🏫', '📎', '🗂️', '⌨️', '🖨️', '🔬', '📐', '🧪', '🌐'] },
    { name: 'Outros', icon: '⭐', emojis: ['🐶', '🐱', '👶', '👕', '👟', '💄', '🛍️', '🎂', '❤️', '⭐', '🌱', '🧸', '📦', '✂️', '🙏', '🔔'] },
]

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
export const formatMoney = cents => brl.format(cents / 100)

export const MAX_AMOUNT_CENTS = 1_000_000_000

const brlCompact = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1,
})

export const formatCenter = cents =>
    Math.abs(cents) >= 100_000_000 ? brlCompact.format(cents / 100) : formatMoney(cents)

export function parseMoney(text) {
    const s = text.replace(/[^\d.,]/g, '')
    if (!s) return null

    const idx = Math.max(s.lastIndexOf(','), s.lastIndexOf('.'))
    const decimals = idx >= 0 ? s.length - idx - 1 : 0

    let intDigits
    let decDigits = ''
    if (idx >= 0 && decimals >= 1 && decimals <= 2) {
        intDigits = s.slice(0, idx).replace(/[.,]/g, '')
        decDigits = s.slice(idx + 1)
    } else {
        intDigits = s.replace(/[.,]/g, '')
    }

    const cents = Number(intDigits || '0') * 100 + Number(decDigits.padEnd(2, '0') || '0')
    return Number.isFinite(cents) && cents > 0 ? cents : null
}

export function summarize(transactions) {
    let income = 0
    let expense = 0
    for (const t of transactions) {
        if (t.type === 'INCOME') income += t.amountCents
        else expense += t.amountCents
    }
    return { income, expense, balance: income - expense }
}

export function buildSegments(transactions) {
    const slices = new Map()

    for (const t of transactions) {
        const key = `${t.type}-${t.category ? t.category.id : 'none'}`
        const slice = slices.get(key) ?? {
            key,
            label: t.category?.name ?? (t.type === 'INCOME' ? 'Receitas' : 'Gastos'),
            value: 0,
            color: t.category?.color ?? (t.type === 'INCOME' ? INCOME_COLOR : EXPENSE_COLOR),
        }
        slice.value += t.amountCents
        slices.set(key, slice)
    }

    // receitas primeiro, depois gastos
    return [...slices.values()].sort(
        (a, b) => (a.key.startsWith('INCOME') ? 0 : 1) - (b.key.startsWith('INCOME') ? 0 : 1)
    )
}

// meses no formato "2026-10"
export const toMonthKey = date =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

export function shiftMonth(key, delta) {
    const [year, month] = key.split('-').map(Number)
    return toMonthKey(new Date(year, month - 1 + delta, 1))
}

export function monthLabel(key) {
    const [year, month] = key.split('-').map(Number)
    const text = new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
    })
    return text.charAt(0).toUpperCase() + text.slice(1)
}

export function maskMoney(text) {
    const digits = text.replace(/\D/g, '').replace(/^0+/, '')
    if (!digits) return ''

    const padded = digits.padStart(3, '0')
    const integer = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    return `${integer},${padded.slice(-2)}`
}