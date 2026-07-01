import { useState } from 'react'
import SearchBar from './components/SearchBar'
import SearchResults from './components/SearchResults'
import TextViewer from './components/TextViewer'
import DailyPanel from './components/DailyPanel'
import { useLang } from './LangContext'
import './App.css'

export default function App() {
  const { lang, setLang, t, isHe } = useLang()
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [selectedRef, setSelectedRef] = useState(null)
  const [textData, setTextData] = useState(null)
  const [linksData, setLinksData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [textLoading, setTextLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSearch(q) {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setSelectedRef(null)
    setTextData(null)
    setLinksData(null)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      setSearchResults(data)
    } catch {
      setError('Search failed. Is the server running?')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectRef(ref) {
    setSelectedRef(ref)
    setTextLoading(true)
    setTextData(null)
    setLinksData(null)
    try {
      const [textRes, linksRes] = await Promise.all([
        fetch(`/api/text?ref=${encodeURIComponent(ref)}`),
        fetch(`/api/links?ref=${encodeURIComponent(ref)}`),
      ])
      const [text, links] = await Promise.all([textRes.json(), linksRes.json()])
      setTextData(text)
      setLinksData(links)
    } catch {
      setError('Failed to load text.')
    } finally {
      setTextLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-he">ספריא</span>
            <span className="logo-en">{t.appSubtitle}</span>
          </div>
          <div className="header-right">
            <div className="lang-toggle">
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
              <button className={lang === 'he' ? 'active' : ''} onClick={() => setLang('he')}>עב</button>
            </div>
            <DailyPanel onSelect={handleSelectRef} />
          </div>
        </div>
      </header>

      <main className="app-main">
        <SearchBar onSearch={handleSearch} loading={loading} placeholder={t.searchPlaceholder} searchLabel={t.search} />

        {error && <div className="error-msg">{error}</div>}

        <div className="content-area">
          {searchResults && !selectedRef && (
            <SearchResults results={searchResults} onSelect={handleSelectRef} query={query} setQuery={setQuery} />
          )}

          {selectedRef && (
            <TextViewer
              ref_={selectedRef}
              textData={textData}
              linksData={linksData}
              loading={textLoading}
              onBack={() => { setSelectedRef(null); setTextData(null); setLinksData(null) }}
              onSelectRef={handleSelectRef}
            />
          )}

          {!searchResults && !selectedRef && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📖</div>
              <h2>{t.exploreTitle}</h2>
              <p>{t.exploreSubtitle}</p>
              <div className="suggestions">
                {['Genesis 1:1', 'Shabbat 31a', 'Avot 1:1', 'love', 'שלום'].map(s => (
                  <button key={s} className="suggestion-chip" onClick={() => { setQuery(s); handleSearch(s) }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
