import { useState } from 'react'
import { CLOTHING_SIZES, SHOE_SIZES, KIDS_SIZES, RING_SIZES, ACCESSORY_SIZES } from '../constants.js'
import './FilterPanel.css'

const SIZE_GROUPS = [
  { label: 'Одежда', sizes: CLOTHING_SIZES },
  { label: 'Обувь', sizes: SHOE_SIZES },
  { label: 'Детское (рост, см)', sizes: KIDS_SIZES },
  { label: 'Кольца', sizes: RING_SIZES },
  { label: 'Аксессуары', sizes: ACCESSORY_SIZES },
]

export default function FilterPanel({ priceRange, sizeFilter, onApply, onClose }) {
  const [min, setMin] = useState(priceRange.min)
  const [max, setMax] = useState(priceRange.max)
  const [size, setSize] = useState(sizeFilter)
  const [openGroup, setOpenGroup] = useState(null)

  function handleReset() {
    setMin('')
    setMax('')
    setSize('')
  }

  function handleApply() {
    onApply({ min, max }, size)
  }

  function toggleGroup(label) {
    setOpenGroup(prev => prev === label ? null : label)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal filter-modal">
        <div className="modal-header">
          <h3>Фильтры</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="filter-body">
          <div className="filter-block">
            <label>Цена, ₽</label>
            <div className="price-range-inputs">
              <input
                type="number"
                placeholder="От"
                value={min}
                onChange={e => setMin(e.target.value)}
                min="0"
              />
              <span className="price-dash">—</span>
              <input
                type="number"
                placeholder="До"
                value={max}
                onChange={e => setMax(e.target.value)}
                min="0"
              />
            </div>
          </div>

          <div className="filter-block">
            <label>Размер</label>
            {size && (
              <div className="size-selected">
                Выбрано: <b>{size}</b>
                <button type="button" className="size-clear" onClick={() => setSize('')}>✕</button>
              </div>
            )}
            <div className="size-groups">
              {SIZE_GROUPS.map(group => {
                const isOpen = openGroup === group.label
                const sizesToShow = group.sizes.filter(s => s !== '—')
                return (
                  <div className="size-group" key={group.label}>
                    <button
                      type="button"
                      className="size-group-header"
                      onClick={() => toggleGroup(group.label)}
                    >
                      <span>{group.label}</span>
                      <span className="size-group-arrow">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && (
                      <div className="size-grid">
                        {sizesToShow.map(s => (
                          <button
                            key={s}
                            className={`size-chip ${size === s ? 'active' : ''}`}
                            onClick={() => setSize(size === s ? '' : s)}
                            type="button"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-cancel" onClick={handleReset}>Сбросить</button>
          <button type="button" className="btn-submit" onClick={handleApply}>Применить</button>
        </div>
      </div>
    </div>
  )
}
