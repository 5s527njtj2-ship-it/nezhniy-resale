import { COND_COLORS, CATEGORIES_MAP } from '../constants.js'
import { getPhotoUrl } from '../api.js'
import './ItemCard.css'

const NEW_DAYS_THRESHOLD = 3

export default function ItemCard({ item, inCart, onAdd, onRemove, isFavorite, onToggleFavorite, onOpen }) {
  const photoUrl = getPhotoUrl(item.photo)
  const condStyle = COND_COLORS[item.condition] || {}
  const cat = CATEGORIES_MAP[item.category]
  const isReserved = item.reserved_until && new Date(item.reserved_until) > new Date()
  const photoCount = item.photos && item.photos.length ? item.photos.length : (item.photo ? 1 : 0)
  const hasDiscount = item.old_price && item.old_price > item.price
  const discountPercent = hasDiscount ? Math.round((1 - item.price / item.old_price) * 100) : 0
  const isNew = item.created_at && (Date.now() - new Date(item.created_at).getTime()) < NEW_DAYS_THRESHOLD * 24 * 60 * 60 * 1000

  function handleShare(e) {
    e.stopPropagation()
    const text = `${item.name} — ${item.price.toLocaleString('ru-RU')} ₽`
    const botUrl = `https://t.me/Nezhniy_Resale_bot/nezhniy-resale_store?startapp=${item.art}`
    const tg = window.Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(botUrl)}&text=${encodeURIComponent(text)}`)
    } else if (navigator.share) {
      navigator.share({ title: item.name, text, url: botUrl }).catch(() => {})
    }
  }

  return (
    <div className="item-card" onClick={() => onOpen(item)}>
      <div className={`item-photo ${item.sold ? 'sold-overlay' : ''}`}>
        {photoUrl
          ? <img src={photoUrl} alt={item.name} loading="lazy" />
          : <div className="item-photo-placeholder">{cat?.emoji || '👗'}</div>
        }
        <div className="item-tags">
          {item.sold && <span className="sold-tag">Продано</span>}
          {!item.sold && hasDiscount && <span className="discount-tag">−{discountPercent}%</span>}
          {!item.sold && !hasDiscount && isNew && <span className="new-tag">Новое</span>}
          {!item.sold && isReserved && <span className="reserved-tag">Забронировано</span>}
        </div>
        {photoCount > 1 && <span className="photo-count-tag">📷 {photoCount}</span>}

        <button
          className={`fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleFavorite() }}
          aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>

        <button
          className="share-btn"
          onClick={handleShare}
          aria-label="Поделиться"
        >
          ↗
        </button>

        {!item.sold && (
          <button
            className={`add-btn ${inCart ? 'in-cart' : ''}`}
            onClick={e => { e.stopPropagation(); inCart ? onRemove() : onAdd() }}
            aria-label={inCart ? 'Убрать из корзины' : 'Добавить в корзину'}
          >
            {inCart ? '✓' : '+'}
          </button>
        )}
      </div>
      <div className={`item-body ${item.sold ? 'sold' : ''}`}>
        <div className="item-name">{item.name}</div>
        <div className="item-price-row">
          <span className="item-price">{item.price.toLocaleString('ru-RU')} ₽</span>
          {hasDiscount && <span className="item-old-price">{item.old_price.toLocaleString('ru-RU')} ₽</span>}
        </div>
        <div className="item-meta">
          {item.size !== '—' && <span className="meta-size">{item.size}</span>}
          <span className="meta-cond" style={{ background: condStyle.bg, color: condStyle.color }}>
            {item.condition}
          </span>
        </div>
        <div className="item-art">{item.art}</div>
      </div>
    </div>
  )
}
