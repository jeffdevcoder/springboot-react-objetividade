import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

function savedTheme() {
    try {
        return localStorage.getItem('theme') === 'light' ? 'light' : 'dark'
    } catch {
        return 'dark'
    }
}

export function ThemeProvider({ children }) {
    const [theme, setTheme] = useState(savedTheme)

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        try {
            localStorage.setItem('theme', theme)
        } catch {
        }
    }, [theme])

    const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'))

    return (
        <ThemeContext.Provider value={{ theme, toggle }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)