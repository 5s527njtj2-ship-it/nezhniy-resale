export const CATEGORIES = [
  { id: 'all',      label: 'Все',                emoji: '✦' },
  { id: 'w-top',    label: 'Женское: верх',      emoji: '👚' },
  { id: 'w-bottom', label: 'Женское: низ',       emoji: '👖' },
  { id: 'dress',    label: 'Платья и юбки',      emoji: '👗' },
  { id: 'm-top',    label: 'Мужское: верх',      emoji: '👔' },
  { id: 'm-bottom', label: 'Мужское: низ',       emoji: '👖' },
  { id: 'outer',    label: 'Верхняя одежда',     emoji: '🧥' },
  { id: 'knitwear', label: 'Трикотаж',           emoji: '🧶' },
  { id: 'suits',    label: 'Костюмы',            emoji: '🤵' },
  { id: 'shoes',    label: 'Обувь',              emoji: '👟' },
  { id: 'bags',     label: 'Сумки',              emoji: '👜' },
  { id: 'jewelry',  label: 'Украшения',          emoji: '💎' },
  { id: 'watches',  label: 'Часы',               emoji: '⌚' },
  { id: 'belts',    label: 'Ремни',              emoji: '🪢' },
  { id: 'headwear', label: 'Головные уборы',     emoji: '🧢' },
  { id: 'eyewear',  label: 'Очки',               emoji: '🕶️' },
  { id: 'lingerie', label: 'Бельё',              emoji: '🎀' },
  { id: 'acc',      label: 'Аксессуары',         emoji: '✨' },
  { id: 'sport',    label: 'Спорт',              emoji: '🏃' },
  { id: 'kids',     label: 'Детское',            emoji: '🧒' },
  { id: 'home',     label: 'Интерьер',           emoji: '🏠' },
]

export const CATEGORIES_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export const CONDITIONS = ['Новое / с бирками', 'Отличное', 'Хорошее']

export const COND_COLORS = {
  'Новое / с бирками': { bg: '#111111', color: '#FFFFFF' },
  'Отличное':          { bg: '#F5F5F5', color: '#111111' },
  'Хорошее':           { bg: '#F5F5F5', color: '#6B6B6B' },
}

// Размеры женской одежды (буквенные + российские/европейские)
export const CLOTHING_SIZES = [
  'XXS','XS','S','M','L','XL','XXL','XXXL',
  '38','40','42','44','46','48','50','52','54','56','58',
  'One size','—'
]

// Размеры мужской одежды (верх/низ, включая буквенные и числовые в см для брюк)
export const MEN_CLOTHING_SIZES = [
  'XS','S','M','L','XL','XXL','XXXL',
  '44','46','48','50','52','54','56','58','60',
  '28','29','30','31','32','33','34','36','38',
  'One size','—'
]

// Размеры обуви (EU, унисекс шкала)
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

// Размеры колец (российская шкала)
export const RING_SIZES = ['15','15.5','16','16.5','17','17.5','18','18.5','19','19.5','20','—']

// Универсальные размеры для аксессуаров/головных уборов/ремней
export const ACCESSORY_SIZES = ['XS','S','M','L','XL','One size','—']

// Универсальный список — используется там, где категория ещё не выбрана
export const SIZES = [...new Set([
  ...CLOTHING_SIZES, ...MEN_CLOTHING_SIZES, ...SHOE_SIZES,
  ...KIDS_SIZES, ...RING_SIZES, ...ACCESSORY_SIZES
])]

// Возвращает подходящий список размеров по выбранной категории товара
export function getSizesForCategory(categoryId) {
  if (categoryId === 'shoes') return SHOE_SIZES
  if (categoryId === 'kids') return KIDS_SIZES
  if (categoryId === 'jewelry') return RING_SIZES
  if (['m-top', 'm-bottom', 'suits'].includes(categoryId)) return MEN_CLOTHING_SIZES
  if (['belts', 'headwear', 'eyewear', 'acc', 'watches'].includes(categoryId)) return ACCESSORY_SIZES
  return CLOTHING_SIZES
}
