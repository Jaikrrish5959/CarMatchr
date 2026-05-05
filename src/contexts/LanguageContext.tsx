import React, { createContext, useState } from 'react';
import { translations, type Language } from '../data/carDatabase';

interface LanguageContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('carmatchr_lang');
    return (saved && ['en', 'hi', 'ta', 'te', 'kn'].includes(saved)) ? saved as Language : 'en';
  });

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem('carmatchr_lang', l);
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
