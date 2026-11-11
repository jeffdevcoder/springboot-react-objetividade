import { useEffect, useLayoutEffect, useRef } from 'react'
import { AVATARS, avatarSrc } from '../avatars'

// Carrossel de fotos de perfil: a foto que fica no centro é a selecionada.
// Desktop: setas, roda do mouse/trackpad ou arrastar com o mouse. Celular: arrastar com o dedo.
export default function AvatarCarousel({ user, value, onChange }) {
    const items = [{ file: null, name: 'Sem foto' }, ...AVATARS]
    const index = Math.max(items.findIndex(i => i.file === (value ?? null)), 0)
    const trackRef = useRef(null)
    const drag = useRef(null)
    const settle = useRef(0)
    // true enquanto a rolagem foi iniciada pelo código (seta/clique): não deve alterar a seleção
    const auto = useRef(false)

    // distância (px) entre o centro da foto i e o centro visível da faixa
    function offsetOf(i) {
        const track = trackRef.current
        const el = track?.children[i]
        if (!el) return 0
        const t = track.getBoundingClientRect()
        const r = el.getBoundingClientRect()
        return r.left + r.width / 2 - (t.left + t.width / 2)
    }

    function scrollTo(i, smooth = true) {
        const track = trackRef.current
        if (!track) return
        const left = track.scrollLeft + offsetOf(i)
        if (Math.abs(left - track.scrollLeft) < 1) return
        if (smooth) auto.current = true
        track.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' })
    }

    function nearest() {
        const track = trackRef.current
        let best = 0
        let dist = Infinity
        for (let i = 0; i < track.children.length; i++) {
            const d = Math.abs(offsetOf(i))
            if (d < dist) { dist = d; best = i }
        }
        return best
    }

    // ao abrir, centraliza a foto atual sem animação
    useLayoutEffect(() => {
        scrollTo(index, false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => () => clearTimeout(settle.current), [])

    function onScroll() {
        if (drag.current) return
        clearTimeout(settle.current)
        settle.current = setTimeout(() => {
            if (auto.current) {
                auto.current = false
                return
            }
            const i = nearest()
            if (items[i].file !== (value ?? null)) onChange(items[i].file)
        }, 120)
    }

    function step(dir) {
        const i = Math.min(Math.max(index + dir, 0), items.length - 1)
        onChange(items[i].file)
        scrollTo(i)
    }

    // arrastar com o mouse (no toque o navegador já faz a rolagem nativa)
    function onPointerDown(e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return
        auto.current = false
        drag.current = { x: e.clientX, left: trackRef.current.scrollLeft, moved: false }
        trackRef.current.classList.add('is-dragging')
    }

    function onPointerMove(e) {
        const d = drag.current
        if (!d) return
        const dx = e.clientX - d.x
        if (Math.abs(dx) > 4) d.moved = true
        trackRef.current.scrollLeft = d.left - dx
    }

    function endDrag() {
        const d = drag.current
        if (!d) return
        drag.current = null
        trackRef.current.classList.remove('is-dragging')
        if (d.moved) {
            const i = nearest()
            onChange(items[i].file)
            scrollTo(i)
            // impede que o clique ao soltar selecione outra foto
            const block = ev => { ev.stopPropagation(); ev.preventDefault() }
            trackRef.current.addEventListener('click', block, { capture: true, once: true })
            setTimeout(() => trackRef.current?.removeEventListener('click', block, { capture: true }), 0)
        }
    }

    function onKeyDown(e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1) }
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1) }
    }

    return (
        <div className="avatar-carousel">
            <button
                type="button"
                className="avatar-arrow"
                aria-label="Foto anterior"
                disabled={index === 0}
                onClick={() => step(-1)}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 18l-6-6 6-6" />
                </svg>
            </button>

            <div
                ref={trackRef}
                className="avatar-track"
                role="listbox"
                aria-label="Foto de perfil"
                tabIndex={0}
                onScroll={onScroll}
                onTouchStart={() => { auto.current = false }}
                onWheel={() => { auto.current = false }}
                onKeyDown={onKeyDown}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={endDrag}
                onPointerLeave={endDrag}
                onPointerCancel={endDrag}
            >
                {items.map((item, i) => (
                    <button
                        key={item.file ?? 'none'}
                        type="button"
                        role="option"
                        aria-selected={i === index}
                        aria-label={item.name}
                        title={item.name}
                        tabIndex={-1}
                        className={`avatar-option ${i === index ? 'is-selected' : ''}`}
                        onClick={() => {
                            onChange(item.file)
                            scrollTo(i)
                        }}
                    >
                        {item.file ? (
                            <img src={avatarSrc(item.file)} alt="" draggable="false" loading="lazy" />
                        ) : (
                            <span className="avatar-initial">{user?.name?.charAt(0).toUpperCase()}</span>
                        )}
                    </button>
                ))}
            </div>

            <button
                type="button"
                className="avatar-arrow"
                aria-label="Próxima foto"
                disabled={index === items.length - 1}
                onClick={() => step(1)}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18l6-6-6-6" />
                </svg>
            </button>

            <p className="avatar-caption">{items[index].name}</p>
        </div>
    )
}
