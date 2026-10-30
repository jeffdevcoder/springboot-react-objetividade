export const INCOME_COLOR = '#10B981'  // verde (receitas)
export const EXPENSE_COLOR = '#EF4444' // coral (gastos, por enquanto uma cor só)

export const WARM_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EC4899',
    '#E11D48', '#EA580C', '#FB7185', '#FBBF24',
]

export const CATEGORY_COLORS = [
    { name: 'Vermelho Coral', hex: '#EF4444' },
    { name: 'Laranja', hex: '#EA580C' },
    { name: 'Amarelo Âmbar', hex: '#F59E0B' },
    { name: 'Rosa', hex: '#EC4899' },
    { name: 'Carmim', hex: '#BE123C' },
    { name: 'Marrom', hex: '#A0522D' },
    { name: 'Magenta', hex: '#D946EF' },
    { name: 'Verde Limão', hex: '#65A30D' },
    { name: 'Verde Floresta', hex: '#15803D' },
    { name: 'Verde Esmeralda', hex: '#10B981' },
    { name: 'Ciano', hex: '#06B6D4' },
    { name: 'Azul Royal', hex: '#3B82F6' },
    { name: 'Violeta', hex: '#8B5CF6' },
    { name: 'Cinza', hex: '#6B7280' },
]

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

// "1.234,56", "1234,5", "12.50" ou "R$ 30" -> centavos (nulo se inválido)
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

export function buildSegments({ income }, transactions) {
    const byCategory = new Map()

    for (const t of transactions) {
        if (t.type !== 'EXPENSE') continue
        const key = t.category ? `c${t.category.id}` : 'none'
        const slice = byCategory.get(key) ?? {
            key,
            label: t.category?.name ?? 'Sem categoria',
            value: 0,
            color: t.category?.color ?? EXPENSE_COLOR,
        }
        slice.value += t.amountCents
        byCategory.set(key, slice)
    }

    return [
        { key: 'income', label: 'Receitas', value: income, color: INCOME_COLOR },
        ...byCategory.values(),
    ]
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