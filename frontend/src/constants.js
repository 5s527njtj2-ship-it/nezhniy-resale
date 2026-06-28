export const CATEGORIES = [
  { id: 'all',    label: 'Все',             emoji: '✦' },
  { id: 'top',    label: 'Верх',            emoji: '👕' },
  { id: 'bottom', label: 'Низ',             emoji: '👖' },
  { id: 'dress',  label: 'Платья и юбки',   emoji: '👗' },
  { id: 'outer',  label: 'Верхняя одежда',  emoji: '🧥' },
  { id: 'shoes',  label: 'Обувь',           emoji: '👟' },
  { id: 'bags',   label: 'Сумки',           emoji: '👜' },
  { id: 'acc',    label: 'Аксессуары',      emoji: '✨' },
  { id: 'sport',  label: 'Спорт',           emoji: '🏃' },
  { id: 'kids',   label: 'Детское',         emoji: '🧒' },
  { id: 'home',   label: 'Интерьер',        emoji: '🏠' },
]

export const CATEGORIES_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export const CONDITIONS = ['Новое / с бирками', 'Отличное', 'Хорошее']

export const COND_COLORS = {
  'Новое / с бирками': { bg: '#111111', color: '#FFFFFF' },
  'Отличное':          { bg: '#F5F5F5', color: '#111111' },
  'Хорошее':           { bg: '#F5F5F5', color: '#6B6B6B' },
}

// Размеры одежды (буквенные + российские/европейские)
export const CLOTHING_SIZES = [
  'XXS','XS','S','M','L','XL','XXL','XXXL',
  '38','40','42','44','46','48','50','52','54','56','58',
  'One size','—'
]

// Размеры обуви (EU)
export const SHOE_SIZES = [
  '34','35','36','36.5','37','37.5','38','38.5','39','40',
  '40.5','41','42','42.5','43','44','44.5','45','46','47','48',
  '—'
]

// Детские размеры (рост в см)
export const KIDS_SIZES = [
  '50','56','62','68','74','80','86','92','98','104','110',
  '116','122','128','134','140','146','152','158','164','170','176',
  '—'
]

// Универсальный список — используется там, где категория ещё не выбрана
export const SIZES = [...new Set([...CLOTHING_SIZES, ...SHOE_SIZES, ...KIDS_SIZES])]

// Возвращает подходящий список размеров по выбранной категории товара
export function getSizesForCategory(categoryId) {
  if (categoryId === 'shoes') return SHOE_SIZES
  if (categoryId === 'kids') return KIDS_SIZES
  return CLOTHING_SIZES
}
