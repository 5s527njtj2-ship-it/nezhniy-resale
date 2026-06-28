import { useState } from 'react'
import './PrivacyConsent.css'

export default function PrivacyConsent({ onAccept }) {
  const [checked, setChecked] = useState(false)

  return (
    <div className="privacy-overlay">
      <div className="privacy-card">
        <div className="privacy-icon">🔒</div>
        <h2>Обработка персональных данных</h2>
        <p className="privacy-text">
          Продолжая использовать приложение, вы соглашаетесь на обработку
          персональных данных (имя, номер телефона, комментарий к заявке)
          в целях оформления заявки на покупку или бронирование товара,
          в соответствии с требованиями законодательства РФ о персональных данных.
        </p>
        <label className="privacy-checkbox">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
          />
          <span>Я согласен(на) с условиями обработки персональных данных</span>
        </label>
        <button
          className="privacy-btn"
          disabled={!checked}
          onClick={onAccept}
        >
          Продолжить
        </button>
      </div>
    </div>
  )
}
