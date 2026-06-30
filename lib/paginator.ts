/**
 * Paginator — splits long text into screen-sized pages.
 *
 * Splits at paragraph boundaries (\n\n) to avoid cutting mid-sentence.
 * Target is ~1600 characters per page (adjustable by font size).
 */

const BASE_CHARS_PER_PAGE = 1600;
const MIN_CHARS_PER_PAGE = 400;

/**
 * Paginate a block of text into an array of page strings.
 *
 * @param text      Full text to paginate.
 * @param fontSize  Current reader font size (default 18).
 *                  Larger fonts → fewer chars per page.
 */
export function paginateText(text: string, fontSize: number = 18): string[] {
  if (!text || !text.trim()) return [];

  // Adjust chars per page based on font size (larger font = less text per page)
  const scaleFactor = 18 / fontSize;
  const charsPerPage = Math.max(MIN_CHARS_PER_PAGE, Math.round(BASE_CHARS_PER_PAGE * scaleFactor));

  const paragraphs = text.split(/\n\n+/);
  const pages: string[] = [];
  let currentPage = '';

  for (const para of paragraphs) {
    const trimmed = para.trim();
    if (!trimmed) continue;

    // If adding this paragraph would exceed the limit and we already have content,
    // start a new page.
    if (currentPage.length + trimmed.length > charsPerPage && currentPage.length > 0) {
      pages.push(currentPage.trim());
      currentPage = trimmed;
    } else {
      currentPage += (currentPage ? '\n\n' : '') + trimmed;
    }
  }

  // Push the last page
  if (currentPage.trim()) {
    pages.push(currentPage.trim());
  }

  return pages;
}

/**
 * Combine all chapter texts into a single flat array of pages.
 * Returns page strings and a mapping of page index → chapter index.
 */
export function paginateChapters(
  chapters: { text: string }[],
  fontSize: number = 18,
): { pages: string[]; pageToChapter: number[] } {
  const pages: string[] = [];
  const pageToChapter: number[] = [];

  for (let ci = 0; ci < chapters.length; ci++) {
    const chapterPages = paginateText(chapters[ci].text, fontSize);
    for (const p of chapterPages) {
      pages.push(p);
      pageToChapter.push(ci);
    }
  }

  return { pages, pageToChapter };
}
