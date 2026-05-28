/**
 * Core type definitions for ReadABook.
 */

export interface BookMeta {
  id: string;
  title: string;
  author: string;
  format: 'epub' | 'pdf';
  fileUri: string;
  /** Number of paginated pages (computed after parsing). */
  totalPages: number;
  /** Last page the user was on. */
  lastPage: number;
  /** Unix timestamp when the book was imported. */
  addedAt: number;
}

export interface Page {
  /** Page index (0-based). */
  index: number;
  /** Original extracted text. */
  originalText: string;
  /** Translated text (populated after translation). */
  translatedText?: string;
  /** Current translation state. */
  translationState: TranslationState;
}

export type TranslationState =
  | 'idle'
  | 'translating'
  | 'translated'
  | 'error';

export interface AppSettings {
  /** FreeLLMAPI router base URL, e.g. "http://192.168.1.5:3001" */
  apiUrl: string;
  /** Unified API key for the router. */
  apiKey: string;
  /** Target translation language code, e.g. "sr-Latn" */
  targetLanguage: string;
  /** Reader font size in px. */
  fontSize: number;
  /** Dark mode toggle. */
  darkMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  apiUrl: 'http://10.0.2.2:3001',
  apiKey: 'freellmapi-change-me',
  targetLanguage: 'sr-Latn',
  fontSize: 18,
  darkMode: true,
};
