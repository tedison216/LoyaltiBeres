'use client'

import { useLanguage } from '@/lib/i18n/LanguageContext'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()
  
  return (
    <button
      onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
      className="px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold transition-colors text-sm"
      title={language === 'en' ? 'Switch to Indonesian' : 'Switch to English'}
    >
      {language === 'en' ? '🇮🇩 ID' : '🇬🇧 EN'}
    </button>
  )
}
