import { daysUntil } from './notes'

export { formatDate } from './notes'

export function deadlineLabel(iso) {
    const n = daysUntil(iso)
    if (n === 0) return 'O prazo é hoje'
    if (n === 1) return 'Falta 1 dia'
    if (n > 1) return `Faltam ${n} dias`
    if (n === -1) return 'Venceu ontem'
    return `Venceu há ${-n} dias`
}

export const sortGoals = list => [...list].sort((a, b) => {
    if (!a.achievedOn !== !b.achievedOn) return a.achievedOn ? 1 : -1
    if (!a.achievedOn) return a.deadline.localeCompare(b.deadline) || b.id - a.id
    return b.achievedOn.localeCompare(a.achievedOn) || b.id - a.id
})

export const MAX_STEPS = 20

export const progress = steps =>
    steps.length ? Math.round((steps.filter(s => s.done).length / steps.length) * 100) : 0
