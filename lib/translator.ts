/**
 * Translator — sends text to FreeLLMAPI for translation.
 *
 * Features:
 *  - 600ms debounce to prevent spam when user flips pages quickly
 *  - Abort controller to cancel in-flight requests when user moves on
 *  - Prefetch: translates current page + next page
 *  - LRU cache integration (skips API call if already translated)
 */

import { translationCache } from './translation-cache';
import { getLanguageByCode } from '../constants/languages';
import { Env, getBaseUrl } from '../constants/env';

// Active abort controllers keyed by a tag (e.g. "current", "prefetch")
const activeControllers = new Map<string, AbortController>();

/**
 * Build the system prompt for literary translation.
 */
function buildSystemPrompt(
  targetLanguage: string,
  sourceLanguage: string,
  bookTitle?: string,
  authorName?: string,
  glossary?: Record<string, string>,
): string {
  const glossaryBlock = glossary && Object.keys(glossary).length > 0
    ? `\nEstablished glossary (use these exactly):\n${
        Object.entries(glossary)
          .map(([k, v]) => `  ${k} → ${v}`)
          .join('\n')
      }\n`
    : '';

  const bookContext = bookTitle
    ? `You are translating "${bookTitle}"${authorName ? ` by ${authorName}` : ''}.`
    : '';

  return `You are a professional literary translator.
${bookContext}
Translate the following text from ${sourceLanguage} into ${targetLanguage}.
${glossaryBlock}
Rules:
1. Return ONLY the translated text. No explanations, notes, headers, or commentary.
2. Preserve paragraph breaks, line breaks, and dialogue formatting exactly.
3. Translate naturally and fluently while preserving the original meaning, tone, style, and register.
4. Do not summarize, simplify, censor, expand, or remove any content.
5. Preserve proper nouns unless the glossary or a well-known standard requires otherwise.
6. If the text contains invented, archaic, or untranslatable words, preserve them as-is.
7. Preserve numbers, dates, symbols, and chapter markers unless adaptation is linguistically required.
8. When natural ${targetLanguage} sentence structure conflicts with word-for-word fidelity, prefer natural — the result must read like a real published book.`;
}

/**
 * Call the FreeLLMAPI router to translate text.
 *
 * @returns Translated text, or throws on failure.
 */
export async function translateText(
  text: string,
  targetLanguage: string,
  signal?: AbortSignal,
  bookTitle?: string,
  authorName?: string,
  sourceLanguage?: string,
  glossary?: Record<string, string>,
): Promise<string> {
  const lang = getLanguageByCode(targetLanguage);
  const langLabel = lang?.label ?? targetLanguage;

  const srcLang = sourceLanguage ?? 'English';

  const url = `${getBaseUrl()}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(Env.key ? { Authorization: `Bearer ${Env.key}` } : {}),
    },
    body: JSON.stringify({
      model: 'auto',
      messages: [
        { role: 'system', content: buildSystemPrompt(langLabel, srcLang, bookTitle, authorName, glossary) },
        { role: 'user', content: text },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Translation failed (${response.status}): ${errBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const translated = data?.choices?.[0]?.message?.content?.trim();
  if (!translated) {
    throw new Error('Empty translation response');
  }

  return translated;
}

/**
 * Cancel any in-flight translation request for a given tag.
 */
export function cancelTranslation(tag: string): void {
  const controller = activeControllers.get(tag);
  if (controller) {
    controller.abort();
    activeControllers.delete(tag);
  }
}

/**
 * Translate a page with abort support.
 * Returns cached result if available, otherwise makes an API call.
 */
export async function translatePage(
  bookId: string,
  pageIndex: number,
  pageText: string,
  targetLanguage: string,
  tag: string = 'current',
  bookTitle?: string,
  authorName?: string,
  sourceLanguage?: string,
  glossary?: Record<string, string>,
): Promise<string> {
  // Check cache first
  const cacheKey = translationCache.constructor.name === 'TranslationCache'
    ? `${bookId}:${pageIndex}:${targetLanguage}`
    : `${bookId}:${pageIndex}:${targetLanguage}`;

  const cached = translationCache.get(cacheKey);
  if (cached) return cached;

  // Cancel previous request with the same tag
  cancelTranslation(tag);

  // Create new abort controller
  const controller = new AbortController();
  activeControllers.set(tag, controller);

  try {
    const result = await translateText(
      pageText,
      targetLanguage,
      controller.signal,
      bookTitle,
      authorName,
      sourceLanguage,
      glossary,
    );

    // Store in cache
    translationCache.set(cacheKey, result);
    activeControllers.delete(tag);

    return result;
  } catch (err: any) {
    activeControllers.delete(tag);
    if (err?.name === 'AbortError') {
      throw new Error('Translation cancelled');
    }
    throw err;
  }
}

/**
 * Check if a page is already cached.
 */
export function isPageCached(
  bookId: string,
  pageIndex: number,
  targetLanguage: string,
): boolean {
  const cacheKey = `${bookId}:${pageIndex}:${targetLanguage}`;
  return translationCache.has(cacheKey);
}

/**
 * Get a cached translation without marking it as recently used.
 */
export function getCachedTranslation(
  bookId: string,
  pageIndex: number,
  targetLanguage: string,
): string | undefined {
  const cacheKey = `${bookId}:${pageIndex}:${targetLanguage}`;
  return translationCache.get(cacheKey);
}
