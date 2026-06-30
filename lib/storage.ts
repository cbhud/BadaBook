/**
 * Persistent storage helpers using AsyncStorage.
 *
 * Stores: imported books list, reading progress, and app settings.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppSettings, BookMeta, DEFAULT_SETTINGS } from '../types/book';

const KEYS = {
  BOOKS: '@badabook:books',
  SETTINGS: '@badabook:settings',
} as const;

// ── Books ──────────────────────────────────────────────────────────────────

export async function loadBooks(): Promise<BookMeta[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.BOOKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveBooks(books: BookMeta[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.BOOKS, JSON.stringify(books));
}

export async function addBook(book: BookMeta): Promise<BookMeta[]> {
  const books = await loadBooks();
  // Avoid duplicates by fileUri
  const existing = books.findIndex((b) => b.fileUri === book.fileUri);
  if (existing >= 0) {
    books[existing] = book;
  } else {
    books.unshift(book); // newest first
  }
  await saveBooks(books);
  return books;
}

export async function removeBook(bookId: string): Promise<BookMeta[]> {
  let books = await loadBooks();
  books = books.filter((b) => b.id !== bookId);
  await saveBooks(books);
  return books;
}

export async function updateBookProgress(
  bookId: string,
  lastPage: number,
): Promise<void> {
  const books = await loadBooks();
  const book = books.find((b) => b.id === bookId);
  if (book) {
    book.lastPage = lastPage;
    await saveBooks(books);
  }
}

// ── Settings ───────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.SETTINGS);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      return {
        ...DEFAULT_SETTINGS,
        targetLanguage: parsed.targetLanguage ?? DEFAULT_SETTINGS.targetLanguage,
        fontSize: parsed.fontSize ?? DEFAULT_SETTINGS.fontSize,
        darkMode: parsed.darkMode ?? DEFAULT_SETTINGS.darkMode,
      };
    }
    return { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
}
