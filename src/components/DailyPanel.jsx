import { useState, useEffect } from 'react'
import './DailyPanel.css'

function parseContent(data) {
  if (!data) return null
  try {
    const raw = data?.content?.[0]?.text
    return raw ? JSON.parse(raw) : null
  } catch {
    return data?.content?.[0]?.text ? { raw: data.content[0].text } : null
  }
}

export default function DailyPanel() {
  const [open, setOpen] = useState(false)
  const [calendars, setCalendars] = useState(null)
  const [parsha, setParsha] = useState(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    if (calendars) { setOpen(o => !o); return }
    setLoading(true)
    setOpen(true)
    try {
      const [calRes, parshaRes] = await Promise.all([
        fetch('/api/calendars'),
        fetch('/api/parsha'),
      ])
      const [cal, par] = await Promise.all([calRes.json(), parshaRes.json()])
      setCalendars(parseContent(cal))
      setParsha(parseContent(par))
    } catch {
      setCalendars({ error: true })
    } finally {
      setLoading(false)
    }
  }

  const calItems = Array.isArray(calendars) ? calendars : (calendars?.calendar_items || calendars?.items || [])

  return (
    <div className="daily-panel">
      <button className="daily-btn" onClick={load}>
        📅 Today's Learning {open ? '▲' : '▼'}
      </button>

      {open && (
        <div className="daily-dropdown">
          {loading && <div className="daily-loading"><div className="dp-spinner" /> Loading…</div>}

          {!loading && (
            <>
              {parsha && (
                <div className="daily-section">
                  <div className="daily-label">Parsha</div>
                  <div className="daily-value">
                    {parsha.parasha || parsha.parsha || parsha.name || parsha.raw || JSON.stringify(parsha)}
                  </div>
                </div>
              )}

              {calItems.length > 0 && calItems.map((item, i) => (
                <div key={i} className="daily-section">
                  <div className="daily-label">{item.title?.en || item.title || item.type || 'Study'}</div>
                  <div className="daily-value">{item.displayValue?.en || item.ref || item.value || ''}</div>
                  {item.displayValue?.he && (
                    <div className="daily-value-he hebrew">{item.displayValue.he}</div>
                  )}
                </div>
              ))}

              {calItems.length === 0 && !parsha && (
                <div className="daily-section">
                  <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No calendar data available.</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
