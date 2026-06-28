import { useState } from 'react'
import { getPhotoUrl, apiFetch } from '../api.js'
import { COND_COLORS, CATEGORIES_MAP } from '../constants.js'
import PhotoGallery from './PhotoGallery.jsx'
import './ItemCard.css'

const NEW_DAYS_THRESHOLD = 3

export default function ItemCard({ item, inCart, onAdd, onRemove, isFavorite, onToggleFavorite }) {
  const [showGallery, setShowGallery] = useState(false)
  const photoUrl = getPhotoUrl(item.photo)
  const condStyle = COND_COLORS[item.condition] || {}
  const cat = CATEGORIES_MAP[item.category]
  const isReserved = item.reserved_until && new Date(item.reserved_until) > new Date()
  const allPhotos = item.photos && item.photos.length ? item.photos : (item.photo ? [item.photo] : [])
  const photoCount = allPhotos.length
  const hasDiscount = item.old_price && item.old_price > item.price
  const discountPercent = hasDiscount ? Math.round((1 - item.price / item.old_price) * 100) : 0
  const isNew = item.created_at && (Date.now() - new Date(item.created_at).getTime()) < NEW_DAYS_THRESHOLD * 24 * 60 * 60 * 1000

  function handlePhotoClick(e) {
    e.stopPropagation()
    if (photoCount === 0) return
    setShowGallery(true)
    apiFetch(`/items/${item.id}/view`, { method: 'POST' }).catch(() => {})
  }

  function handleShare(e) {
    e.stopPropagation()
    const text = `${item.name} — ${item.price.toLocaleString('ru-RU')} ₽ (${item.art})`
    const tg = window.Telegram?.WebApp
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`)
    } else if (navigator.share) {
      navigator.share({ title: item.name, text }).catch(() => {})
    }
  }

  return (
    <div className="item-card">
      <div className="item-photo" onClick={handlePhotoClick}>
        {photoUrl
          ? <img src={photoUrl} alt={item.name} loading="lazy" />
          : <div className="item-photo-placeholder">{cat?.emoji || '👗'}</div>
        }
        <div className="item-tags">
          {hasDiscount && <span className="discount-tag">−{discountPercent}%</span>}
          {!hasDiscount && isNew && <span className="new-tag">Новое</span>}
          {isReserved && <span className="reserved-tag">Забронировано</span>}
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

        <button
          className={`add-btn ${inCart ? 'in-cart' : ''}`}
          onClick={e => { e.stopPropagation(); inCart ? onRemove() : onAdd() }}
          aria-label={inCart ? 'Убрать из корзины' : 'Добавить в корзину'}
        >
          {inCart ? '✓' : '+'}
        </button>
      </div>
      <div className="item-body">
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

      {showGallery && (
        <PhotoGallery photos={allPhotos} onClose={() => setShowGallery(false)} />
      )}
    </div>
  )
}
