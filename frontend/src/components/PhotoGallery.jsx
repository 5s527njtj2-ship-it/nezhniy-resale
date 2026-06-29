import { useState, useEffect } from 'react'
import { apiFetch, getPhotoUrl } from '../api.js'
import { COND_COLORS, CATEGORIES_MAP } from '../constants.js'
import './PhotoGallery.css'

export default function PhotoGallery({
  item, photos, onClose,
  inCart, onAdd, onRemove,
  isFavorite, onToggleFavorite,
  onOpenItem,
}) {
  const [index, setIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(null)
  const [similar, setSimilar] = useState([])

  const condStyle = COND_COLORS[item.condition] || {}
  const cat = CATEGORIES_MAP[item.category]
  const hasDiscount = item.old_price && item.old_price > item.price
  const discountPercent = hasDiscount ? Math.round((1 - item.price / item.old_price) * 100) : 0

  useEffect(() => {
    setIndex(0)
    apiFetch(`/items/${item.id}/similar`).then(setSimilar).catch(() => setSimilar([]))
  }, [item.id])

  function prev(e) {
    e?.stopPropagation()
    setIndex(i => (i === 0 ? photos.length - 1 : i - 1))
  }
  function next(e) {
    e?.stopPropagation()
    setIndex(i => (i === photos.length - 1 ? 0 : i + 1))
  }

  function handleTouchStart(e) {
    setTouchStartX(e.touches[0].clientX)
  }
  function handleTouchEnd(e) {
    if (touchStartX === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX
    if (deltaX > 50) prev()
    else if (deltaX < -50) next()
    setTouchStartX(null)
  }

  function handleClose(e) {
    e.stopPropagation()
    onClose()
  }

  return (
    <div className="gallery-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="gallery-sheet" onClick={e => e.stopPropagation()}>
        <button className="gallery-close" onClick={handleClose} onTouchEnd={handleClose}>✕</button>

        <div
          className="gallery-stage"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {photos.length > 0
            ? <img src={photos[index]} alt={`Фото ${index + 1}`} />
            : <div className="gallery-no-photo">{cat?.emoji || '👗'}</div>
          }

          {photos.length > 1 && (
            <>
              <button className="gallery-nav gallery-prev" onClick={prev}>‹</button>
              <button className="gallery-nav gallery-next" onClick={next}>›</button>
            </>
          )}

          {photos.length > 1 && (
            <div className="gallery-dots">
              {photos.map((_, i) => (
                <span key={i} className={`gallery-dot ${i === index ? 'active' : ''}`} onClick={e => { e.stopPropagation(); setIndex(i) }} />
              ))}
            </div>
          )}
        </div>

        <div className="gallery-info">
          <div className="gallery-info-top">
            <div className="gallery-name">{item.name}</div>
            <button
              className={`gallery-fav-btn ${isFavorite ? 'active' : ''}`}
              onClick={onToggleFavorite}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          </div>

          <div className="gallery-price-row">
            <span className="gallery-price">{item.price.toLocaleString('ru-RU')} ₽</span>
            {hasDiscount && (
              <>
                <span className="gallery-old-price">{item.old_price.toLocaleString('ru-RU')} ₽</span>
                <span className="gallery-discount-tag">−{discountPercent}%</span>
              </>
            )}
          </div>

          <div className="gallery-meta">
            {item.size !== '—' && <span className="gallery-meta-chip">{item.size}</span>}
            <span className="gallery-meta-chip" style={{ background: condStyle.bg, color: condStyle.color }}>
              {item.condition}
            </span>
            <span className="gallery-meta-art">{item.art}</span>
          </div>

          {item.sold ? (
            <div className="gallery-sold-notice">Этот товар уже продан</div>
          ) : (
            <button
              className={`gallery-cart-btn ${inCart ? 'in-cart' : ''}`}
              onClick={inCart ? onRemove : onAdd}
            >
              {inCart ? '✓ В корзине' : 'Добавить в корзину'}
            </button>
          )}

          {similar.length > 0 && (
            <div className="similar-section">
              <div className="similar-title">Похожие товары</div>
              <div className="similar-scroll">
                {similar.map(s => {
                  const sPhoto = getPhotoUrl(s.photo)
                  return (
                    <div key={s.id} className="similar-card" onClick={() => onOpenItem(s)}>
                      <div className="similar-photo">
                        {sPhoto
                          ? <img src={sPhoto} alt={s.name} />
                          : <span>{CATEGORIES_MAP[s.category]?.emoji}</span>
                        }
                      </div>
                      <div className="similar-name">{s.name}</div>
                      <div className="similar-price">{s.price.toLocaleString('ru-RU')} ₽</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
