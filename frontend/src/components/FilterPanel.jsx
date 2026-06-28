import { useState } from 'react'
import { SIZES } from '../constants.js'
import './FilterPanel.css'

export default function FilterPanel({ priceRange, sizeFilter, onApply, onClose }) {
  const [min, setMin] = useState(priceRange.min)
  const [max, setMax] = useState(priceRange.max)
  const [size, setSize] = useState(sizeFilter)

  function handleReset() {
    setMin('')
    setMax('')
    setSize('')
  }

  function handleApply() {
    onApply({ min, max }, size)
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
            <div className="size-grid">
              {SIZES.filter(s => s !== '—').map(s => (
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
