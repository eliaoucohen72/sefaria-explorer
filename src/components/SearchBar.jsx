import { useState } from 'react'
import { useLang } from '../LangContext'
import './SearchBar.css'

export default function SearchBar({ onSearch, loading, placeholder, searchLabel }) {
  const { isHe } = useLang()
  const [value, setValue] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    onSearch(value)
  }

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="search-wrapper">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder={placeholder || 'Search texts, references, topics…'}
          dir={isHe ? 'rtl' : 'ltr'}
          autoFocus
        />
        <button className="search-btn" type="submit" disabled={loading || !value.trim()}>
          {loading ? <span className="spinner" /> : (searchLabel || 'Search')}
        </button>
      </div>
    </form>
  )
}
