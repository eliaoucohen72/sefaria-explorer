import { createContext, useContext, useState } from 'react'
import { translations } from './i18n'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLang] = useState('en')
  const t = translations[lang]
  const isHe = lang === 'he'
  return (
    <LangContext.Provider value={{ lang, setLang, t, isHe }}>
      <div dir={isHe ? 'rtl' : 'ltr'}>
        {children}
      </div>
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
