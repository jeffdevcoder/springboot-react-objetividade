import { useEffect, useState } from 'react'

const SIZE = 200
const STROKE = 22
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const GAP = 3

export default function DonutChart({ segments, centerLabel, centerValue, centerHint, negative = false }) {
    const [ready, setReady] = useState(false)

    // começa vazio e preenche no primeiro quadro, para animar a entrada
    useEffect(() => {
        const id = requestAnimationFrame(() => setReady(true))
        return () => cancelAnimationFrame(id)
    }, [])

    const total = segments.reduce((sum, s) => sum + s.value, 0)
    const visibleCount = segments.filter(s => s.value > 0).length

    const arcs = []
    let start = 0
    for (const seg of segments) {
        const length = total > 0 ? (seg.value / total) * CIRCUMFERENCE : 0
        arcs.push({ ...seg, length, start })
        start += length
    }

    const description = total > 0
        ? segments.map(s => `${s.label}: ${Math.round((s.value / total) * 100)}%`).join(', ')
        : 'Sem lançamentos neste mês'

    return (
        <div className="donut-wrap">
            <svg className="donut" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={description}>
                <circle className="donut-track" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} strokeWidth={STROKE} />

                <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
                    {arcs.map(arc => {
                        const drawn = ready && arc.length > 0
                            ? Math.max(arc.length - (visibleCount > 1 ? GAP : 0), 0.5)
                            : 0
                        return (
                            <circle
                                key={arc.key}
                                className="donut-seg"
                                cx={SIZE / 2}
                                cy={SIZE / 2}
                                r={RADIUS}
                                stroke={arc.color}
                                strokeWidth={STROKE}
                                strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
                                strokeDashoffset={-arc.start}
                            />
                        )
                    })}
                </g>
            </svg>

            <div className="donut-center">
                <span className="donut-label">{centerLabel}</span>
                <strong
                    className={`donut-value ${negative ? 'is-negative' : ''}`}
                    style={{ fontSize: centerValue.length > 12 ? 16 : 20 }}
                >
                    {centerValue}
                </strong>
                {centerHint && <span className="donut-hint">{centerHint}</span>}
            </div>
        </div>
    )
}