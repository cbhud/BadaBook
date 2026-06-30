/**
 * Supported translation languages — Latin-script only.
 */

export interface Language {
  code: string;
  label: string;
  nativeName: string;
}

export const LANGUAGES: Language[] = [
  { code: 'sr-Latn', label: 'Serbian (Latin)',  nativeName: 'Srpski' },
  { code: 'en',      label: 'English',          nativeName: 'English' },
  { code: 'es',      label: 'Spanish',          nativeName: 'Español' },
  { code: 'pt',      label: 'Portuguese',       nativeName: 'Português' },
  { code: 'fr',      label: 'French',           nativeName: 'Français' },
  { code: 'de',      label: 'German',           nativeName: 'Deutsch' },
  { code: 'it',      label: 'Italian',          nativeName: 'Italiano' },
  { code: 'nl',      label: 'Dutch',            nativeName: 'Nederlands' },
  { code: 'pl',      label: 'Polish',           nativeName: 'Polski' },
  { code: 'cs',      label: 'Czech',            nativeName: 'Čeština' },
  { code: 'sk',      label: 'Slovak',           nativeName: 'Slovenčina' },
  { code: 'hr',      label: 'Croatian',         nativeName: 'Hrvatski' },
  { code: 'bs',      label: 'Bosnian',          nativeName: 'Bosanski' },
  { code: 'sl',      label: 'Slovenian',        nativeName: 'Slovenščina' },
  { code: 'ro',      label: 'Romanian',         nativeName: 'Română' },
  { code: 'hu',      label: 'Hungarian',        nativeName: 'Magyar' },
  { code: 'tr',      label: 'Turkish',          nativeName: 'Türkçe' },
  { code: 'sv',      label: 'Swedish',          nativeName: 'Svenska' },
  { code: 'no',      label: 'Norwegian',        nativeName: 'Norsk' },
  { code: 'da',      label: 'Danish',           nativeName: 'Dansk' },
  { code: 'fi',      label: 'Finnish',          nativeName: 'Suomi' },
  { code: 'id',      label: 'Indonesian',       nativeName: 'Bahasa Indonesia' },
  { code: 'ms',      label: 'Malay',            nativeName: 'Bahasa Melayu' },
];

export function getLanguageByCode(code: string): Language | undefined {
  return LANGUAGES.find((l) => l.code === code);
}
