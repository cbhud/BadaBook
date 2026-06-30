/**
 * Core type definitions for BadaBook.
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
  /** Target translation language code, e.g. "sr-Latn" */
  targetLanguage: string;
  /** Reader font size in px. */
  fontSize: number;
  /** Dark mode toggle. */
  darkMode: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  targetLanguage: 'sr-Latn',
  fontSize: 18,
  darkMode: true,
};
