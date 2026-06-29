import { useState } from 'react'
import { apiFetch } from '../api.js'
import './BookingModal.css'

export default function BookingModal({ cart, onClose, onSuccess, telegramId }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmedOrder, setConfirmedOrder] = useState(null)

  async function handleSubmit() {
    if (!name.trim() || !phone.trim()) {
      setError('Укажите имя и номер телефона')
      return
    }
    setLoading(true)
    setError('')
    try {
      const order = await apiFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          buyer_name: name.trim(),
          phone: phone.trim(),
          comment: comment.trim(),
          arts: cart.map(i => i.art),
          telegram_id: telegramId,
        }),
      })
      setConfirmedOrder(order)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleDone() {
    onSuccess()
  }

  const arts = cart.map(i => i.art).join(', ')

  // ── ЭКРАН ПОДТВЕРЖДЕНИЯ ПОСЛЕ ОТПРАВКИ ──
  if (confirmedOrder) {
    const numberLabel = confirmedOrder.order_number
      ? `№${String(confirmedOrder.order_number).padStart(4, '0')}`
      : ''
    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && handleDone()}>
        <div className="modal">
          <div className="modal-header">
            <h3>Заявка отправлена</h3>
            <button className="modal-close" onClick={handleDone}>✕</button>
          </div>

          <div className="confirm-body">
            <div className="confirm-icon">✅</div>
            <div className="confirm-number">Заявка {numberLabel}</div>
            <div className="confirm-sub">Магазин свяжется с вами в ближайшее время</div>

            <div className="confirm-items">
              {cart.map(item => (
                <div className="confirm-item-row" key={item.id}>
                  <span className="confirm-item-art">{item.art}</span>
                  <span className="confirm-item-name">{item.name}</span>
                  <span className="confirm-item-price">{item.price.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>

            <div className="confirm-total">
              <span>Итого</span>
              <span>{cart.reduce((s, i) => s + i.price, 0).toLocaleString('ru-RU')} ₽</span>
            </div>

            <div className="confirm-notice">
              Сохраните номер заявки {numberLabel} — он понадобится при обращении в магазин
            </div>
          </div>

          <div className="modal-footer">
            <button className="btn-submit" onClick={handleDone} style={{ flex: 1 }}>Готово</button>
          </div>
        </div>
      </div>
    )
  }

  // ── ФОРМА ЗАЯВКИ ──
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
