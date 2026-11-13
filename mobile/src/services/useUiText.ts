import { useCallback } from 'react';
import { useAppLanguage } from './useAppLanguage';
import { translateUi } from './uiText';

export function useUiText() {
  const { language, languageError } = useAppLanguage();
  const t = useCallback((text: string) => translateUi(language, text), [language]);
  return { language, languageError, t };
}
