import { useTheme } from '../ThemeContext'

export default function Logo() {
    const { theme } = useTheme()

    return (
        <img
            className="brand-logo"
            src={theme === 'dark' ? '/logo-noturno.png' : '/logo-claro.png'}
            alt=""
            width="28"
            height="28"
        />
    )
}