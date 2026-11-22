import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { tagHex } from '../tagColors'
import FilterMenu from './FilterMenu'

const ALL = 'all'

// filtro de "Minhas tarefas": escolher uma tag mostra só as tarefas com ela
export default function TagFilter({ value, onChange }) {
    const [tags, setTags] = useState([])

    // recarrega ao montar e ao abrir, para refletir tags criadas/editadas/excluídas
    const load = useCallback(() => {
        api('/tags')
            .then(list => {
                setTags(list)
                if (!value) return
                const fresh = list.find(t => t.id === value.id)
                if (!fresh) onChange(null)
                else if (fresh.name !== value.name || fresh.color !== value.color) onChange(fresh)
            })
            .catch(() => {})
    }, [value, onChange])

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(load, [])

    // enquanto a lista não chega, a tag salva já aparece no botão
    const list = value && !tags.some(t => t.id === value.id) ? [...tags, value] : tags

    const options = [
        { key: ALL, label: 'Todas as tarefas' },
        ...list.map((t, i) => ({
            key: t.id,
            label: t.name,
            color: tagHex(t.color) ?? 'var(--color-text)',
            divider: i === 0,
        })),
    ]

    return (
        <FilterMenu
            options={options}
            value={value?.id ?? ALL}
            onChange={key => onChange(key === ALL ? null : list.find(t => t.id === key))}
            placeholder="Tags"
            emptyText={list.length === 0 ?'Você ainda não criou nenhuma tag.' : null}
            onOpen={load}
        />
    )
}
