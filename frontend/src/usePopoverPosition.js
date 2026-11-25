import { useLayoutEffect, useRef, useState } from 'react'

const GAP = 8
const MARGIN = 12

export function usePopoverPosition(layoutKey) {
    const popRef = useRef(null)
    const [pos, setPos] = useState(null)

    useLayoutEffect(() => {
        const pop = popRef.current
        const anchor = pop?.parentElement
        if (!pop || !anchor) return
        const place = () => {
            const a = anchor.getBoundingClientRect()
            const w = pop.offsetWidth
            const h = pop.offsetHeight
            const below = window.innerHeight - a.bottom - GAP - MARGIN
            const top = below >= h || a.top - GAP - MARGIN < h
                ? Math.min(a.bottom + GAP, window.innerHeight - h - MARGIN)
                : a.top - GAP - h
            const left = Math.min(Math.max(a.left, MARGIN), window.innerWidth - w - MARGIN)
            setPos({ top: Math.max(top, MARGIN), left })
        }
        place()
        window.addEventListener('resize', place)
        window.addEventListener('scroll', place, true)
        return () => {
            window.removeEventListener('resize', place)
            window.removeEventListener('scroll', place, true)
        }
    }, [layoutKey])

    const style = pos ? { position: 'fixed', top: pos.top, left: pos.left } : { visibility: 'hidden' }
    return [popRef, style]
}
