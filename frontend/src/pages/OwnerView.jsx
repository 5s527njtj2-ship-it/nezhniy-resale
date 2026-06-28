import { useState, useEffect, useRef } from 'react'
import { ownerFetch, apiFetch, getPhotoUrl } from '../api.js'
import { CATEGORIES, CATEGORIES_MAP, CONDITIONS, COND_COLORS, getSizesForCategory } from '../constants.js'
import './OwnerView.css'

export default function OwnerView() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState('items') // 'items' | 'orders'

  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [filterCat, setFilterCat] = useState('all')
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Форма добавления
  const [form, setForm] = useState({ name: '', category: 'top', size: 'M', price: '', condition: 'Отличное' })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newOrdersNotice, setNewOrdersNotice] = useState(0)
  const fileRef = useRef()

  async function login() {
    setAuthError('')
    try {
      await apiFetch('/auth/check', { method: 'POST', body: JSON.stringify({ password }) })
      setAuthed(true)
      loadAll(true)
    } catch {
      setAuthError('Неверный пароль')
    }
  }

  async function loadAll(isInitialLogin = false) {
    setLoading(true)
    try {
      const [itemsData, ordersData, statsData] = await Promise.all([
        ownerFetch('/items', {}, password),
        ownerFetch('/orders', {}, password),
        ownerFetch('/stats', {}, password),
      ])
      setItems(itemsData)
      setOrders(ordersData)
      setStats(statsData)
      if (isInitialLogin && statsData.unviewedOrders > 0) {
        setNewOrdersNotice(statsData.unviewedOrders)
      }
    } catch (e) {
      showToast(e.message)
    } finally {
      setLoading(false)
    }
  }

  function showToast(msg, type = 'error') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleAddItem(e) {
    e.preventDefault()
    if (!form.name || !form.price) { showToast('Заполните название и цену'); return }
    setAdding(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      if (photoFile) fd.append('photo', photoFile)

      const res = await fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/items` : '/api/items', {
        method: 'POST',
        headers: { 'x-owner-password': password },
        body: fd,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const item = await res.json()

      setItems(prev => [item, ...prev])
      setStats(prev => ({ ...prev, totalItems: (prev.totalItems||0)+1, totalSum: (prev.totalSum||0)+item.price }))
      setForm({ name: '', category: form.category, size: form.size, price: '', condition: form.condition })
      setPhotoFile(null)
      setPhotoPreview(null)
      if (fileRef.current) fileRef.current.value = ''
      showToast(`Добавлено: ${item.art}`, 'success')
    } catch (e) {
      showToast(e.message)
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(id) {
    const item = items.find(i => i.id === id)
    if (!window.confirm(`Удалить "${item?.name}"?`)) return
    try {
      await ownerFetch(`/items/${id}`, { method: 'DELETE' }, password)
      setItems(prev => prev.filter(i => i.id !== id))
      setStats(prev => ({ ...prev, totalItems: (prev.totalItems||1)-1, totalSum: (prev.totalSum||0)-item.price }))
      showToast('Удалено', 'success')
    } catch (e) {
      showToast(e.message)
    }
  }

  async function handleDeleteOrder(id) {
    if (!window.confirm('Удалить эту заявку?')) return
    try {
      await ownerFetch(`/orders/${id}`, { method: 'DELETE' }, password)
      setOrders(prev => prev.filter(o => o.id !== id))
      setStats(prev => ({ ...prev, totalOrders: Math.max((prev.totalOrders||1)-1, 0) }))
      showToast('Заявка удалена', 'success')
    } catch (e) {
      showToast(e.message)
    }
  }

  async function handleOpenOrdersTab() {
    setTab('orders')
    setNewOrdersNotice(0)
    if (stats.unviewedOrders > 0) {
      try {
        await ownerFetch('/orders/mark-viewed', { method: 'POST' }, password)
        setStats(prev => ({ ...prev, unviewedOrders: 0 }))
      } catch {
        // тихо игнорируем — не критично, если отметка не прошла
      }
    }
  }

  function exportCSV(type) {
    const base = import.meta.env.VITE_API_URL || '/api'
    const url = `${base}/export/${type}`
    const a = document.createElement('a')
    a.href = url
    a.setAttribute('download', '')
    // Передаём пароль через заголовок невозможно через <a>, используем fetch
    fetch(url, { headers: { 'x-owner-password': password } })
      .then(r => r.blob())
      .then(blob => {
        const objUrl = URL.createObjectURL(blob)
        a.href = objUrl
        a.download = type === 'catalog' ? 'nezhniy_resale_catalog.csv' : 'nezhniy_resale_orders.csv'
        a.click()
        URL.revokeObjectURL(objUrl)
      })
      .catch(e => showToast(e.message))
  }

  const filteredItems = items.filter(i => filterCat === 'all' || i.category === filterCat)

  // ── AUTH SCREEN ──
  if (!authed) {
    return (
      <div className="owner-auth">
        <div className="auth-card">
          <div className="auth-icon">🔐</div>
          <h2>Панель владельца</h2>
          <p>Нежный Ресейл</p>
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && login()}
          />
          {authError && <div className="auth-error">{authError}</div>}
          <button className="auth-btn" onClick={login}>Войти</button>
        </div>
      </div>
    )
  }

  // ── OWNER PANEL ──
  return (
    <div className="owner-view">
      {newOrdersNotice > 0 && (
        <div className="new-orders-banner" onClick={handleOpenOrdersTab}>
          🔔 {newOrdersNotice === 1
            ? 'Появилась новая заявка'
            : `Появилось ${newOrdersNotice} новых заявок`} — нажмите, чтобы посмотреть
        </div>
      )}

      {/* Статистика */}
      <div className="stats-row">
        <div className="stat">
          <div className="stat-num">{stats.totalItems ?? 0}</div>
          <div className="stat-label">Товаров</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.totalOrders ?? 0}</div>
          <div className="stat-label">Заявок</div>
        </div>
        <div className="stat">
          <div className="stat-num">{(stats.totalSum ?? 0).toLocaleString('ru-RU')}</div>
          <div className="stat-label">Сумма ₽</div>
        </div>
      </div>

      {/* Табы */}
      <div className="owner-tabs">
        <button className={tab === 'items' ? 'active' : ''} onClick={() => setTab('items')}>Товары</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => handleOpenOrdersTab()}>
          Заявки
          {stats.unviewedOrders > 0 && <span className="tab-badge">{stats.unviewedOrders}</span>}
        </button>
      </div>

      {/* ── ТОВАРЫ ── */}
      {tab === 'items' && (
        <>
          {/* Форма добавления */}
          <div className="add-card">
            <h3>Добавить вещь</h3>
            <form onSubmit={handleAddItem}>
              {/* Фото */}
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
                  <input type="text" placeholder="Пальто Zara" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
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
                  <input type="number" placeholder="1500" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} required min="1" />
                </div>
                <div className="form-group full">
                  <label>Состояние</label>
                  <select value={form.condition} onChange={e => setForm(f => ({...f, condition: e.target.value}))}>
                    {CONDITIONS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <button type="submit" className="add-submit-btn" disabled={adding}>
                {adding ? 'Добавляем…' : 'Добавить товар'}
              </button>
            </form>
          </div>

          {/* Список + экспорт */}
          <div className="items-header">
            <span className="items-title">Все товары ({items.length})</span>
            <button className="export-btn" onClick={() => exportCSV('catalog')}>⬇ Excel</button>
          </div>

          {/* Фильтр категорий */}
          <div className="cat-scroll-owner">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                className={`cat-chip-sm ${filterCat === cat.id ? 'active' : ''}`}
                onClick={() => setFilterCat(cat.id)}
              >
                {cat.emoji} {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-hint)' }}>Загрузка…</div>
          ) : filteredItems.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-hint)' }}>Нет товаров</div>
          ) : (
            <div className="items-list">
              {filteredItems.map(item => {
                const photoUrl = getPhotoUrl(item.photo)
                const cat = CATEGORIES_MAP[item.category]
                const condStyle = COND_COLORS[item.condition] || {}
                return (
                  <div key={item.id} className="owner-item">
                    <div className="owner-item-photo">
                      {photoUrl ? <img src={photoUrl} alt={item.name} /> : <span>{cat?.emoji}</span>}
                    </div>
                    <div className="owner-item-info">
                      <div className="owner-item-name">{item.name}</div>
                      <div className="owner-item-meta">
                        <span className="art">{item.art}</span>
                        <span className="badge-cat">{cat?.emoji} {cat?.label}</span>
                        {item.size !== '—' && <span className="badge-size">{item.size}</span>}
                        <span className="badge-cond" style={{ background: condStyle.bg, color: condStyle.color }}>{item.condition}</span>
                      </div>
                      <div className="owner-item-date">{item.created_at}</div>
                    </div>
                    <div className="owner-item-right">
                      <div className="owner-item-price">{item.price.toLocaleString('ru-RU')} ₽</div>
                      <button className="delete-btn" onClick={() => handleDelete(item.id)}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── ЗАЯВКИ ── */}
      {tab === 'orders' && (
        <>
          <div className="items-header">
            <span className="items-title">Заявки ({orders.length})</span>
            <button className="export-btn" onClick={() => exportCSV('orders')}>⬇ Excel</button>
          </div>
          {orders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-hint)' }}>Заявок пока нет</div>
          ) : (
            <div className="orders-list">
              {orders.map(order => (
                <div key={order.id} className="order-card">
                  <div className="order-top">
                    <div>
                      <div className="order-name">{order.buyer_name}</div>
                      <a href={`tel:${order.phone}`} className="order-phone">📞 {order.phone}</a>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                      <div className="order-date">{order.created_at}</div>
                      <button className="delete-btn" onClick={() => handleDeleteOrder(order.id)}>🗑</button>
                    </div>
                  </div>
                  <div className="order-arts">Артикулы: <span>{order.arts}</span></div>
                  <div className="order-total">{order.total.toLocaleString('ru-RU')} ₽</div>
                  {order.comment && <div className="order-comment">💬 {order.comment}</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {toast && <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>{toast.msg}</div>}
    </div>
  )
}
