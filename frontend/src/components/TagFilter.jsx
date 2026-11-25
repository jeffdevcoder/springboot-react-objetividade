import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { tagHex } from '../tagColors'
import FilterMenu from './FilterMenu'

const ALL = 'all'

export default function TagFilter({ value, onChange }) {
    const [tags, setTags] = useState([])

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

    useEffect(load, [])

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
