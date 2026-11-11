const DAY = 86_400_000

function parse(iso) {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
}

// dias de hoje até a data (negativo = já passou)
export function daysUntil(iso, today = new Date()) {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    return Math.round((parse(iso) - base) / DAY)
}

export function countdown(iso) {
    const n = daysUntil(iso)
    if (n === 0) return 'É hoje'
    if (n === 1) return 'Falta 1 dia'
    if (n > 1) return `Faltam ${n} dias`
    if (n === -1) return 'Foi ontem'
    return `Passou há ${-n} dias`
}

export const formatDate = iso => iso.split('-').reverse().join('/')
