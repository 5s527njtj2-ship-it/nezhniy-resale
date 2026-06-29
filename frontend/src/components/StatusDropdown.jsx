import { useState } from 'react'
import { ORDER_STATUSES, STATUS_COLORS } from '../orderStatus.js'
import './StatusDropdown.css'

export default function StatusDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const current = STATUS_COLORS[value] || STATUS_COLORS['Новая']

  function handleSelect(status) {
    setOpen(false)
    if (status !== value) onChange(status)
  }

  return (
    <div className="status-dropdown">
      <button
        type="button"
        className="status-dropdown-trigger"
        style={{ background: current.bg, color: current.color, borderColor: current.border }}
        onClick={() => setOpen(v => !v)}
      >
        {value}
        <span className="status-dropdown-arrow">▾</span>
      </button>

      {open && (
        <>
          <div className="status-dropdown-backdrop" onClick={() => setOpen(false)} />
          <div className="status-dropdown-menu">
            {ORDER_STATUSES.map(status => {
              const style = STATUS_COLORS[status]
              return (
                <button
                  key={status}
                  type="button"
                  className={`status-dropdown-option ${status === value ? 'active' : ''}`}
                  onClick={() => handleSelect(status)}
                >
                  <span className="status-dot" style={{ background: style.color }} />
                  {status}
                  {status === value && <span className="status-check">✓</span>}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
