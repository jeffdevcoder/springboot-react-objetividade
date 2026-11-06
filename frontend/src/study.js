export const STUDY_PALETTE = [
    { name: 'Vermelho', hex: '#EF4444' },
    { name: 'Laranja', hex: '#EA580C' },
    { name: 'Âmbar', hex: '#F59E0B' },
    { name: 'Lima', hex: '#65A30D' },
    { name: 'Floresta', hex: '#15803D' },
    { name: 'Esmeralda', hex: '#10B981' },
    { name: 'Ciano', hex: '#06B6D4' },
    { name: 'Azul', hex: '#3B82F6' },
    { name: 'Índigo', hex: '#4F46E5' },
    { name: 'Violeta', hex: '#8B5CF6' },
    { name: 'Magenta', hex: '#D946EF' },
    { name: 'Rosa', hex: '#EC4899' },
    { name: 'Marrom', hex: '#A0522D' },
    { name: 'Cinza', hex: '#6B7280' },
]

export const toIso = date => date.toLocaleDateString('en-CA')

export function fromIso(iso) {
    const [year, month, day] = iso.split('-').map(Number)
    return new Date(year, month - 1, day)
}

export function formatDuration(seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h > 0) return `${h}h ${m}min`
    if (m > 0) return `${m}min`
    return seconds > 0 ? `${seconds}s` : '0min'
}

export function periodRange(period, anchor) {
    const d = fromIso(anchor)
    if (period === 'day') return { from: anchor, to: anchor }
    if (period === 'week') {
        const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7))
        const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6)
        return { from: toIso(start), to: toIso(end) }
    }
    return {
        from: toIso(new Date(d.getFullYear(), d.getMonth(), 1)),
        to: toIso(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
    }
}

export function shiftAnchor(period, anchor, delta) {
    const d = fromIso(anchor)
    if (period === 'month') return toIso(new Date(d.getFullYear(), d.getMonth() + delta, 1))
    d.setDate(d.getDate() + (period === 'week' ? 7 : 1) * delta)
    return toIso(d)
}

const cap = text => text.charAt(0).toUpperCase() + text.slice(1)

export function periodLabel(period, anchor) {
    const d = fromIso(anchor)
    if (period === 'day') {
        return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    }
    if (period === 'week') {
        const { from, to } = periodRange(period, anchor)
        const f = iso => fromIso(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        return `${f(from)} – ${f(to)}`
    }
    return cap(d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }))
}