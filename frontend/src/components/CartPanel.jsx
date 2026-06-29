import { getPhotoUrl } from '../api.js'
import { calcCartTotals, BULK_DISCOUNT_MIN_ITEMS, BULK_DISCOUNT_PERCENT } from '../cartDiscount.js'
import './CartPanel.css'

export default function CartPanel({ cart, onRemove, onBack, onCheckout }) {
  const { subtotal, hasDiscount, discountAmount, total } = calcCartTotals(cart)
  const itemsToDiscount = Math.max(BULK_DISCOUNT_MIN_ITEMS - cart.length, 0)

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

          {!hasDiscount && itemsToDiscount > 0 && (
            <div className="discount-notice">
              🎁 Добавьте ещё {itemsToDiscount} {itemsToDiscount === 1 ? 'вещь' : 'вещи'} — и получите скидку {BULK_DISCOUNT_PERCENT}% на весь заказ
            </div>
          )}
          {hasDiscount && (
            <div className="discount-notice active">
              🎉 Скидка {BULK_DISCOUNT_PERCENT}% за {cart.length}+ вещи применена
            </div>
          )}

          <div className="cart-footer">
            {hasDiscount && (
              <>
                <div className="cart-subtotal">
                  <span>Сумма</span>
                  <span>{subtotal.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="cart-discount-row">
                  <span>Скидка {BULK_DISCOUNT_PERCENT}%</span>
                  <span>−{discountAmount.toLocaleString('ru-RU')} ₽</span>
                </div>
              </>
            )}
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
