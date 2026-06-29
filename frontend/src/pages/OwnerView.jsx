import { useState, useEffect, useRef } from 'react'
import { ownerFetch, apiFetch, getPhotoUrl } from '../api.js'
import { CATEGORIES, CATEGORIES_MAP, CONDITIONS, COND_COLORS, getSizesForCategory } from '../constants.js'
import EditItemModal from '../components/EditItemModal.jsx'
import SalesStats from '../components/SalesStats.jsx'
import StatusDropdown from '../components/StatusDropdown.jsx'
import './OwnerView.css'

export default function OwnerView() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState('')
  const [tab, setTab] = useState('items') // 'items' | 'orders' | 'stats'

  const [items, setItems] = useState([])
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [filterCat, setFilterCat] = useState('all')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [orderDateFilter, setOrderDateFilter] = useState('all')
  const [showSold, setShowSold] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)

  // Форма добавления
  const [form, setForm] = useState({ name: '', category: 'top', size: 'M', price: '', old_price: '', condition: 'Отличное' })
  const [photoFiles, setPhotoFiles] = useState([])
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [adding, setAdding] = useState(false)
  const [newOrdersNotice, setNewOrdersNotice] = useState(0)
  const [editingItem, setEditingItem] = useState(null)
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
        ownerFetch('/items?includeSold=true', {}, password),
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
    const files = Array.from(e.target.files).slice(0, 6)
    if (!files.length) return
    setPhotoFiles(files)
    setPhotoPreviews(files.map(f => URL.createObjectURL(f)))
  }

  async function handleAddItem(e) {
    e.preventDefault()
    if (!form.name || !form.price) { showToast('Заполните название и цену'); return }
    setAdding(true)
    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => fd.append(k, v))
      photoFiles.forEach(f => fd.append('photos', f))

      const res = await fetch(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/items` : '/api/items', {
        method: 'POST',
        headers: { 'x-owner-password': password },
        body: fd,
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      const item = await res.json()

      setItems(prev => [item, ...prev])
      setStats(prev => ({ ...prev, totalItems: (prev.totalItems||0)+1, totalSum: (prev.totalSum||0)+item.price }))
      setForm({ name: '', category: form.category, size: form.size, price: '', old_price: '', condition: form.condition })
      setPhotoFiles([])
      setPhotoPreviews([])
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
    if (!window.confirm(`Удалить "${item?.name}" навсегда?`)) return
    try {
      await ownerFetch(`/items/${id}`, { method: 'DELETE' }, password)
      setItems(prev => prev.filter(i => i.id !== id))
      if (!item.sold) {
        setStats(prev => ({ ...prev, totalItems: Math.max((prev.totalItems||1)-1, 0), totalSum: (prev.totalSum||0)-item.price }))
      }
      showToast('Удалено', 'success')
    } catch (e) {
      showToast(e.message)
    }
  }

  async function handleMarkSold(id) {
    const item = items.find(i => i.id === id)
    if (!window.confirm(`Отметить "${item?.name}" как проданное?`)) return
    try {
      const updated = await ownerFetch(`/items/${id}/sold`, { method: 'POST' }, password)
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      setStats(prev => ({
        ...prev,
        totalItems: Math.max((prev.totalItems||1)-1, 0),
        totalSum: (prev.totalSum||0)-item.price,
        soldCount: (prev.soldCount||0)+1,
        soldSum: (prev.soldSum||0)+item.price,
      }))
      showToast('Отмечено как продано', 'success')
    } catch (e) {
      showToast(e.message)
    }
  }

  async function handleUnmarkSold(id) {
    const item = items.find(i => i.id === id)
    try {
      const updated = await ownerFetch(`/items/${id}/unsold`, { method: 'POST' }, password)
      setItems(prev => prev.map(i => i.id === id ? updated : i))
      setStats(prev => ({
        ...prev,
        totalItems: (prev.totalItems||0)+1,
        totalSum: (prev.totalSum||0)+item.price,
        soldCount: Math.max((prev.soldCount||1)-1, 0),
        soldSum: Math.max((prev.soldSum||0)-item.price, 0),
      }))
      showToast('Возвращено в продажу', 'success')
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

  async function handleUpdateStatus(id, status) {
    try {
      const updated = await ownerFetch(`/orders/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      }, password)
      setOrders(prev => prev.map(o => o.id === id ? updated : o))
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

  const filteredItems = items.filter(i => {
    if (!showSold && i.sold) return false
    if (showSold && !i.sold) return false
    if (filterCat !== 'all' && i.category !== filterCat) return false
    return true
  })

  const filteredOrders = orders.filter(o => {
    if (orderStatusFilter !== 'all' && (o.status || 'Новая') !== orderStatusFilter) return false

    if (orderDateFilter !== 'all') {
      const created = new Date(o.created_at)
      const now = new Date()
      const daysAgo = (now - created) / (1000 * 60 * 60 * 24)
      if (orderDateFilter === 'today' && daysAgo > 1) return false
      if (orderDateFilter === 'week' && daysAgo > 7) return false
      if (orderDateFilter === 'month' && daysAgo > 30) return false
    }

    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase()
      const numberStr = o.order_number ? String(o.order_number).padStart(4, '0') : ''
      const matches =
        o.buyer_name.toLowerCase().includes(q) ||
        o.phone.toLowerCase().includes(q) ||
        numberStr.includes(q.replace('№', '').replace('#', ''))
      if (!matches) return false
    }

    return true
  })

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
          <div className="stat-label">В продаже</div>
        </div>
        <div className="stat">
          <div className="stat-num">{stats.soldCount ?? 0}</div>
          <div className="stat-label">Продано</div>
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
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Статистика</button>
      </div>

      {/* ── ТОВАРЫ ── */}
      {tab === 'items' && (
        <>
          {/* Форма добавления */}
          <div className="add-card">
            <h3>Добавить вещь</h3>
            <form onSubmit={handleAddItem}>
              {/* Фото — до 6 штук */}
              <div
                className="photo-upload multi"
                onClick={() => fileRef.current?.click()}
              >
                {photoPreviews.length > 0
                  ? (
                    <div className="photo-multi-grid">
                      {photoPreviews.map((src, i) => <img key={i} src={src} alt={`preview-${i}`} />)}
                    </div>
                  )
                  : <div className="photo-placeholder">📷 Загрузить фото (до 6 шт.)</div>
                }
                <input ref={fileRef} type="file" accept="image/*" multiple onChange={handlePhotoChange} style={{ display:'none' }} />
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

              <button type="submit" className="add-submit-btn" disabled={adding}>
                {adding ? 'Добавляем…' : 'Добавить товар'}
              </button>
            </form>
          </div>

          {/* Список + экспорт */}
          <div className="items-header">
            <span className="items-title">{showSold ? 'Проданные' : 'В продаже'} ({filteredItems.length})</span>
            <button className="export-btn" onClick={() => exportCSV('catalog')}>⬇ Excel</button>
          </div>

          {/* Переключатель В продаже / Продано */}
          <div className="sold-toggle">
            <button className={!showSold ? 'active' : ''} onClick={() => setShowSold(false)}>В продаже</button>
            <button className={showSold ? 'active' : ''} onClick={() => setShowSold(true)}>Продано</button>
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
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-hint)' }}>
              {showSold ? 'Проданных товаров нет' : 'Нет товаров'}
            </div>
          ) : (
            <div className="items-list">
              {filteredItems.map(item => {
                const photoUrl = getPhotoUrl(item.photo)
                const cat = CATEGORIES_MAP[item.category]
                const condStyle = COND_COLORS[item.condition] || {}
                return (
                  <div key={item.id} className={`owner-item ${item.sold ? 'sold' : ''}`}>
                    <div className="owner-item-photo">
                      {photoUrl ? <img src={photoUrl} alt={item.name} /> : <span>{cat?.emoji}</span>}
                      {item.photos && item.photos.length > 1 && (
                        <span className="photo-count">{item.photos.length}</span>
                      )}
                    </div>
                    <div className="owner-item-info">
                      <div className="owner-item-name">{item.name}</div>
                      <div className="owner-item-meta">
                        <span className="art">{item.art}</span>
                        <span className="badge-cat">{cat?.emoji} {cat?.label}</span>
                        {item.size !== '—' && <span className="badge-size">{item.size}</span>}
                        <span className="badge-cond" style={{ background: condStyle.bg, color: condStyle.color }}>{item.condition}</span>
                        {item.sold && <span className="badge-sold">Продано</span>}
                        {!item.sold && item.reserved_until && new Date(item.reserved_until) > new Date() && (
                          <span className="badge-reserved">
                            🔒 До {new Date(item.reserved_until).toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit' })}
                          </span>
                        )}
                      </div>
                      <div className="owner-item-date">
                        {item.sold ? `Продано: ${item.sold_at}` : item.created_at}
                      </div>
                    </div>
                    <div className="owner-item-right">
                      <div className="owner-item-price">{item.price.toLocaleString('ru-RU')} ₽</div>
                      <div className="owner-item-actions">
                        {!item.sold ? (
                          <>
                            <button className="sold-btn" onClick={() => handleMarkSold(item.id)} title="Отметить продано">💰</button>
                            <button className="edit-btn" onClick={() => setEditingItem(item)}>✏️</button>
                          </>
                        ) : (
                          <button className="unsold-btn" onClick={() => handleUnmarkSold(item.id)} title="Вернуть в продажу">↩️</button>
                        )}
                        <button className="delete-btn" onClick={() => handleDelete(item.id)}>🗑</button>
                      </div>
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
            <span className="items-title">Заявки ({filteredOrders.length})</span>
            <button className="export-btn" onClick={() => exportCSV('orders')}>⬇ Excel</button>
          </div>

          <div className="order-search-bar">
            <input
              type="text"
              placeholder="Поиск по имени, телефону или №"
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
            />
          </div>

          <div className="order-filters-row">
            <select
              className="order-filter-select"
              value={orderStatusFilter}
              onChange={e => setOrderStatusFilter(e.target.value)}
            >
              <option value="all">Все статусы</option>
              <option>Новая</option>
              <option>В обработке</option>
              <option>Готово к выдаче</option>
              <option>Завершена</option>
              <option>Отменена</option>
            </select>
            <select
              className="order-filter-select"
              value={orderDateFilter}
              onChange={e => setOrderDateFilter(e.target.value)}
            >
              <option value="all">За всё время</option>
              <option value="today">Сегодня</option>
              <option value="week">За неделю</option>
              <option value="month">За месяц</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ textAlign:'center', padding:'40px', color:'var(--text-hint)' }}>
              {orders.length === 0 ? 'Заявок пока нет' : 'Ничего не найдено'}
            </div>
          ) : (
            <div className="orders-list">
              {filteredOrders.map(order => (
                <div key={order.id} className={`order-card ${order.status === 'Отменена' ? 'cancelled' : ''}`}>
                  <div className="order-top">
                    <div>
                      <div className="order-number-badge">
                        {order.order_number ? `№${String(order.order_number).padStart(4, '0')}` : ''}
                      </div>
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
                  <StatusDropdown
                    value={order.status || 'Новая'}
                    onChange={newStatus => handleUpdateStatus(order.id, newStatus)}
                  />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── СТАТИСТИКА ── */}
      {tab === 'stats' && <SalesStats password={password} />}

      {toast && <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>{toast.msg}</div>}

      {editingItem && (
        <EditItemModal
          item={editingItem}
          password={password}
          onClose={() => setEditingItem(null)}
          onSaved={updated => {
            setItems(prev => prev.map(i => i.id === updated.id ? updated : i))
            setEditingItem(null)
            showToast('Товар обновлён', 'success')
          }}
        />
      )}
    </div>
  )
}
