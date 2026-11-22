// fogos de artifício por cima da página (canvas temporário, não bloqueia cliques)
const COLORS = ['#ef4444', '#f59e0b', '#facc15', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']
const ROCKETS = 6
const DURATION = 3200 // ms até o canvas sumir

let running = false

export function launchFireworks() {
    if (running) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    running = true

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const canvas = document.createElement('canvas')
    canvas.className = 'fireworks-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    document.body.appendChild(canvas)
    const ctx = canvas.getContext('2d')

    let w = 0
    let h = 0
    const resize = () => {
        w = window.innerWidth
        h = window.innerHeight
        canvas.width = w * dpr
        canvas.height = h * dpr
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const rand = (a, b) => a + Math.random() * (b - a)
    const rockets = []
    const sparks = []

    // foguetes saem em sequência, de pontos diferentes da base da tela
    for (let i = 0; i < ROCKETS; i++) {
        rockets.push({
            delay: i * 260 + rand(0, 120),
            x: rand(w * 0.15, w * 0.85),
            y: h + 10,
            vy: -rand(h * 0.0105, h * 0.0135),
            vx: rand(-1, 1),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            launched: false,
            done: false,
        })
    }

    function explode(r) {
        const count = 70
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count + rand(-0.05, 0.05)
            const speed = rand(1.6, 4.6)
            sparks.push({
                x: r.x,
                y: r.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                decay: rand(0.011, 0.02),
                color: Math.random() < 0.25 ? '#fbbf24' : r.color,
            })
        }
    }

    const start = performance.now()
    let last = start

    function frame(now) {
        const dt = Math.min((now - last) / 16.67, 3) // em "quadros de 60fps"
        last = now
        const t = now - start

        ctx.clearRect(0, 0, w, h)
        ctx.globalCompositeOperation = 'lighter'

        for (const r of rockets) {
            if (r.done || t < r.delay) continue
            r.launched = true
            r.x += r.vx * dt
            r.y += r.vy * dt
            r.vy += 0.16 * dt
            ctx.fillStyle = r.color
            ctx.beginPath()
            ctx.arc(r.x, r.y, 2.4, 0, Math.PI * 2)
            ctx.fill()
            // explode no topo da subida
            if (r.vy >= -1.2) {
                r.done = true
                explode(r)
            }
        }

        for (let i = sparks.length - 1; i >= 0; i--) {
            const s = sparks[i]
            s.vx *= 0.985 ** dt
            s.vy = s.vy * 0.985 ** dt + 0.05 * dt
            s.x += s.vx * dt
            s.y += s.vy * dt
            s.life -= s.decay * dt
            if (s.life <= 0) {
                sparks.splice(i, 1)
                continue
            }
            ctx.globalAlpha = s.life
            ctx.fillStyle = s.color
            ctx.beginPath()
            ctx.arc(s.x, s.y, 2, 0, Math.PI * 2)
            ctx.fill()
        }
        ctx.globalAlpha = 1

        const busy = rockets.some(r => !r.done) || sparks.length > 0
        if (busy && t < DURATION + 1500) {
            requestAnimationFrame(frame)
        } else {
            window.removeEventListener('resize', resize)
            canvas.remove()
            running = false
        }
    }

    requestAnimationFrame(frame)
}
