import { useState, useEffect } from 'react'
import BuyerView from './pages/BuyerView.jsx'
import OwnerView from './pages/OwnerView.jsx'
import AboutModal from './components/AboutModal.jsx'
import PrivacyConsent from './components/PrivacyConsent.jsx'
import './App.css'

const CONSENT_KEY = 'nr_privacy_consent'

export default function App() {
  const [mode, setMode] = useState('buyer') // 'buyer' | 'owner'
  const [cart, setCart] = useState([])
  const [favorites, setFavorites] = useState([])
  const [showAbout, setShowAbout] = useState(false)
  const [consentGiven, setConsentGiven] = useState(true) // по умолчанию true, проверим в useEffect
  const [telegramId, setTelegramId] = useState(null)
  const [startArt, setStartArt] = useState(null)

  // Применяем тему Telegram и считываем id пользователя
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark')
      }
      const userId = tg.initDataUnsafe?.user?.id
      if (userId) setTelegramId(String(userId))

      // Deep link — открыть конкретный товар по артикулу
      const startParam = tg.initDataUnsafe?.start_param
      if (startParam) setStartArt(startParam)
    }
  }, [])

  // Проверяем согласие на обработку персональных данных
  useEffect(() => {
    try {
      const given = sessionStorage.getItem(CONSENT_KEY)
      setConsentGiven(given === 'true')
    } catch {
      setConsentGiven(true) // если storage недоступен — не блокируем доступ
    }
  }, [])

  function handleAcceptConsent() {
    try {
      sessionStorage.setItem(CONSENT_KEY, 'true')
    } catch {}
    setConsentGiven(true)
  }

  function addToCart(item) {
    setCart(prev => {
      if (prev.find(i => i.id === item.id)) return prev
      return [...prev, item]
    })
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => i.id !== id))
  }

  function clearCart() {
    setCart([])
  }

  function toggleFavorite(item) {
    setFavorites(prev => {
      const exists = prev.find(i => i.id === item.id)
      if (exists) return prev.filter(i => i.id !== item.id)
      return [...prev, item]
    })
  }

  async function refreshFavorites() {
    if (favorites.length === 0) return
    try {
      const base = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${base}/items/by-ids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: favorites.map(f => f.id) }),
      })
      if (!res.ok) return
      const updated = await res.json()
      setFavorites(prev => prev.map(f => updated.find(u => u.id === f.id) || f))
    } catch {
      // тихо игнорируем — избранное останется со старыми данными
    }
  }

  if (!consentGiven) {
    return <PrivacyConsent onAccept={handleAcceptConsent} />
  }

  return (
    <div className="app-shell">
      {/* Переключатель режима */}
      <header className="app-header">
        <div className="logo">
          Нежный <span>Ресейл</span>
        </div>
        <div className="mode-toggle">
          <button
            className={mode === 'buyer' ? 'active' : ''}
            onClick={() => setMode('buyer')}
          >
            Каталог
          </button>
          <button
            className={mode === 'owner' ? 'active' : ''}
            onClick={() => setMode('owner')}
          >
            Владелец
          </button>
          <button onClick={() => setShowAbout(true)}>
            О нас
          </button>
        </div>
      </header>

      <main className="app-main">
        {mode === 'buyer' ? (
          <BuyerView
            cart={cart}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onClearCart={clearCart}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onRefreshFavorites={refreshFavorites}
            telegramId={telegramId}
            startArt={startArt}
            onStartArtHandled={() => setStartArt(null)}
          />
        ) : (
          <OwnerView />
        )}
      </main>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}
