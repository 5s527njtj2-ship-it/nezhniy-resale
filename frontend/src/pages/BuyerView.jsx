import { useState, useEffect, useCallback } from 'react'
import { apiFetch } from '../api.js'
import { SECTIONS, SUBCATEGORIES } from '../constants.js'
import ItemCard from '../components/ItemCard.jsx'
import CartPanel from '../components/CartPanel.jsx'
import BookingModal from '../components/BookingModal.jsx'
import FilterPanel from '../components/FilterPanel.jsx'
import MyOrders from '../components/MyOrders.jsx'
import PhotoGallery from '../components/PhotoGallery.jsx'
import './BuyerView.css'

const SORT_OPTIONS = [
  { id: 'new', label: 'Сначала новые' },
  { id: 'price_asc', label: 'Дешевле' },
  { id: 'price_desc', label: 'Дороже' },
]

export default function BuyerView({ cart, onAddToCart, onRemoveFromCart, onClearCart, favorites, onToggleFavorite, onRefreshFavorites, telegramId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('women')
  const [subcategory, setSubcategory] = useState('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState('catalog') // 'catalog' | 'cart' | 'favorites'
  const [showBooking, setShowBooking] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sizeFilter, setSizeFilter] = useState('')
  const [sortBy, setSortBy] = useState('new')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [toast, setToast] = useState(null)
  const [openedItem, setOpenedItem] = useState(null)

  const subcats = SUBCATEGORIES[section] || []
  const hasActiveFilters = priceRange.min || priceRange.max || sizeFilter

  const SECTION_PREFIX = { women: 'w-', men: 'm-', kids: 'k-', home: 'home' }

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (subcategory !== 'all') {
        params.set('category', subcategory)
      }
      if (search.trim()) params.set('search', search.trim())
      if (priceRange.min) params.set('minPrice', priceRange.min)
      if (priceRange.max) params.set('maxPrice', priceRange.max)
      if (sizeFilter) params.set('size', sizeFilter)
      const data = await apiFetch(`/items?${params}`)
      const prefix = SECTION_PREFIX[section]
      const hasPrefix = i => i.category.startsWith('w-') || i.category.startsWith('m-') || i.category.startsWith('k-') || i.category === 'home'
      let filtered = subcategory === 'all'
        ? data.filter(i => {
            if (prefix === 'home') return i.category === 'home'
            if (i.category.startsWith(prefix)) return true
            // товары со старыми категориями (без префикса) по умолчанию показываем в разделе "Женское"
            if (section === 'women' && !hasPrefix(i)) return true
            return false
          })
        : data

      filtered = sortItems(filtered, sortBy)
      setItems(filtered)
    } catch (e) {
      showToast('Ошибка загрузки: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [section, subcategory, search, priceRange, sizeFilter, sortBy])

  useEffect(() => {
    const t = setTimeout(fetchItems, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchItems, search])

  function sortItems(list, sort) {
    const copy = [...list]
    if (sort === 'price_asc') return copy.sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') return copy.sort((a, b) => b.price - a.price)
    return copy.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSectionChange(id) {
    setSection(id)
    setSubcategory('all')
  }

  function handleAdd(item) {
    if (item.sold) {
      showToast('Этот товар уже продан')
      return
    }
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

  function handleToggleFavorite(item) {
    onToggleFavorite(item)
  }

  function handleBookingSuccess() {
    setShowBooking(false)
    onClearCart()
    setView('catalog')
    showToast('Заявка отправлена! Магазин свяжется с вами 📱', 'success')
  }

  const inCart = (id) => !!cart.find(i => i.id === id)
  const isFavorite = (id) => !!favorites.find(i => i.id === id)
  const currentSortLabel = SORT_OPTIONS.find(s => s.id === sortBy)?.label || 'Сортировка'

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

          {/* Шапка с кол-вом, сортировкой, фильтрами, корзиной */}
          <div className="catalog-topbar">
            <span className="catalog-count">
              {loading ? '…' : `${items.length} ${plural(items.length, ['вещь','вещи','вещей'])}`}
            </span>
            <div className="topbar-actions">
              <div className="sort-wrap">
                <button className="filter-btn" onClick={() => setShowSortMenu(v => !v)}>
                  ↕ {currentSortLabel}
                </button>
                {showSortMenu && (
                  <div className="sort-menu">
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        className={`sort-option ${sortBy === opt.id ? 'active' : ''}`}
                        onClick={() => { setSortBy(opt.id); setShowSortMenu(false) }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button className={`filter-btn ${hasActiveFilters ? 'has-active' : ''}`} onClick={() => setShowFilters(true)}>
                ⚙ Фильтры
                {hasActiveFilters && <span className="cart-badge">•</span>}
              </button>
              <button className="cart-btn" onClick={() => { setView('favorites'); onRefreshFavorites() }}>
                ❤️
                {favorites.length > 0 && <span className="cart-badge">{favorites.length}</span>}
              </button>
              <button className="cart-btn" onClick={() => setView('orders')}>
                📋
              </button>
              <button className="cart-btn" onClick={() => setView('cart')}>
                🛒
                {cart.length > 0 && <span className="cart-badge">{cart.length}</span>}
              </button>
            </div>
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
                  isFavorite={isFavorite(item.id)}
                  onToggleFavorite={() => handleToggleFavorite(item)}
                  onOpen={setOpenedItem}
                />
              ))}
            </div>
          )}
        </>
      )}

      {view === 'favorites' && (
        <div className="favorites-view">
          <div className="cart-header">
            <button className="back-btn" onClick={() => setView('catalog')}>← Назад</button>
            <h2>Избранное</h2>
          </div>
          {favorites.length === 0 ? (
            <div className="empty-state">
              <div className="empty-emoji">❤️</div>
              <p>Список избранного пуст</p>
            </div>
          ) : (
            <div className="catalog-grid" style={{ marginTop: 16 }}>
              {favorites.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  inCart={inCart(item.id)}
                  onAdd={() => handleAdd(item)}
                  onRemove={() => handleRemove(item.id)}
                  isFavorite={true}
                  onToggleFavorite={() => handleToggleFavorite(item)}
                  onOpen={setOpenedItem}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {view === 'orders' && (
        <div className="favorites-view">
          <div className="cart-header">
            <button className="back-btn" onClick={() => setView('catalog')}>← Назад</button>
            <h2>Мои заявки</h2>
          </div>
          <MyOrders telegramId={telegramId} />
        </div>
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
          telegramId={telegramId}
        />
      )}

      {showFilters && (
        <FilterPanel
          priceRange={priceRange}
          sizeFilter={sizeFilter}
          onApply={(price, size) => { setPriceRange(price); setSizeFilter(size); setShowFilters(false) }}
          onClose={() => setShowFilters(false)}
        />
      )}

      {openedItem && (
        <PhotoGallery
          item={openedItem}
          photos={openedItem.photos && openedItem.photos.length ? openedItem.photos : (openedItem.photo ? [openedItem.photo] : [])}
          onClose={() => setOpenedItem(null)}
          inCart={inCart(openedItem.id)}
          onAdd={() => handleAdd(openedItem)}
          onRemove={() => handleRemove(openedItem.id)}
          isFavorite={isFavorite(openedItem.id)}
          onToggleFavorite={() => handleToggleFavorite(openedItem)}
          onOpenItem={setOpenedItem}
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
