// Главные разделы (верхний уровень навигации)
export const SECTIONS = [
  { id: 'women', label: 'Женское',  emoji: '👚' },
  { id: 'men',   label: 'Мужское',  emoji: '👔' },
  { id: 'kids',  label: 'Детское',  emoji: '🧒' },
  { id: 'home',  label: 'Интерьер', emoji: '🏠' },
]

// Подкатегории по разделам — каждый id уникален и однозначно принадлежит своему разделу
export const SUBCATEGORIES = {
  women: [
    { id: 'all',       label: 'Всё' },
    { id: 'w-top',     label: 'Верх' },
    { id: 'w-bottom',  label: 'Низ' },
    { id: 'w-dress',   label: 'Платья и юбки' },
    { id: 'w-outer',   label: 'Верхняя одежда' },
    { id: 'w-knit',    label: 'Трикотаж' },
    { id: 'w-shoes',   label: 'Обувь' },
    { id: 'w-bags',    label: 'Сумки' },
    { id: 'w-jewelry', label: 'Украшения' },
    { id: 'w-watch',   label: 'Часы' },
    { id: 'w-belt',    label: 'Ремни' },
    { id: 'w-hat',     label: 'Головные уборы' },
    { id: 'w-eyewear', label: 'Очки' },
    { id: 'w-lingerie',label: 'Бельё' },
    { id: 'w-acc',     label: 'Аксессуары' },
    { id: 'w-sport',   label: 'Спорт' },
  ],
  men: [
    { id: 'all',       label: 'Всё' },
    { id: 'm-top',     label: 'Верх' },
    { id: 'm-bottom',  label: 'Низ' },
    { id: 'm-outer',   label: 'Верхняя одежда' },
    { id: 'm-knit',    label: 'Трикотаж' },
    { id: 'm-suit',    label: 'Костюмы' },
    { id: 'm-shoes',   label: 'Обувь' },
    { id: 'm-bags',    label: 'Сумки' },
    { id: 'm-watch',   label: 'Часы' },
    { id: 'm-belt',    label: 'Ремни' },
    { id: 'm-hat',     label: 'Головные уборы' },
    { id: 'm-eyewear', label: 'Очки' },
    { id: 'm-acc',     label: 'Аксессуары' },
    { id: 'm-sport',   label: 'Спорт' },
  ],
  kids: [
    { id: 'all',       label: 'Всё' },
    { id: 'k-clothes', label: 'Одежда' },
    { id: 'k-shoes',   label: 'Обувь' },
    { id: 'k-acc',     label: 'Аксессуары' },
  ],
  home: [
    { id: 'all',  label: 'Всё' },
    { id: 'home', label: 'Интерьер' },
  ],
}

// Плоский список всех категорий с привязкой к разделу — для отображения в форме владельца
// и для определения раздела/иконки/лейбла по id категории товара
export const CATEGORIES = [
  { id: 'all',        label: 'Все',                  emoji: '✦', section: null },
  { id: 'w-top',      label: 'Женское: верх',        emoji: '👚', section: 'women' },
  { id: 'w-bottom',   label: 'Женское: низ',         emoji: '👖', section: 'women' },
  { id: 'w-dress',    label: 'Платья и юбки',        emoji: '👗', section: 'women' },
  { id: 'w-outer',    label: 'Женское: верхняя одежда', emoji: '🧥', section: 'women' },
  { id: 'w-knit',     label: 'Женское: трикотаж',    emoji: '🧶', section: 'women' },
  { id: 'w-shoes',    label: 'Женская обувь',        emoji: '👠', section: 'women' },
  { id: 'w-bags',     label: 'Женские сумки',        emoji: '👜', section: 'women' },
  { id: 'w-jewelry',  label: 'Украшения',            emoji: '💎', section: 'women' },
  { id: 'w-watch',    label: 'Женские часы',         emoji: '⌚', section: 'women' },
  { id: 'w-belt',     label: 'Женские ремни',        emoji: '🪢', section: 'women' },
  { id: 'w-hat',      label: 'Женские головные уборы', emoji: '🧢', section: 'women' },
  { id: 'w-eyewear',  label: 'Женские очки',         emoji: '🕶️', section: 'women' },
  { id: 'w-lingerie', label: 'Бельё',                emoji: '🎀', section: 'women' },
  { id: 'w-acc',      label: 'Женские аксессуары',   emoji: '✨', section: 'women' },
  { id: 'w-sport',    label: 'Женский спорт',        emoji: '🏃', section: 'women' },

  { id: 'm-top',      label: 'Мужское: верх',        emoji: '👔', section: 'men' },
  { id: 'm-bottom',   label: 'Мужское: низ',         emoji: '👖', section: 'men' },
  { id: 'm-outer',    label: 'Мужское: верхняя одежда', emoji: '🧥', section: 'men' },
  { id: 'm-knit',     label: 'Мужское: трикотаж',    emoji: '🧶', section: 'men' },
  { id: 'm-suit',     label: 'Костюмы',              emoji: '🤵', section: 'men' },
  { id: 'm-shoes',    label: 'Мужская обувь',        emoji: '👞', section: 'men' },
  { id: 'm-bags',     label: 'Мужские сумки',        emoji: '💼', section: 'men' },
  { id: 'm-watch',    label: 'Мужские часы',         emoji: '⌚', section: 'men' },
  { id: 'm-belt',     label: 'Мужские ремни',        emoji: '🪢', section: 'men' },
  { id: 'm-hat',      label: 'Мужские головные уборы', emoji: '🧢', section: 'men' },
  { id: 'm-eyewear',  label: 'Мужские очки',         emoji: '🕶️', section: 'men' },
  { id: 'm-acc',      label: 'Мужские аксессуары',   emoji: '✨', section: 'men' },
  { id: 'm-sport',    label: 'Мужской спорт',        emoji: '🏃', section: 'men' },

  { id: 'k-clothes',  label: 'Детская одежда',       emoji: '🧒', section: 'kids' },
  { id: 'k-shoes',    label: 'Детская обувь',        emoji: '👟', section: 'kids' },
  { id: 'k-acc',      label: 'Детские аксессуары',   emoji: '🎈', section: 'kids' },

  { id: 'home',       label: 'Интерьер',             emoji: '🏠', section: 'home' },
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
  if (categoryId.includes('shoes')) return SHOE_SIZES
  if (categoryId.startsWith('k-')) return KIDS_SIZES
  if (categoryId === 'w-jewelry') return RING_SIZES
  if (categoryId.startsWith('m-') && !['m-belt','m-hat','m-eyewear','m-acc','m-watch'].includes(categoryId)) return MEN_CLOTHING_SIZES
  if (['w-belt','w-hat','w-eyewear','w-acc','w-watch','m-belt','m-hat','m-eyewear','m-acc','m-watch'].includes(categoryId)) return ACCESSORY_SIZES
  return CLOTHING_SIZES
}
