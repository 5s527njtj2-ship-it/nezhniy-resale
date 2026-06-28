import { useState } from 'react'
import './PhotoGallery.css'

export default function PhotoGallery({ photos, onClose }) {
  const [index, setIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState(null)

  function prev() {
    setIndex(i => (i === 0 ? photos.length - 1 : i - 1))
  }
  function next() {
    setIndex(i => (i === photos.length - 1 ? 0 : i + 1))
  }

  function handleTouchStart(e) {
    setTouchStartX(e.touches[0].clientX)
  }
  function handleTouchEnd(e) {
    if (touchStartX === null) return
    const deltaX = e.changedTouches[0].clientX - touchStartX
    if (deltaX > 50) prev()
    else if (deltaX < -50) next()
    setTouchStartX(null)
  }

  return (
    <div className="gallery-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <button className="gallery-close" onClick={onClose}>✕</button>

      <div
        className="gallery-stage"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <img src={photos[index]} alt={`Фото ${index + 1}`} />

        {photos.length > 1 && (
          <>
            <button className="gallery-nav gallery-prev" onClick={prev}>‹</button>
            <button className="gallery-nav gallery-next" onClick={next}>›</button>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="gallery-dots">
          {photos.map((_, i) => (
            <span key={i} className={`gallery-dot ${i === index ? 'active' : ''}`} onClick={() => setIndex(i)} />
          ))}
        </div>
      )}
    </div>
  )
}
