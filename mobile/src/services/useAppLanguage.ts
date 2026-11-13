import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { api } from './api';
import { getStorageItem, setStorageItem } from './storage';

export function useAppLanguage() {
  const [language, setLanguage] = useState('English');
  const [languageError, setLanguageError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    let hasSavedLanguage = false;

    getStorageItem('agrilearn_language')
      .then(async (savedLanguage) => {
        if (!active) return;
        if (savedLanguage) {
          hasSavedLanguage = true;
          setLanguage(savedLanguage);
          setLanguageError('');
          return;
        }

        const { user } = await api.profile.get();
        if (!active) return;
        setLanguage(user.language || 'English');
        setLanguageError('');
        await setStorageItem('agrilearn_language', user.language || 'English');
      })
      .catch((error: unknown) => {
        if (active && !hasSavedLanguage) {
          setLanguageError(error instanceof Error ? error.message : 'Could not load your language preference.');
        }
      });

    return () => { active = false; };
  }, []));

  return { language, languageError };
}
