/**
 * Expo public runtime configuration.
 *
 * Values prefixed with EXPO_PUBLIC_ are embedded in the app bundle. Do not put
 * API passwords, database URLs, or private server secrets here.
 */

declare const process: {
  env: {
    EXPO_PUBLIC_BASE_URL?: string;
    EXPO_PUBLIC_KEY?: string;
    EXPO_PUBLIC_PDFJS_URL?: string;
    EXPO_PUBLIC_PDFJS_WORKER_URL?: string;
  };
};

const rawBaseUrl = process.env.EXPO_PUBLIC_BASE_URL?.trim() ?? '';
const rawKey = process.env.EXPO_PUBLIC_KEY?.trim() ?? '';
const rawPdfJsUrl = process.env.EXPO_PUBLIC_PDFJS_URL?.trim() ?? '';
const rawPdfJsWorkerUrl = process.env.EXPO_PUBLIC_PDFJS_WORKER_URL?.trim() ?? '';

export const Env = {
  baseUrl: rawBaseUrl.replace(/\/+$/, ''),
  key: rawKey,
  pdfJsUrl: rawPdfJsUrl,
  pdfJsWorkerUrl: rawPdfJsWorkerUrl,
};

export function getBaseUrl(): string {
  if (!Env.baseUrl) {
    throw new Error('Missing EXPO_PUBLIC_BASE_URL. Add it to .env for local builds or to the selected EAS environment for cloud builds.');
  }

  return Env.baseUrl;
}

export function hasPdfJsConfig(): boolean {
  return Boolean(Env.pdfJsUrl && Env.pdfJsWorkerUrl);
}
