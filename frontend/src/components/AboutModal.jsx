import './AboutModal.css'

export default function AboutModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal about-modal">
        <div className="modal-header">
          <h3>О магазине</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="about-body">
          <div className="about-block">
            <div className="about-label">Адрес</div>
            <div className="about-value">Нежный Ресейл<br />Петровско-Разумовский пр-т, 15</div>
          </div>

          <div className="about-block">
            <div className="about-label">Режим работы</div>
            <div className="about-value">Пн–Сб: 10:00–20:00<br />Вс: выходной</div>
          </div>

          <div className="about-block">
            <div className="about-label">Контакты</div>
            <div className="about-value">
              <a href="tel:+70000000000" className="about-link">📞 +7 (000) 000-00-00</a>
            </div>
          </div>

          <div className="about-block">
            <div className="about-label">Мы в соцсетях</div>
            <div className="about-socials">
              <a href="#" target="_blank" rel="noopener noreferrer" className="social-chip">Instagram</a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="social-chip">Telegram</a>
              <a href="#" target="_blank" rel="noopener noreferrer" className="social-chip">VK</a>
            </div>
          </div>

          <div className="about-note">
            Бронирование вещей действует 1 час перед личной встречей или по индивидуальной договорённости с продавцом.
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-submit" onClick={onClose}>Понятно</button>
        </div>
      </div>
    </div>
  )
}
