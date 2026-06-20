import { getPhotoUrl } from '../api.js'
import './CartPanel.css'

export default function CartPanel({ cart, onRemove, onBack, onCheckout }) {
  const total = cart.reduce((s, i) => s + i.price, 0)

  return (
    <div className="cart-panel">
      <div className="cart-header">
        <button className="back-btn" onClick={onBack}>← Назад</button>
        <h2>Корзина</h2>
      </div>

      {cart.length === 0 ? (
        <div className="cart-empty">
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          <p>Корзина пуста</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Добавляйте вещи через «+» на карточке</p>
        </div>
      ) : (
        <>
          <div className="cart-items">
            {cart.map(item => {
              const photoUrl = getPhotoUrl(item.photo)
              return (
                <div key={item.id} className="cart-item">
                  <div className="cart-item-photo">
                    {photoUrl
                      ? <img src={photoUrl} alt={item.name} />
                      : <span style={{ fontSize: 22 }}>👗</span>
                    }
                  </div>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.name}</div>
                    <div className="cart-item-sub">
                      <span className="art">{item.art}</span>
                      {item.size !== '—' && <span>· {item.size}</span>}
                    </div>
                  </div>
                  <div className="cart-item-right">
                    <div className="cart-item-price">{item.price.toLocaleString('ru-RU')} ₽</div>
                    <button className="remove-btn" onClick={() => onRemove(item.id)} aria-label="Убрать">✕</button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="cart-footer">
            <div className="cart-total">
              <span>Итого</span>
              <span>{total.toLocaleString('ru-RU')} ₽</span>
            </div>
            <button className="checkout-btn" onClick={onCheckout}>
              Связаться с магазином 💬
            </button>
          </div>
        </>
      )}
    </div>
  )
}
