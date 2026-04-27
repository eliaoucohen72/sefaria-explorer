import { useState } from 'react'
import './SearchBar.css'

export default function SearchBar({ onSearch, loading }) {
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
          placeholder="Search texts, references, topics… (e.g. Genesis 1:1, Shabbat, אהבה)"
          autoFocus
        />
        <button className="search-btn" type="submit" disabled={loading || !value.trim()}>
          {loading ? <span className="spinner" /> : 'Search'}
        </button>
      </div>
    </form>
  )
}
