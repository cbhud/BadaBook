/**
 * PdfExtractor — hidden WebView that uses PDF.js to extract text from PDFs.
 *
 * Renders an invisible WebView that loads PDF.js from CDN,
 * receives a base64-encoded PDF, and returns page-by-page text
 * via the onMessage bridge.
 */

import React, { useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Env, hasPdfJsConfig } from '../constants/env';

export interface PdfExtractorHandle {
  extractText: (base64Data: string) => void;
}

interface PdfExtractorProps {
  onResult: (pages: string[]) => void;
  onError: (error: string) => void;
  onProgress?: (current: number, total: number) => void;
}

function buildPdfExtractorHtml(): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="${Env.pdfJsUrl}"></script>
</head>
<body>
<script>
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    '${Env.pdfJsWorkerUrl}';

  function base64ToUint8Array(b64) {
    var raw = atob(b64);
    var arr = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
    return arr;
  }

  async function extractText(b64) {
    try {
      var data = base64ToUint8Array(b64);
      var pdf = await pdfjsLib.getDocument({ data: data }).promise;
      var pages = [];
      for (var i = 1; i <= pdf.numPages; i++) {
        var page = await pdf.getPage(i);
        var tc = await page.getTextContent();
        // Build text by tracking Y positions to detect line/paragraph breaks
        var result = '';
        var lastY = null;
        var lastItemEndsWithSpace = false;
        for (var j = 0; j < tc.items.length; j++) {
          var item = tc.items[j];
          if (item.str === undefined) continue;
          var currentY = item.transform ? item.transform[5] : null;
          if (lastY !== null && currentY !== null) {
            var yDiff = Math.abs(currentY - lastY);
            if (yDiff > 12) {
              // Large Y gap = paragraph break
              result += '\\n\\n';
            } else if (yDiff > 1) {
              // Small Y gap = line break within paragraph
              // Add space if the previous line didn't end with one
              if (!lastItemEndsWithSpace && result.length > 0 && !result.endsWith(' ') && !result.endsWith('\\n')) {
                result += ' ';
              }
            }
          }
          // Add the text item
          result += item.str;
          lastY = currentY;
          lastItemEndsWithSpace = item.hasEOL || (item.str && item.str.endsWith(' '));
        }
        // Clean up the result
        result = result
          .replace(/  +/g, ' ')
          .replace(/\\n{3,}/g, '\\n\\n')
          .trim();
        pages.push(result);
        // Report progress
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'progress', current: i, total: pdf.numPages
        }));
      }
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'result', pages: pages
      }));
    } catch (err) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'error', message: err.message || 'PDF extraction failed'
      }));
    }
  }

  // Listen for extraction requests
  window.extractPdf = extractText;
</script>
</body>
</html>
`;
}

const PdfExtractor = forwardRef<PdfExtractorHandle, PdfExtractorProps>(
  ({ onResult, onError, onProgress }, ref) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      extractText: (base64Data: string) => {
        if (!hasPdfJsConfig()) {
          onError('Missing EXPO_PUBLIC_PDFJS_URL or EXPO_PUBLIC_PDFJS_WORKER_URL.');
          return;
        }

        if (webViewRef.current) {
          // Split base64 into chunks to avoid JS string length limits
          const chunkSize = 500000;
          const chunks = [];
          for (let i = 0; i < base64Data.length; i += chunkSize) {
            chunks.push(base64Data.slice(i, i + chunkSize));
          }

          if (chunks.length === 1) {
            webViewRef.current.injectJavaScript(
              `window.extractPdf("${base64Data}"); true;`
            );
          } else {
            // For large files, build the string in chunks
            let js = 'var _pdfB64 = "";';
            for (const chunk of chunks) {
              js += `_pdfB64 += "${chunk}";`;
            }
            js += 'window.extractPdf(_pdfB64); true;';
            webViewRef.current.injectJavaScript(js);
          }
        }
      },
    }));

    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const msg = JSON.parse(event.nativeEvent.data);
          if (msg.type === 'result') {
            onResult(msg.pages);
          } else if (msg.type === 'error') {
            onError(msg.message);
          } else if (msg.type === 'progress' && onProgress) {
            onProgress(msg.current, msg.total);
          }
        } catch {
          onError('Failed to parse PDF extractor response');
        }
      },
      [onResult, onError, onProgress],
    );

    return (
      <View style={styles.hidden}>
        <WebView
          ref={webViewRef}
          source={{ html: buildPdfExtractorHtml() }}
          onMessage={handleMessage}
          javaScriptEnabled
          originWhitelist={['*']}
          style={styles.webview}
        />
      </View>
    );
  },
);

PdfExtractor.displayName = 'PdfExtractor';

export default PdfExtractor;

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    overflow: 'hidden',
    position: 'absolute',
  },
  webview: {
    width: 1,
    height: 1,
  },
});
