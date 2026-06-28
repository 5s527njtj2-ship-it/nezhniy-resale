import { useState } from 'react'
import { apiFetch } from '../api.js'
import './BookingModal.css'

export default function BookingModal({ cart, onClose, onSuccess }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) {
      setError('Укажите имя и номер телефона')
      return
    }
    setLoading(true)
    setError('')
    try {
      await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          buyer_name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim(),
          arts: cart.map(i => i.art),
        }),
      })
      onSuccess()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const arts = cart.map(i => i.art).join(', ')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Связаться с магазином</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-arts">
          <span>Вещи:</span> <span className="arts-list">{arts}</span>
        </div>

        <div className="booking-notice">
          ⏱ Вещи бронируются на 1 час перед личной встречей, либо на срок по индивидуальной договорённости с продавцом.
        </div>

        <div className="modal-body">
          <label>
            <span>Ваше имя *</span>
            <input
              type="text"
              placeholder="Анна"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
          <label>
            <span>Телефон *</span>
            <input
              type="tel"
              placeholder="+7 900 000 00 00"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </label>
          <label>
            <span>Комментарий</span>
            <textarea
              placeholder="Хочу примерить, удобное время для встречи…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
            />
          </label>

          {error && <div className="modal-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Отмена</button>
          <button className="btn-submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Отправляем…' : 'Отправить заявку'}
          </button>
        </div>
      </div>
    </div>
  )
}
