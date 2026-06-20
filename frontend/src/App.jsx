import { useState, useEffect } from 'react'
import BuyerView from './pages/BuyerView.jsx'
import OwnerView from './pages/OwnerView.jsx'
import './App.css'

export default function App() {
  const [mode, setMode] = useState('buyer') // 'buyer' | 'owner'
  const [cart, setCart] = useState([])

  // Применяем тему Telegram
  useEffect(() => {
    const tg = window.Telegram?.WebApp
    if (tg) {
      tg.ready()
      tg.expand()
      if (tg.colorScheme === 'dark') {
        document.body.classList.add('dark')
      }
    }
  }, [])

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
        </div>
      </header>

      <main className="app-main">
        {mode === 'buyer' ? (
          <BuyerView
            cart={cart}
            onAddToCart={addToCart}
            onRemoveFromCart={removeFromCart}
            onClearCart={clearCart}
          />
        ) : (
          <OwnerView />
        )}
      </main>
    </div>
  )
}
