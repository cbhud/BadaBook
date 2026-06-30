/**
 * LRU translation cache — avoids re-translating pages the user already visited.
 *
 * Key format: `${bookId}:${pageIndex}:${languageCode}`
 * Max 100 entries (roughly 100 pages of translated text).
 */

const MAX_ENTRIES = 100;

interface CacheEntry {
  key: string;
  value: string;
  timestamp: number;
}

class TranslationCache {
  private cache = new Map<string, CacheEntry>();

  /** Build a cache key from book/page/language. */
  static key(bookId: string, pageIndex: number, language: string): string {
    return `${bookId}:${pageIndex}:${language}`;
  }

  /** Get a cached translation, or undefined if not cached. */
  get(key: string): string | undefined {
    const entry = this.cache.get(key);
    if (entry) {
      // Move to end (most recent)
      this.cache.delete(key);
      entry.timestamp = Date.now();
      this.cache.set(key, entry);
      return entry.value;
    }
    return undefined;
  }

  /** Store a translated page in the cache. */
  set(key: string, value: string): void {
    // If already exists, delete first to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest entries if at capacity
    while (this.cache.size >= MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }

    this.cache.set(key, { key, value, timestamp: Date.now() });
  }

  /** Check if a key exists in the cache. */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /** Clear all cached translations. */
  clear(): void {
    this.cache.clear();
  }

  /** Current number of cached entries. */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const translationCache = new TranslationCache();
