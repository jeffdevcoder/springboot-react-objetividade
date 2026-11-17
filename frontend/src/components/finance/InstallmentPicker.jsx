import { useEffect } from 'react'
import { usePopoverPosition } from '../../usePopoverPosition'

export const MAX_INSTALLMENTS = 420
const OPTIONS = Array.from({ length: MAX_INSTALLMENTS - 1 }, (_, i) => i + 2)

export default function InstallmentPicker({ value, min = 2, allowNone = true, onSelect, onClose }) {
    const [popRef, popStyle] = usePopoverPosition(allowNone)

    useEffect(() => {
        const onKey = e => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
            }
        }
        window.addEventListener('keydown', onKey, true)
        return () => window.removeEventListener('keydown', onKey, true)
    }, [onClose])

    return (
        <>
            <div className="calendar-backdrop" onMouseDown={onClose} />

            <div
                ref={popRef}
                className="emoji-pop installment-pop"
                style={popStyle}
                role="dialog"
                aria-label="Escolher número de parcelas"
            >
                <p className="emoji-group-name">Parcelas</p>

                {allowNone && (
                    <button
                        type="button"
                        className={`emoji-item installment-none ${value <= 1 ? 'is-selected' : ''}`}
                        onClick={() => onSelect(1)}
                    >
                        Sem fim
                    </button>
                )}

                <div className="installment-grid">
                    {OPTIONS.map(n => (
                        <button
                            key={n}
                            type="button"
                            disabled={n < min}
                            className={`emoji-item installment-item ${n === value ? 'is-selected' : ''}`}
                            onClick={() => onSelect(n)}
                        >
                            {n}x
                        </button>
                    ))}
                </div>
            </div>
        </>
    )
}