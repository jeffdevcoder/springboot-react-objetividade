import checkSound from './assets/checkmark_clean.wav'

const checkAudio = new Audio(checkSound)
checkAudio.preload = 'auto'
checkAudio.volume = 0.5

export function playCheck() {
    checkAudio.currentTime = 0
    checkAudio.play().catch(() => {})
}
