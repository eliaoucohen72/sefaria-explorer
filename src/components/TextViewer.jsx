import { useState } from 'react'
import './TextViewer.css'

function parseContent(data) {
  if (!data) return null
  try {
    const raw = data?.content?.[0]?.text
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return typeof data?.content?.[0]?.text === 'string' ? { raw: data.content[0].text } : null
  }
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
}

function flattenVerses(val) {
  if (!val) return []
  if (typeof val === 'string') return [val]
  if (Array.isArray(val)) return val.flatMap(flattenVerses)
  return []
}

export default function TextViewer({ ref_, textData, linksData, loading, onBack, onSelectRef }) {
  const [activeTab, setActiveTab] = useState('text')
  const [showHe, setShowHe] = useState(true)
  const [showEn, setShowEn] = useState(true)

  const text = parseContent(textData)
  const links = parseContent(linksData)

  const enVerses = flattenVerses(text?.text || text?.en)
  const heVerses = flattenVerses(text?.he)

  const maxVerses = Math.max(enVerses.length, heVerses.length)

  const linksList = Array.isArray(links) ? links : (links?.links || [])

  return (
    <div className="text-viewer">
      <div className="tv-header">
        <button className="back-btn" onClick={onBack}>
          ← Back to results
        </button>
        <div className="tv-title">
          <h1>{ref_}</h1>
          {text?.categories && (
            <div className="tv-cats">
              {text.categories.map((c, i) => (
                <span key={i} className="tv-cat">{c}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {loading && (
        <div className="tv-loading">
          <div className="tv-spinner" />
          <span>Loading text…</span>
        </div>
      )}

      {!loading && text && (
        <>
          <div className="tv-tabs">
            <button className={`tv-tab ${activeTab === 'text' ? 'active' : ''}`} onClick={() => setActiveTab('text')}>
              Text {maxVerses > 0 && <span className="tab-count">{maxVerses}</span>}
            </button>
            <button className={`tv-tab ${activeTab === 'links' ? 'active' : ''}`} onClick={() => setActiveTab('links')}>
              Commentaries & Links {linksList.length > 0 && <span className="tab-count">{linksList.length}</span>}
            </button>
          </div>

          {activeTab === 'text' && (
            <div className="tv-text-panel">
              <div className="tv-controls">
                <label className="toggle-label">
                  <input type="checkbox" checked={showHe} onChange={e => setShowHe(e.target.checked)} />
                  <span>Hebrew</span>
                </label>
                <label className="toggle-label">
                  <input type="checkbox" checked={showEn} onChange={e => setShowEn(e.target.checked)} />
                  <span>English</span>
                </label>
              </div>

              {maxVerses > 0 ? (
                <div className="verses">
                  {Array.from({ length: maxVerses }, (_, i) => (
                    <div key={i} className="verse">
                      <span className="verse-num">{i + 1}</span>
                      <div className="verse-content">
                        {showHe && heVerses[i] && (
                          <p className="verse-he hebrew">{stripHtml(heVerses[i])}</p>
                        )}
                        {showEn && enVerses[i] && (
                          <p className="verse-en">{stripHtml(enVerses[i])}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : text.raw ? (
                <div className="raw-text">{text.raw}</div>
              ) : (
                <p className="tv-empty">No text available for this reference.</p>
              )}
            </div>
          )}

          {activeTab === 'links' && (
            <div className="tv-links-panel">
              {linksList.length === 0 ? (
                <p className="tv-empty">No commentaries found.</p>
              ) : (
                <div className="links-list">
                  {linksList.map((link, i) => (
                    <LinkCard key={i} link={link} onSelectRef={onSelectRef} />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function LinkCard({ link, onSelectRef }) {
  const [expanded, setExpanded] = useState(false)
  const ref = link.ref || link.sourceRef || link.anchorRef || ''
  const type = link.type || link.connectionType || ''
  const heText = link.he ? link.he.replace(/<[^>]*>/g, '').trim() : ''
  const enText = link.text ? link.text.replace(/<[^>]*>/g, '').trim() : ''
  const source = link.sourceHeRef || link.sourceRef || ref

  return (
    <div className="link-card">
      <div className="link-header" onClick={() => setExpanded(e => !e)}>
        <div className="link-meta">
          <span className="link-ref">{source}</span>
          {type && <span className="link-type">{type}</span>}
        </div>
        <div className="link-actions">
          {ref && (
            <button className="link-open" onClick={e => { e.stopPropagation(); onSelectRef(ref) }}>
              Open →
            </button>
          )}
          <span className="link-toggle">{expanded ? '▲' : '▼'}</span>
        </div>
      </div>
      {expanded && (
        <div className="link-body">
          {heText && <p className="link-he hebrew">{heText.slice(0, 400)}{heText.length > 400 ? '…' : ''}</p>}
          {enText && <p className="link-en">{enText.slice(0, 400)}{enText.length > 400 ? '…' : ''}</p>}
        </div>
      )}
    </div>
  )
}
