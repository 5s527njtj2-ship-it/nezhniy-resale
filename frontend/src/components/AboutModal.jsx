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
            <div className="about-value">Нежный Ресейл<br />Москва, Петровско-Разумовский пр-д, 15</div>
          </div>

          <div className="about-block">
            <div className="about-label">Режим работы</div>
            <div className="about-value">Уточняйте время работы по телефону или в Telegram</div>
          </div>

          <div className="about-block">
            <div className="about-label">Контакты</div>
            <div className="about-value">
              <a href="tel:+79859197555" className="about-link">📞 +7 (985) 919-75-55</a><br />
              <a href="https://t.me/negniy_resale" target="_blank" rel="noopener noreferrer" className="about-link">💬 t.me/negniy_resale</a>
            </div>
          </div>

          <div className="about-block">
            <div className="about-label">О нас</div>
            <div className="about-value">
              Ресейл-магазин премиум-класса в Москве. Только 100% оригинал —
              никаких реплик и подделок. Большой выбор брендовой одежды, обуви и аксессуаров.
              Рейтинг 4.8 на Яндекс Картах (167 оценок).
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
