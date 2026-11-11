import { avatarSrc } from '../avatars'

// Foto de perfil escolhida ou, sem foto, a inicial do nome.
export default function Avatar({ user, className }) {
    if (user?.avatar) {
        return <img className={`${className} is-photo`} src={avatarSrc(user.avatar)} alt="" draggable="false" />
    }
    return (
        <span className={className} aria-hidden="true">
            {user?.name?.charAt(0).toUpperCase()}
        </span>
    )
}
