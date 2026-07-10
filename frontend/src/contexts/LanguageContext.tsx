import React, { createContext, useState, useEffect } from 'react';
import { translations, type Language } from '../data/carDatabase';
import { API_BASE } from '../services/api';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const nameToCode: Record<string, string> = {
  'English': 'en',
  'Tamil': 'ta',
  'Hindi': 'hi',
  'Telugu': 'te',
  'Kannada': 'kn'
};

const codeToName: Record<string, string> = {
  'en': 'English',
  'ta': 'Tamil',
  'hi': 'Hindi',
  'te': 'Telugu',
  'kn': 'Kannada'
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const userRaw = localStorage.getItem('carmatchr_user');
    if (userRaw) {
      try {
        const u = JSON.parse(userRaw);
        if (u?.language && nameToCode[u.language]) {
          return nameToCode[u.language] as Language;
        }
      } catch (e) {}
    }
    const saved = localStorage.getItem('carmatchr_lang');
    return (saved && ['en', 'hi', 'ta', 'te', 'kn'].includes(saved)) ? saved as Language : 'en';
  });

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.language) {
        const code = nameToCode[detail.language];
        if (code) {
          setLangState(code as Language);
          localStorage.setItem('carmatchr_lang', code);
        }
      }
    };
    window.addEventListener('carmatchr_login_sync', handler);
    return () => window.removeEventListener('carmatchr_login_sync', handler);
  }, []);

  const setLang = async (l: Language) => {
    setLangState(l);
    localStorage.setItem('carmatchr_lang', l);

    // Sync logged-in user language
    const userRaw = localStorage.getItem('carmatchr_user');
    const token = localStorage.getItem('carmatchr_token');
    if (userRaw && token) {
      try {
        const u = JSON.parse(userRaw);
        const langName = codeToName[l] || 'English';

        // Background update in backend profile
        fetch(`${API_BASE}/api/users/${u.id}/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ language: langName })
        }).catch(err => console.error('Failed to sync language database profile:', err));

        // Immediate state update in AuthContext via event
        const event = new CustomEvent('carmatchr_user_lang_changed', { detail: { langName } });
        window.dispatchEvent(event);
      } catch (e) {
        console.error('Failed to sync language to user preferences:', e);
      }
    }
  };

  const t = (key: string): string => {
    const dict = translations[lang] as Record<string, string>;
    return dict[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export { LanguageContext };
