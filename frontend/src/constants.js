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
  { id: 'home',   label: 'Интерьер',        emoji: '🏠' },
]

export const CATEGORIES_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]))

export const CONDITIONS = ['Новое / с бирками', 'Отличное', 'Хорошее']

export const COND_COLORS = {
  'Новое / с бирками': { bg: '#111111', color: '#FFFFFF' },
  'Отличное':          { bg: '#F5F5F5', color: '#111111' },
  'Хорошее':           { bg: '#F5F5F5', color: '#6B6B6B' },
}

export const SIZES = ['XS','S','M','L','XL','XXL','34','36','38','40','42','44','46','48','One size','—']
