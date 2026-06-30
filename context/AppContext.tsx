/**
 * Global application context — books, settings, and current state.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  type ReactNode,
} from 'react';
import { AppSettings, BookMeta, DEFAULT_SETTINGS } from '../types/book';
import {
  loadBooks,
  saveBooks,
  loadSettings,
  saveSettings,
} from '../lib/storage';

// ── State ──────────────────────────────────────────────────────────────────

interface AppState {
  books: BookMeta[];
  settings: AppSettings;
  isLoading: boolean;
}

const initialState: AppState = {
  books: [],
  settings: DEFAULT_SETTINGS,
  isLoading: true,
};

// ── Actions ────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_BOOKS'; books: BookMeta[] }
  | { type: 'SET_SETTINGS'; settings: AppSettings }
  | { type: 'INIT'; books: BookMeta[]; settings: AppSettings };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading };
    case 'SET_BOOKS':
      return { ...state, books: action.books };
    case 'SET_SETTINGS':
      return { ...state, settings: action.settings };
    case 'INIT':
      return {
        ...state,
        books: action.books,
        settings: action.settings,
        isLoading: false,
      };
    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────

interface AppContextType {
  state: AppState;
  addBook: (book: BookMeta) => Promise<void>;
  removeBook: (bookId: string) => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => Promise<void>;
  updateBookProgress: (bookId: string, lastPage: number) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load persisted data on mount
  useEffect(() => {
    (async () => {
      const [books, settings] = await Promise.all([
        loadBooks(),
        loadSettings(),
      ]);
      dispatch({ type: 'INIT', books, settings });
    })();
  }, []);

  const addBookAction = useCallback(async (book: BookMeta) => {
    const updated = [book, ...state.books.filter((b) => b.id !== book.id)];
    dispatch({ type: 'SET_BOOKS', books: updated });
    await saveBooks(updated);
  }, [state.books]);

  const removeBookAction = useCallback(async (bookId: string) => {
    const updated = state.books.filter((b) => b.id !== bookId);
    dispatch({ type: 'SET_BOOKS', books: updated });
    await saveBooks(updated);
  }, [state.books]);

  const updateSettingsAction = useCallback(async (partial: Partial<AppSettings>) => {
    const updated = { ...state.settings, ...partial };
    const hasChanges = Object.keys(partial).some((key) => {
      const settingKey = key as keyof AppSettings;
      return updated[settingKey] !== state.settings[settingKey];
    });

    if (!hasChanges) return;

    dispatch({ type: 'SET_SETTINGS', settings: updated });
    try {
      await saveSettings(updated);
    } catch (err) {
      dispatch({ type: 'SET_SETTINGS', settings: state.settings });
      throw err;
    }
  }, [state.settings]);

  const updateBookProgressAction = useCallback(async (bookId: string, lastPage: number) => {
    const updated = state.books.map((b) =>
      b.id === bookId ? { ...b, lastPage } : b,
    );
    dispatch({ type: 'SET_BOOKS', books: updated });
    await saveBooks(updated);
  }, [state.books]);

  return (
    <AppContext.Provider
      value={{
        state,
        addBook: addBookAction,
        removeBook: removeBookAction,
        updateSettings: updateSettingsAction,
        updateBookProgress: updateBookProgressAction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
