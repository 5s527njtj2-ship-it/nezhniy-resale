import { useState, useRef } from 'react'
import { CATEGORIES, CONDITIONS, getSizesForCategory } from '../constants.js'
import { getPhotoUrl } from '../api.js'
import './EditItemModal.css'

export default function EditItemModal({ item, password, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: item.name,
    category: item.category,
    size: item.size,
    price: item.price,
    condition: item.condition,
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(getPhotoUrl(item.photo))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef()

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!form.name || !form.price) { setError('Заполните название и цену'); return }
    setSaving(true)
    setError('')
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (photoFile) fd.append('photo', photoFile)

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

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal edit-modal">
        <div className="modal-header">
          <h3>Редактировать товар</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave} className="edit-form">
          <div
            className="photo-upload"
            onClick={() => fileRef.current?.click()}
          >
            {photoPreview
              ? <img src={photoPreview} alt="preview" />
              : <div className="photo-placeholder">📷 Загрузить фото</div>
            }
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display:'none' }} />
          </div>

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
