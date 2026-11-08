function getCookie(name) {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? decodeURIComponent(match[2]) : null
}

export async function api(path, { method = 'GET', body } = {}) {
    const headers = { 'Content-Type': 'application/json' }

    if (method !== 'GET') {
        if (!getCookie('XSRF-TOKEN')) {
            await fetch('/api/auth/csrf', { credentials: 'include' })
        }
        headers['X-XSRF-TOKEN'] = getCookie('XSRF-TOKEN')
    }

    const res = await fetch(`/api${path}`, {
        method,
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
    })

    const data = res.status === 204 ? null : await res.json().catch(() => null)

    if (!res.ok) {
        const error = new Error(data?.message || 'Erro na requisição')
        error.status = res.status
        throw error
    }
    return data
}