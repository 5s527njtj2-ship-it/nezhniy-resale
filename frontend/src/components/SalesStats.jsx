import { useState, useEffect } from 'react'
import { ownerFetch, getPhotoUrl } from '../api.js'
import { CATEGORIES_MAP } from '../constants.js'
import './SalesStats.css'

export default function SalesStats({ password }) {
  const [data, setData] = useState(null)
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [viewsTab, setViewsTab] = useState('active') // 'active' | 'sold'

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [salesRes, itemsRes] = await Promise.all([
          ownerFetch('/stats/sales', {}, password),
          ownerFetch('/stats/top-viewed', {}, password),
        ])
        if (!cancelled) {
          setData(salesRes)
          setAllItems(itemsRes)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [password])

  if (loading) return <div className="stats-loading">Загрузка статистики…</div>
  if (error) return <div className="stats-loading">Ошибка: {error}</div>
  if (!data) return null

  const maxMonthSum = Math.max(1, ...data.monthly.map(m => m.sum))
  const maxCatSum = Math.max(1, ...data.byCategory.map(c => c.sum))

  const activeItems = allItems.filter(i => !i.sold)
  const soldItems = allItems.filter(i => i.sold)
  const displayedItems = viewsTab === 'active' ? activeItems : soldItems
  const maxViews = Math.max(1, ...displayedItems.map(i => i.views_count))

  function formatMonth(m) {
    const [year, month] = m.split('-')
    const names = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
    return `${names[parseInt(month) - 1]} ${year.slice(2)}`
  }

  return (
    <div className="sales-stats">
      <div className="sales-summary">
        <div className="sales-summary-item">
          <div className="sales-summary-num">{data.totalSold}</div>
          <div className="sales-summary-label">Продано всего</div>
        </div>
        <div className="sales-summary-item">
          <div className="sales-summary-num">{data.totalRevenue.toLocaleString('ru-RU')}</div>
          <div className="sales-summary-label">Выручка, ₽</div>
        </div>
        <div className="sales-summary-item">
          <div className="sales-summary-num">{data.avgPrice.toLocaleString('ru-RU')}</div>
          <div className="sales-summary-label">Средний чек, ₽</div>
        </div>
      </div>

      {allItems.length > 0 && (
        <div className="sales-section">
          <div className="sales-section-title">Просмотры товаров</div>
          <div className="views-toggle">
            <button className={viewsTab === 'active' ? 'active' : ''} onClick={() => setViewsTab('active')}>
              В продаже ({activeItems.length})
            </button>
            <button className={viewsTab === 'sold' ? 'active' : ''} onClick={() => setViewsTab('sold')}>
              Продано ({soldItems.length})
            </button>
          </div>
          {displayedItems.length === 0 ? (
            <div className="stats-empty-small">Нет товаров</div>
          ) : (
            <div className="top-viewed-list">
              {displayedItems.map(item => {
                const photoUrl = getPhotoUrl(item.photo)
                const cat = CATEGORIES_MAP[item.category] || CATEGORIES_MAP['w-' + item.category]
                return (
                  <div className="top-viewed-row" key={item.id}>
                    <div className="top-viewed-photo">
                      {photoUrl ? <img src={photoUrl} alt={item.name} /> : <span>{cat?.emoji || '👗'}</span>}
                    </div>
                    <div className="top-viewed-info">
                      <div className="top-viewed-name">{item.name}</div>
                      <div className="top-viewed-meta">
                        <span className="art">{item.art}</span>
                        <span className="top-viewed-price">{item.price.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    </div>
                    <div className="top-viewed-views">
                      <span className="views-num">👁 {item.views_count}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {data.monthly.length > 0 && (
        <div className="sales-section">
          <div className="sales-section-title">По месяцам</div>
          <div className="bar-chart">
            {data.monthly.slice().reverse().map(m => (
              <div className="bar-row" key={m.month}>
                <span className="bar-label">{formatMonth(m.month)}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${(m.sum / maxMonthSum) * 100}%` }} />
                </div>
                <span className="bar-value">{m.count} · {m.sum.toLocaleString('ru-RU')} ₽</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.byCategory.length > 0 && (
        <div className="sales-section">
          <div className="sales-section-title">По категориям</div>
          <div className="bar-chart">
            {data.byCategory.map(c => {
              const cat = CATEGORIES_MAP[c.category] || CATEGORIES_MAP['w-' + c.category]
              return (
                <div className="bar-row" key={c.category}>
                  <span className="bar-label">{cat ? `${cat.emoji} ${cat.label}` : c.category}</span>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${(c.sum / maxCatSum) * 100}%` }} />
                  </div>
                  <span className="bar-value">{c.count} · {c.sum.toLocaleString('ru-RU')} ₽</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {data.totalSold === 0 && allItems.length === 0 && (
        <div className="sales-empty">Статистика появится после добавления товаров</div>
      )}
    </div>
  )
}
