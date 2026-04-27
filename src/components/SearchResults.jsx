import { useState, useMemo, useRef, useEffect } from 'react'
import { useLang } from '../LangContext'
import './SearchResults.css'

function useHeTitles(books) {
  const [heTitles, setHeTitles] = useState({})
  useEffect(() => {
    if (!books.length) return
    fetch('/api/he-titles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ books }),
    })
      .then(r => r.json())
      .then(data => setHeTitles(prev => ({ ...prev, ...data })))
      .catch(() => {})
  }, [books.join('|')])
  return heTitles
}

function parseContent(data) {
  if (!data) return []
  try {
    const raw = data?.content?.[0]?.text
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function stripHtml(html) {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim()
}

function isHebrew(str) {
  return /[֐-׿]/.test(str)
}

function groupByBook(items) {
  const groups = {}
  for (const item of items) {
    const key = item.book || item.ref.split(',')[0].trim()
    if (!groups[key]) groups[key] = []
    groups[key].push(item)
  }
  return Object.entries(groups)
}

function MultiSelect({ label, options, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (val) => {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  const active = selected.length > 0

  return (
    <div className={`ms-root${active ? ' ms-active' : ''}`} ref={ref}>
      <button className="ms-trigger" onClick={() => setOpen(o => !o)}>
        <span>{label}{active ? ` (${selected.length})` : ''}</span>
        <span className="ms-caret">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="ms-dropdown">
          {options.map(opt => (
            <label key={opt} className="ms-option">
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default function SearchResults({ results, onSelect }) {
  const { t, isHe } = useLang()
  const items = parseContent(results)
  const [expanded, setExpanded] = useState({})
  const [filterLang, setFilterLang] = useState([])
  const [filterCategory, setFilterCategory] = useState([])

  const allBooks = useMemo(() => [...new Set(items.map(i => i.book).filter(Boolean))], [items])
  const heTitles = useHeTitles(allBooks)

  const langOptions = useMemo(() => [...new Set(items.map(i => i.lang).filter(Boolean))].sort(), [items])
  const categoryOptions = useMemo(() => [...new Set(items.map(i => i.category).filter(Boolean))].sort(), [items])

  const filtered = useMemo(() => items.filter(i => {
    if (filterLang.length && !filterLang.includes(i.lang)) return false
    if (filterCategory.length && !filterCategory.includes(i.category)) return false
    return true
  }), [items, filterLang, filterCategory])

  const groups = useMemo(() => groupByBook(filtered), [filtered])

  const allCollapsed = groups.every(([book]) => expanded[book] === false)

  function toggleAll() {
    const next = {}
    groups.forEach(([book]) => { next[book] = allCollapsed })
    setExpanded(next)
  }

  function isOpen(book) {
    return expanded[book] !== false
  }

  if (!items || items.length === 0) {
    return (
      <div className="no-results">
        <span>📭</span>
        <p>{t.noResults} <em>Genesis 1:1</em>.</p>
      </div>
    )
  }

  return (
    <div className="results-container">
      <div className="results-toolbar">
        <span className="results-count">{t.results(filtered.length, groups.length)}</span>
        <div className="results-filters">
          {langOptions.length > 1 && (
            <MultiSelect label={t.language} options={langOptions} selected={filterLang} onChange={setFilterLang} isHe={isHe} />
          )}
          {categoryOptions.length > 1 && (
            <MultiSelect label={t.category} options={categoryOptions} selected={filterCategory} onChange={setFilterCategory} isHe={isHe} />
          )}
          <button className="collapse-btn" onClick={toggleAll}>
            {allCollapsed ? t.expandAll : t.collapseAll}
          </button>
        </div>
      </div>

      <div className="results-list">
        {groups.map(([book, groupItems]) => (
          <div key={book} className="result-group">
            <button className="result-group-header" onClick={() => setExpanded(e => ({ ...e, [book]: !isOpen(book) }))}>
              <div className="result-group-title">
                {heTitles[book] ? (
                  isHe ? (
                    <span><span className="title-primary hebrew">{heTitles[book]}</span> <span className="title-paren">({book})</span></span>
                  ) : (
                    <span><span className="title-primary">{book}</span> <span className="title-paren hebrew">({heTitles[book]})</span></span>
                  )
                ) : (
                  <span className="title-primary">{book}</span>
                )}
              </div>
              <span className="result-group-meta">{t.passages(groupItems.length)} {isOpen(book) ? '▲' : '▼'}</span>
            </button>
            {isOpen(book) && (
              <div className="result-group-items">
                {groupItems.map((item, i) => (
                  <ResultCard key={i} item={item} onSelect={onSelect} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ResultCard({ item, onSelect }) {
  const { isHe } = useLang()
  const ref = item.ref || ''
  const snippet = stripHtml(item.snippet || '')
  const location = ref.replace(item.book + ', ', '')

  return (
    <button className="result-card" onClick={() => onSelect(ref)}>
      <div className="result-card-top">
        <span className="result-ref">{location}</span>
        <span className="result-arrow">{isHe ? '←' : '→'}</span>
      </div>
      {snippet && (
        <p className={`result-snippet ${isHebrew(snippet) ? 'hebrew' : ''}`}>
          {snippet.length > 220 ? snippet.slice(0, 220) + '…' : snippet}
        </p>
      )}
    </button>
  )
}
