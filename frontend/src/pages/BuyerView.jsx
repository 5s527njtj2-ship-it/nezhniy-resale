import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api.js'
import { SECTIONS, SUBCATEGORIES } from '../constants.js'
import ItemCard from '../components/ItemCard.jsx'
import CartPanel from '../components/CartPanel.jsx'
import BookingModal from '../components/BookingModal.jsx'
import './BuyerView.css'

export default function BuyerView({ cart, onAddToCart, onRemoveFromCart, onClearCart }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('women')
  const [subcategory, setSubcategory] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('catalog') // 'catalog' | 'cart'
  const [showBooking, setShowBooking] = useState(false)
  const [toast, setToast] = useState(null)

  const subcats = SUBCATEGORIES[section] || []

  const SECTION_PREFIX = { women: 'w-', men: 'm-', kids: 'k-', home: 'home' }

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (subcategory !== 'all') {
        params.set('category', subcategory)
      }
      if (search.trim()) params.set('search', search.trim())
      const data = await apiFetch(`/items?${params}`)
      const prefix = SECTION_PREFIX[section]
      const hasPrefix = i => i.category.startsWith('w-') || i.category.startsWith('m-') || i.category.startsWith('k-') || i.category === 'home'
      const filtered = subcategory === 'all'
        ? data.filter(i => {
            if (prefix === 'home') return i.category === 'home'
            if (i.category.startsWith(prefix)) return true
            // товары со старыми категориями (без префикса) по умолчанию показываем в разделе "Женское"
            if (section === 'women' && !hasPrefix(i)) return true
            return false
          })
        : data
      setItems(filtered)
    } catch (e) {
      showToast('Ошибка загрузки: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [section, subcategory, search])

  useEffect(() => {
    const t = setTimeout(fetchItems, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchItems, search])

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSectionChange(id) {
    setSection(id)
    setSubcategory('all')
  }

  function handleAdd(item) {
    if (cart.find(i => i.id === item.id)) {
      showToast('Уже в корзине')
      return
    }
    onAddToCart(item)
    showToast(`Добавлено: ${item.name}`, 'success')
  }

  function handleRemove(id) {
    onRemoveFromCart(id)
  }

  function handleBookingSuccess() {
    setShowBooking(false)
    onClearCart()
    setView('catalog')
    showToast('Заявка отправлена! Магазин свяжется с вами 📱', 'success')
  }

  const inCart = (id) => !!cart.find(i => i.id === id)

  return (
    <div className="buyer-view">
      {view === 'catalog' && (
        <>
          {/* Поиск */}
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Поиск по названию или артикулу NR-…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" onClick={() => setSearch('')}>✕</button>
            )}
          </div>

          {/* Разделы — верхний уровень */}
          <div className="section-tabs">
            {SECTIONS.map(s => (
              <button
                key={s.id}
                className={`section-tab ${section === s.id ? 'active' : ''}`}
                onClick={() => handleSectionChange(s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>

          {/* Подкатегории выбранного раздела */}
          {subcats.length > 1 && (
            <div className="cat-scroll">
              {subcats.map(sub => (
                <button
                  key={sub.id}
                  className={`cat-chip ${subcategory === sub.id ? 'active' : ''}`}
                  onClick={() => setSubcategory(sub.id)}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {/* Шапка с кол-вом и корзиной */}
          <div className="catalog-topbar">
            <span className="catalog-count">
              {loading ? '…' : `${items.length} ${plural(items.length, ['вещь','вещи','вещей'])}`}
            </span>
            <button className="cart-btn" onClick={() => setView('cart')}>
              🛒 Корзина
              {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
            </button>
          </div>

          {/* Сетка товаров */}
          {loading ? (
            <div className="loading-grid">
              {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="empty-state">
              <div className="empty-emoji">🛍</div>
              <p>Ничего не найдено</p>
            </div>
          ) : (
            <div className="catalog-grid">
              {items.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  inCart={inCart(item.id)}
                  onAdd={() => handleAdd(item)}
                  onRemove={() => handleRemove(item.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'cart' && (
        <CartPanel
          cart={cart}
          onRemove={handleRemove}
          onBack={() => setView('catalog')}
          onCheckout={() => setShowBooking(true)}
        />
      )}

      {showBooking && (
        <BookingModal
          cart={cart}
          onClose={() => setShowBooking(false)}
          onSuccess={handleBookingSuccess}
        />
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  )
}

function plural(n, forms) {
  const mod10 = n % 10, mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms[0]
  if ([2,3,4].includes(mod10) && ![12,13,14].includes(mod100)) return forms[1]
  return forms[2]
}
