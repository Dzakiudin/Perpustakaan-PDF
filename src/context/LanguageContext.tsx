"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { translations, Language, TranslationKey } from "@/lib/translations";

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, initialLanguage = "id" }: { children: React.ReactNode, initialLanguage?: string }) {
    const [language, setLangState] = useState<Language>((initialLanguage === "en" ? "en" : "id") as Language);

    // Sync state if initialLanguage changes (e.g. user logs in)
    useEffect(() => {
        if (initialLanguage && (initialLanguage === "en" || initialLanguage === "id")) {
            setLangState(initialLanguage as Language);
        }
    }, [initialLanguage]);

    const setLanguage = (lang: Language) => {
        setLangState(lang);
        // We could also store it in a cookie here for SSR
        document.cookie = `language=${lang}; path=/; max-age=31536000`;
    };

    const t = (key: TranslationKey): string => {
        return translations[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
}
