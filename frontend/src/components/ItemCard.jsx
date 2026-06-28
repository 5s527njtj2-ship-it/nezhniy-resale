import { getPhotoUrl, } from '../api.js'
import { COND_COLORS, CATEGORIES_MAP } from '../constants.js'
import './ItemCard.css'

export default function ItemCard({ item, inCart, onAdd, onRemove }) {
  const photoUrl = getPhotoUrl(item.photo)
  const condStyle = COND_COLORS[item.condition] || {}
  const cat = CATEGORIES_MAP[item.category]
  const isReserved = item.reserved_until && new Date(item.reserved_until) > new Date()
  const photoCount = item.photos && item.photos.length ? item.photos.length : (item.photo ? 1 : 0)

  return (
    <div className="item-card">
      <div className="item-photo">
        {photoUrl
          ? <img src={photoUrl} alt={item.name} loading="lazy" />
          : <div className="item-photo-placeholder">{cat?.emoji || '👗'}</div>
        }
        {isReserved && <span className="reserved-tag">Забронировано</span>}
        {photoCount > 1 && <span className="photo-count-tag">📷 {photoCount}</span>}
        <button
          className={`add-btn ${inCart ? 'in-cart' : ''}`}
          onClick={inCart ? onRemove : onAdd}
          aria-label={inCart ? 'Убрать из корзины' : 'Добавить в корзину'}
        >
          {inCart ? '✓' : '+'}
        </button>
      </div>
      <div className="item-body">
        <div className="item-name">{item.name}</div>
        <div className="item-price">{item.price.toLocaleString('ru-RU')} ₽</div>
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
