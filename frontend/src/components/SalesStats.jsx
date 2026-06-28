import { useState, useEffect } from 'react'
import { ownerFetch, getPhotoUrl } from '../api.js'
import { CATEGORIES_MAP } from '../constants.js'
import './SalesStats.css'

export default function SalesStats({ password }) {
  const [data, setData] = useState(null)
  const [topViewed, setTopViewed] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const [salesRes, topRes] = await Promise.all([
          ownerFetch('/stats/sales', {}, password),
          ownerFetch('/stats/top-viewed', {}, password),
        ])
        if (!cancelled) {
          setData(salesRes)
          setTopViewed(topRes)
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
  const maxViews = Math.max(1, ...topViewed.map(i => i.views_count))

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

      {topViewed.length > 0 && (
        <div className="sales-section">
          <div className="sales-section-title">Топ просматриваемых</div>
          <div className="top-viewed-list">
            {topViewed.map(item => {
              const photoUrl = getPhotoUrl(item.photo)
              const cat = CATEGORIES_MAP[item.category]
              return (
                <div className="top-viewed-row" key={item.id}>
                  <div className="top-viewed-photo">
                    {photoUrl ? <img src={photoUrl} alt={item.name} /> : <span>{cat?.emoji}</span>}
                  </div>
                  <div className="top-viewed-info">
                    <div className="top-viewed-name">{item.name}</div>
                    <div className="top-viewed-meta">
                      <span className="art">{item.art}</span>
                      {item.sold && <span className="badge-sold">Продано</span>}
                    </div>
                  </div>
                  <div className="top-viewed-views">👁 {item.views_count}</div>
                </div>
              )
            })}
          </div>
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
              const cat = CATEGORIES_MAP[c.category]
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

      {data.totalSold === 0 && topViewed.length === 0 && (
        <div className="sales-empty">Статистика появится после первых просмотров и продаж</div>
      )}
    </div>
  )
}
