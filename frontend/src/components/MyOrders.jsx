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

export default function MyOrders({ telegramId }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          </div>
        )
      })}
    </div>
  )
}
