import { useCallback, useState } from 'react'
import Calendar from './Calendar'

const todayIso = () => new Date().toLocaleDateString('en-CA')
const formatBR = iso => iso.split('-').reverse().join('/')

export default function DateField({
                                      value,
                                      onChange,
                                      min,
                                      disabled = false,
                                      align = 'left',
                                      placeholder = 'Escolher data',
                                  }) {
    const [open, setOpen] = useState(false)
    const close = useCallback(() => setOpen(false), [])

    return (
        <>
            <button
                type="button"
                className={`form-input date-field ${value ? '' : 'is-empty'}`}
                disabled={disabled}
                onClick={() => setOpen(o => !o)}
                aria-haspopup="dialog"
                aria-expanded={open}
            >
                <span>{value ? formatBR(value) : placeholder}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
            </button>

            {open && (
                <Calendar
                    value={value}
                    min={min}
                    today={todayIso()}
                    align={align}
                    onSelect={iso => {
                        onChange(iso)
                        close()
                    }}
                    onClose={close}
                />
            )}
        </>
    )
}