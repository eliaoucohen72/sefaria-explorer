import './SearchResults.css'

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

export default function SearchResults({ results, onSelect }) {
  const items = parseContent(results)

  if (!items || items.length === 0) {
    return (
      <div className="no-results">
        <span>📭</span>
        <p>No results found. Try a different search term or a specific reference like <em>Genesis 1:1</em>.</p>
      </div>
    )
  }

  return (
    <div className="results-container">
      <div className="results-header">
        <span className="results-count">{items.length} result{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="results-list">
        {items.map((item, i) => (
          <ResultCard key={i} item={item} onSelect={onSelect} />
        ))}
      </div>
    </div>
  )
}

function ResultCard({ item, onSelect }) {
  const ref = item.ref || item.reference || item.title || ''
  const snippet = stripHtml(item.text || item.snippet || item.en || '')
  const heSnippet = stripHtml(item.he || item.hebrew || '')
  const category = item.category || item.type || ''

  return (
    <button className="result-card" onClick={() => onSelect(ref)}>
      <div className="result-card-top">
        <div className="result-ref-row">
          <span className="result-ref">{ref}</span>
          {category && <span className="result-category">{category}</span>}
        </div>
        <span className="result-arrow">→</span>
      </div>

      {heSnippet && (
        <p className={`result-snippet hebrew`}>
          {heSnippet.length > 180 ? heSnippet.slice(0, 180) + '…' : heSnippet}
        </p>
      )}

      {snippet && (
        <p className={`result-snippet ${isHebrew(snippet) ? 'hebrew' : ''}`}>
          {snippet.length > 200 ? snippet.slice(0, 200) + '…' : snippet}
        </p>
      )}
    </button>
  )
}
