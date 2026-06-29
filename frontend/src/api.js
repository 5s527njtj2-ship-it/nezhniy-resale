const BASE = import.meta.env.VITE_API_URL || '/api'

export async function apiFetch(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Ошибка ${res.status}`)
  }
  return res.json()
}

export function ownerFetch(path, options = {}, password) {
  return apiFetch(path, {
    ...options,
    headers: {
      ...options.headers,
      'x-owner-password': password,
    },
  })
}

export function getPhotoUrl(photo) {
  if (!photo) return null
  // photo уже содержит полный URL из Supabase Storage — возвращаем как есть
  if (photo.startsWith('http://') || photo.startsWith('https://')) return photo
  // обратная совместимость со старой схемой локальных файлов (если где-то осталась)
  const base = import.meta.env.VITE_API_URL?.replace('/api', '') || ''
  return `${base}/uploads/${photo}`
}
