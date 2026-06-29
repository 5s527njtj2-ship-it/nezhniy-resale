// Скидка за количество вещей в заказе
export const BULK_DISCOUNT_MIN_ITEMS = 3
export const BULK_DISCOUNT_PERCENT = 10

export function calcCartTotals(cart) {
  const subtotal = cart.reduce((s, i) => s + i.price, 0)
  const hasDiscount = cart.length >= BULK_DISCOUNT_MIN_ITEMS
  const discountAmount = hasDiscount ? Math.round(subtotal * (BULK_DISCOUNT_PERCENT / 100)) : 0
  const total = subtotal - discountAmount
  return { subtotal, hasDiscount, discountAmount, total }
}
