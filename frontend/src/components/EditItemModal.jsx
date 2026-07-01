import { useState, useRef } from 'react'
import { CATEGORIES, CONDITIONS, getSizesForCategory } from '../constants.js'
import { normalizePhoto } from '../photoUtils.js'
import './EditItemModal.css'

export default function EditItemModal({ item, password, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item.name,
    category: item.category,
    size: item.size,
    price: item.price,
    old_price: item.old_price || '',
    condition: item.condition,
  })
  // Существующие фото товара (полные URL) — можно убирать по одному
  const [existingPhotos, setExistingPhotos] = useState(item.photos && item.photos.length ? item.photos : (item.photo ? [item.photo] : []))
  const [newFiles, setNewFiles] = useState([])
  const [newPreviews, setNewPreviews] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  function handlePhotoChange(e) {
    const totalSlots = 6 - existingPhotos.length
    const files = Array.from(e.target.files).slice(0, Math.max(totalSlots, 0))
    if (!files.length) return
    setNewFiles(files)
    setNewPreviews(files.map(f => URL.createObjectURL(f)))
  }

  function removeExistingPhoto(url) {
    setExistingPhotos(prev => prev.filter(p => p !== url))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name || !form.price) { setError('Заполните название и цену'); return }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      fd.append('keepPhotos', JSON.stringify(existingPhotos))
      const normalized = await Promise.all(newFiles.map(f => normalizePhoto(f)))
      normalized.forEach(f => fd.append('photos', f))

      const base = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${base}/items/${item.id}`, {
        method: 'PUT',
        headers: { 'x-owner-password': password },
        body: fd,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const updated = await res.json()
      onSaved(updated)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const totalPhotoCount = existingPhotos.length + newPreviews.length

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal edit-modal">
        <div className="modal-header">
          <h3>Редактировать товар</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave} className="edit-form">
          <label className="photo-edit-label">Фото ({totalPhotoCount}/6)</label>
          <div className="photo-edit-grid">
            {existingPhotos.map(url => (
              <div className="photo-edit-item" key={url}>
                <img src={url} alt="фото товара" />
                <button type="button" className="photo-remove-btn" onClick={() => removeExistingPhoto(url)}>✕</button>
              </div>
            ))}
            {newPreviews.map((src, i) => (
              <div className="photo-edit-item" key={`new-${i}`}>
                <img src={src} alt="новое фото" />
                <span className="photo-new-tag">новое</span>
              </div>
            ))}
            {totalPhotoCount < 6 && (
              <button
                type="button"
                className="photo-add-btn"
                onClick={() => fileRef.current?.click()}
              >
                ＋
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display:'none' }} />

          <div className="form-row">
            <div className="form-group full">
              <label>Название *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
            </div>
            <div className="form-group full">
              <label>Категория</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value, size: getSizesForCategory(e.target.value)[0]}))}>
                {CATEGORIES.filter(c => c.id !== 'all').map(c => (
                  <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Размер</label>
              <select value={form.size} onChange={e => setForm(f => ({...f, size: e.target.value}))}>
                {getSizesForCategory(form.category).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Цена, ₽ *</label>
              <input type="number" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} required min="1" />
            </div>
            <div className="form-group">
              <label>Старая цена, ₽</label>
              <input type="number" placeholder="Если скидка" value={form.old_price} onChange={e => setForm(f => ({...f, old_price: e.target.value}))} min="1" />
            </div>
            <div className="form-group full">
              <label>Состояние</label>
              <select value={form.condition} onChange={e => setForm(f => ({...f, condition: e.target.value}))}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {error && <div className="modal-error">{error}</div>}

          <div className="modal-footer">
            <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-submit" disabled={saving}>
              {saving ? 'Сохраняем…' : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
