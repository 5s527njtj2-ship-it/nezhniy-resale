import { useState, useEffect } from 'react'
import { apiFetch } from '../api.js'
import './MyOrders.css'

const STATUS_COLORS = {
  'Новая':            { bg: '#F5F5F5', color: '#111111' },
  'В обработке':      { bg: '#FAEEDA', color: '#854F0B' },
  'Готово к выдаче':  { bg: '#EAF3DE', color: '#3B6D11' },
  'Завершена':        { bg: '#111111', color: '#FFFFFF' },
  'Отменена':         { bg: '#FBEAF0', color: '#993556' },
}

const CANCELABLE_STATUSES = ['Новая', 'В обработке', 'Готово к выдаче']

export default function MyOrders({ telegramId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelingId, setCancelingId] = useState(null)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!telegramId) {
        setLoading(false)
        return
      }
      try {
        const data = await apiFetch(`/orders/my?telegram_id=${telegramId}`)
        if (!cancelled) setOrders(data)
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [telegramId])

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleCancel(orderId) {
    if (!window.confirm('Отменить эту заявку? Вещи снова станут доступны для покупки.')) return
    setCancelingId(orderId)
    try {
      const base = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${base}/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: telegramId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Не удалось отменить заявку')
      }
      const updated = await res.json()
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: updated.status } : o))
      showToast('Заявка отменена')
    } catch (e) {
      showToast(e.message)
    } finally {
      setCancelingId(null)
    }
  }

  if (!telegramId) {
    return (
      <div className="my-orders-empty">
        <div className="empty-emoji">📋</div>
        <p>Заявки доступны только при открытии магазина внутри Telegram</p>
      </div>
    )
  }

  if (loading) {
    return <div className="my-orders-loading">Загрузка заявок…</div>
  }

  if (error) {
    return <div className="my-orders-loading">Ошибка: {error}</div>
  }

  if (orders.length === 0) {
    return (
      <div className="my-orders-empty">
        <div className="empty-emoji">📋</div>
        <p>У вас пока нет заявок</p>
      </div>
    )
  }

  return (
    <div className="my-orders-list">
      {orders.map(order => {
        const statusStyle = STATUS_COLORS[order.status] || STATUS_COLORS['Новая']
        const canCancel = CANCELABLE_STATUSES.includes(order.status)
        return (
          <div className="my-order-card" key={order.id}>
            <div className="my-order-top">
              <span className="my-order-number">
                №{String(order.order_number).padStart(4, '0')}
              </span>
              <span className="my-order-status" style={{ background: statusStyle.bg, color: statusStyle.color }}>
                {order.status}
              </span>
            </div>

            <div className="my-order-date">{order.created_at}</div>

            <div className="my-order-items">
              {order.items.map((item, i) => (
                <div className="my-order-item-row" key={i}>
                  <span className="my-order-item-art">{item.art}</span>
                  <span className="my-order-item-name">{item.name}</span>
                  <span className="my-order-item-price">{item.price.toLocaleString('ru-RU')} ₽</span>
                </div>
              ))}
            </div>

            <div className="my-order-total">
              <span>Итого</span>
              <span>{order.total.toLocaleString('ru-RU')} ₽</span>
            </div>

            {canCancel && (
              <button
                className="my-order-cancel-btn"
                onClick={() => handleCancel(order.id)}
                disabled={cancelingId === order.id}
              >
                {cancelingId === order.id ? 'Отменяем…' : 'Отменить заявку'}
              </button>
            )}
          </div>
        )
      })}

      {toast && <div className="my-orders-toast">{toast}</div>}
    </div>
  )
}
