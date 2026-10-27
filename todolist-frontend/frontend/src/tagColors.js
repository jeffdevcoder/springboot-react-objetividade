export const TAG_COLORS = [
    { key: 'DEFAULT', name: 'Padrão', hex: null },
    { key: 'RED', name: 'Vermelho Coral', hex: '#EF4444' },
    { key: 'ORANGE', name: 'Laranja', hex: '#EA580C' },
    { key: 'AMBER', name: 'Amarelo Âmbar', hex: '#F59E0B' },
    { key: 'LIME', name: 'Verde Limão', hex: '#65A30D' },
    { key: 'FOREST', name: 'Verde Floresta', hex: '#15803D' },
    { key: 'GREEN', name: 'Verde Esmeralda', hex: '#10B981' },
    { key: 'CYAN', name: 'Ciano', hex: '#06B6D4' },
    { key: 'BLUE', name: 'Azul Royal', hex: '#3B82F6' },
    { key: 'VIOLET', name: 'Violeta', hex: '#8B5CF6' },
    { key: 'MAGENTA', name: 'Magenta', hex: '#D946EF' },
    { key: 'PINK', name: 'Rosa', hex: '#EC4899' },
    { key: 'BROWN', name: 'Marrom', hex: '#A0522D' },
    { key: 'GRAY', name: 'Cinza', hex: '#6B7280' },
]
export const tagHex = key => TAG_COLORS.find(c => c.key === key)?.hex ?? null

export const tagName = key => TAG_COLORS.find(c => c.key === key)?.name ?? ''