/**
 * EPUB parser — extracts chapter text from .epub files.
 *
 * EPUB files are ZIP archives containing XHTML chapters.
 * We parse the container.xml → .opf manifest → spine order
 * and extract plain text from each chapter.
 */

import * as FileSystem from 'expo-file-system/legacy';
import JSZip from 'jszip';

export interface EpubChapter {
  id: string;
  title: string;
  text: string;
}

export interface ParsedEpub {
  title: string;
  author: string;
  chapters: EpubChapter[];
}

// ── HTML → plain text ──────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html
    // Block elements → newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/blockquote>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&ndash;/g, '\u2013')
    .replace(/&hellip;/g, '\u2026')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
    // Collapse excessive whitespace
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

// ── XML helpers (minimal, no DOM parser needed) ────────────────────────────

function getTagContent(xml: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : '';
}

function getAttr(tag: string, attr: string): string {
  const re = new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i');
  const m = tag.match(re);
  return m ? m[1] : '';
}

// ── Main parser ────────────────────────────────────────────────────────────

export async function parseEpub(fileUri: string): Promise<ParsedEpub> {
  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const zip = await JSZip.loadAsync(base64, { base64: true });

  // 1. Find the .opf file via container.xml
  const containerXml = await zip.file('META-INF/container.xml')?.async('text');
  if (!containerXml) throw new Error('Invalid EPUB: no container.xml');

  const rootfileMatch = containerXml.match(/<rootfile[^>]+full-path=["']([^"']+)["']/i);
  if (!rootfileMatch) throw new Error('Invalid EPUB: no rootfile path');
  const opfPath = rootfileMatch[1];
  const opfDir = opfPath.includes('/') ? opfPath.substring(0, opfPath.lastIndexOf('/') + 1) : '';

  // 2. Parse the OPF file
  const opfXml = await zip.file(opfPath)?.async('text');
  if (!opfXml) throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);

  // Extract metadata
  const title = getTagContent(opfXml, 'dc:title') || getTagContent(opfXml, 'title') || 'Untitled';
  const author = getTagContent(opfXml, 'dc:creator') || getTagContent(opfXml, 'creator') || 'Unknown Author';

  // 3. Build manifest map (id → href)
  const manifest: Record<string, string> = {};
  const manifestSection = getTagContent(opfXml, 'manifest');
  const itemRegex = /<item\s[^>]*>/gi;
  let itemMatch;
  while ((itemMatch = itemRegex.exec(manifestSection)) !== null) {
    const tag = itemMatch[0];
    const id = getAttr(tag, 'id');
    const href = getAttr(tag, 'href');
    const mediaType = getAttr(tag, 'media-type');
    if (id && href && (mediaType.includes('xhtml') || mediaType.includes('html'))) {
      manifest[id] = href;
    }
  }

  // 4. Parse spine (reading order)
  const spineSection = getTagContent(opfXml, 'spine');
  const spineRefs: string[] = [];
  const itemrefRegex = /<itemref\s[^>]*>/gi;
  let refMatch;
  while ((refMatch = itemrefRegex.exec(spineSection)) !== null) {
    const idref = getAttr(refMatch[0], 'idref');
    if (idref && manifest[idref]) {
      spineRefs.push(idref);
    }
  }

  // 5. Load and extract text from each chapter in spine order
  const chapters: EpubChapter[] = [];

  for (const ref of spineRefs) {
    const href = manifest[ref];
    const fullPath = opfDir + href;

    const file = zip.file(fullPath);
    if (!file) continue;

    const html = await file.async('text');
    const text = stripHtml(html);

    // Skip very short/empty chapters (TOC pages, title pages, etc.)
    if (text.length < 20) continue;

    // Try to extract a chapter title from headings
    const headingMatch = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
    const chapterTitle = headingMatch
      ? stripHtml(headingMatch[1]).substring(0, 80)
      : `Chapter ${chapters.length + 1}`;

    chapters.push({
      id: ref,
      title: chapterTitle,
      text,
    });
  }

  return { title, author, chapters };
}
