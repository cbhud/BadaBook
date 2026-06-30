/**
 * ReaderScreen - centered, distraction-free reader with live translation.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  ActivityIndicator,
  ScrollView,
  Alert,
  BackHandler,
  StatusBar,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';

import { Colors, Spacing, BorderRadius, FontSize, Reader, Shadow } from '../constants/theme';
import { getLanguageByCode } from '../constants/languages';
import { useApp } from '../context/AppContext';
import { BookMeta, TranslationState } from '../types/book';
import { parseEpub } from '../lib/epub-parser';
import { paginateChapters, paginateText } from '../lib/paginator';
import {
  translatePage,
  cancelTranslation,
  isPageCached,
  getCachedTranslation,
} from '../lib/translator';
import LanguagePicker from '../components/LanguagePicker';
import PdfExtractor, { type PdfExtractorHandle } from '../components/PdfExtractor';

const DEBOUNCE_MS = 600;
const PAGE_TURN_ZONE_RATIO = 0.18;

interface ReaderScreenProps {
  book: BookMeta;
  onBack: () => void;
}

interface PageState {
  translationState: TranslationState;
  translatedText?: string;
}

export default function ReaderScreen({ book, onBack }: ReaderScreenProps) {
  const { width } = useWindowDimensions();
  const { state, updateBookProgress } = useApp();
  const { settings } = state;

  const [pages, setPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(book.lastPage || 0);
  const [pageStates, setPageStates] = useState<Record<number, PageState>>({});
  const [loading, setLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Opening book...');
  const [showTranslated, setShowTranslated] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [sourceLanguage, setSourceLanguage] = useState('en');
  const [sourceLangPickerVisible, setSourceLangPickerVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pdfExtractorRef = useRef<PdfExtractorHandle>(null);
  const pagesRef = useRef<string[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);
  const currentPageRef = useRef(currentPage);

  const readerFontSize = Math.min(Reader.maxFontSize, Math.max(Reader.minFontSize, settings.fontSize));
  const pagePadding = width >= 1024
    ? Spacing.readerDesktop
    : width >= 768
      ? Spacing.readerTablet
      : width >= 480
        ? Spacing.xl
        : Spacing.readerMobile;
  const leftZone = width * PAGE_TURN_ZONE_RATIO;
  const rightZone = width * (1 - PAGE_TURN_ZONE_RATIO);

  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { return () => { mountedRef.current = false; }; }, []);

  const currentLang = getLanguageByCode(settings.targetLanguage);
  const sourceLang = getLanguageByCode(sourceLanguage);

  useEffect(() => {
    setPageStates({});
  }, [sourceLanguage]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sourceLangPickerVisible) {
        setSourceLangPickerVisible(false);
        return true;
      }

      if (controlsVisible) {
        setControlsVisible(false);
        Animated.timing(controlsAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
        return true;
      }

      onBack();
      return true;
    });

    return () => subscription.remove();
  }, [controlsAnim, controlsVisible, onBack, sourceLangPickerVisible]);

  const toggleControls = useCallback(() => {
    const newVisible = !controlsVisible;
    setControlsVisible(newVisible);
    Animated.timing(controlsAnim, {
      toValue: newVisible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [controlsVisible, controlsAnim]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage < 0 || newPage >= pagesRef.current.length) return;

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 80,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(newPage);
      updateBookProgress(book.id, newPage);
      scrollViewRef.current?.scrollTo({ y: 0, animated: false });
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }).start();
    });
  }, [book.id, fadeAnim, updateBookProgress]);

  const tapGesture = Gesture.Tap()
    .runOnJS(true)
    .onEnd((event) => {
      const x = event.absoluteX;
      if (x < leftZone) {
        goToPage(currentPageRef.current - 1);
      } else if (x > rightZone) {
        goToPage(currentPageRef.current + 1);
      } else {
        toggleControls();
      }
    });

  useEffect(() => {
    if (book.format === 'epub') {
      parseEpubBook();
    } else {
      parsePdfBook();
    }
  }, []);

  const parseEpubBook = async () => {
    try {
      setLoadingMsg('Parsing EPUB...');
      const parsed = await parseEpub(book.fileUri);
      setLoadingMsg(`Found ${parsed.chapters.length} chapters, paginating...`);
      const { pages: p } = paginateChapters(parsed.chapters, readerFontSize);
      setPages(p);
      setLoading(false);
    } catch (err: any) {
      Alert.alert('Parse error', err.message || 'Could not parse EPUB');
      onBack();
    }
  };

  const parsePdfBook = async () => {
    try {
      setLoadingMsg('Loading PDF...');
      const base64 = await FileSystem.readAsStringAsync(book.fileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      setLoadingMsg('Extracting text from PDF...');
      setTimeout(() => {
        pdfExtractorRef.current?.extractText(base64);
      }, 500);
    } catch (err: any) {
      Alert.alert('PDF error', err.message || 'Could not read PDF');
      onBack();
    }
  };

  const handlePdfResult = useCallback((pdfPages: string[]) => {
    if (!mountedRef.current) return;
    const validPages = pdfPages.filter((p) => p.trim().length > 10);
    if (validPages.length === 0) {
      Alert.alert('No text found', 'This PDF appears to be scanned/image-based.');
      onBack();
      return;
    }
    const allText = validPages.join('\n\n');
    const paginated = paginateText(allText, readerFontSize);
    setPages(paginated);
    setLoading(false);
  }, [onBack, readerFontSize]);

  const handlePdfError = useCallback((error: string) => {
    if (!mountedRef.current) return;
    Alert.alert('PDF error', error);
    onBack();
  }, [onBack]);

  const handlePdfProgress = useCallback((current: number, total: number) => {
    if (!mountedRef.current) return;
    setLoadingMsg(`Extracting page ${current}/${total}...`);
  }, []);

  const updatePageState = (pageIdx: number, update: Partial<PageState>) => {
    setPageStates((prev) => ({
      ...prev,
      [pageIdx]: { ...prev[pageIdx], ...update },
    }));
  };

  const translateCurrentAndNext = useCallback(
    async (pageIdx: number) => {
      const p = pagesRef.current;
      if (p.length === 0) return;

      if (pageIdx < p.length) {
        if (!isPageCached(book.id, pageIdx, settings.targetLanguage)) {
          updatePageState(pageIdx, { translationState: 'translating' });
          try {
            const result = await translatePage(
              book.id, pageIdx, p[pageIdx],
              settings.targetLanguage, 'current',
              book.title, book.author, sourceLang?.label,
            );
            if (mountedRef.current) {
              updatePageState(pageIdx, { translationState: 'translated', translatedText: result });
            }
          } catch (err: any) {
            if (err.message !== 'Translation cancelled' && mountedRef.current) {
              updatePageState(pageIdx, { translationState: 'error' });
            }
          }
        } else {
          const cached = getCachedTranslation(book.id, pageIdx, settings.targetLanguage);
          if (cached) updatePageState(pageIdx, { translationState: 'translated', translatedText: cached });
        }
      }

      const nextIdx = pageIdx + 1;
      if (nextIdx < p.length) {
        if (!isPageCached(book.id, nextIdx, settings.targetLanguage)) {
          updatePageState(nextIdx, { translationState: 'translating' });
          try {
            const result = await translatePage(
              book.id, nextIdx, p[nextIdx],
              settings.targetLanguage, 'prefetch',
              book.title, book.author, sourceLang?.label,
            );
            if (mountedRef.current) {
              updatePageState(nextIdx, { translationState: 'translated', translatedText: result });
            }
          } catch (err: any) {
            if (err.message !== 'Translation cancelled' && mountedRef.current) {
              updatePageState(nextIdx, { translationState: 'error' });
            }
          }
        } else {
          const cached = getCachedTranslation(book.id, nextIdx, settings.targetLanguage);
          if (cached) updatePageState(nextIdx, { translationState: 'translated', translatedText: cached });
        }
      }
    },
    [book.id, book.title, book.author, settings.targetLanguage, sourceLang],
  );

  const scheduleTranslation = useCallback(
    (pageIdx: number) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      cancelTranslation('current');
      cancelTranslation('prefetch');
      debounceTimer.current = setTimeout(() => {
        translateCurrentAndNext(pageIdx);
      }, DEBOUNCE_MS);
    },
    [translateCurrentAndNext],
  );

  useEffect(() => {
    if (pages.length > 0 && !loading) {
      scheduleTranslation(currentPage);
    }
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [currentPage, pages, loading, scheduleTranslation]);

  const pageState = pageStates[currentPage];
  const isTranslating = pageState?.translationState === 'translating';
  const isTranslated = pageState?.translationState === 'translated';
  const hasError = pageState?.translationState === 'error';

  const displayText = showTranslated && isTranslated && pageState?.translatedText
    ? pageState.translatedText
    : pages[currentPage] || '';

  const progress = pages.length > 0 ? ((currentPage + 1) / pages.length) * 100 : 0;
  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= pages.length - 1;

  const topBarTranslate = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 0],
  });
  const bottomBarTranslate = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [140, 0],
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar hidden />
        <PdfExtractor
          ref={pdfExtractorRef}
          onResult={handlePdfResult}
          onError={handlePdfError}
          onProgress={handlePdfProgress}
        />
        <View style={styles.loadingBook}>
          <Ionicons name="book-outline" size={34} color={Colors.reader.textStrong} />
        </View>
        <ActivityIndicator size="large" color={Colors.reader.accent} />
        <Text style={styles.loadingText}>{loadingMsg}</Text>
        <Pressable onPress={onBack} style={styles.loadingBackBtn}>
          <Text style={styles.loadingBackText}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden={!controlsVisible} barStyle="light-content" backgroundColor="transparent" translucent />

      {book.format === 'pdf' && (
        <PdfExtractor
          ref={pdfExtractorRef}
          onResult={handlePdfResult}
          onError={handlePdfError}
          onProgress={handlePdfProgress}
        />
      )}

      <GestureDetector gesture={tapGesture}>
        <View style={styles.readingWrapper}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.readingArea}
            contentContainerStyle={[
              styles.readingContent,
              {
                paddingHorizontal: pagePadding,
                paddingTop: pagePadding + Spacing.lg,
                paddingBottom: pagePadding + Spacing.section,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.pageColumn, { opacity: fadeAnim }]}>
              {isTranslating && showTranslated && (
                <View style={styles.inlineStatus}>
                  <ActivityIndicator size="small" color={Colors.reader.translating} />
                  <Text style={styles.inlineStatusText}>
                    Translating to {currentLang?.label}...
                  </Text>
                </View>
              )}
              {hasError && showTranslated && (
                <View style={[styles.inlineStatus, styles.inlineStatusError]}>
                  <Ionicons name="warning" size={14} color={Colors.reader.error} />
                  <Text style={styles.inlineStatusTextError}>Translation failed</Text>
                  <Pressable onPress={() => scheduleTranslation(currentPage)} hitSlop={10}>
                    <Text style={styles.retryText}>Retry</Text>
                  </Pressable>
                </View>
              )}

              <Text
                style={[
                  styles.pageText,
                  {
                    fontSize: readerFontSize,
                    lineHeight: Math.round(readerFontSize * Reader.lineHeightMultiplier),
                  },
                  showTranslated && isTranslated && styles.translatedText,
                ]}
                selectable={controlsVisible}
                selectionColor={Colors.reader.selection}
              >
                {displayText}
              </Text>
            </Animated.View>
          </ScrollView>

          <View style={styles.pageIndicator}>
            <View style={styles.pageIndicatorTrack}>
              <View style={[styles.pageIndicatorFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.pageIndicatorText}>
              {currentPage + 1} / {pages.length}
            </Text>
          </View>
        </View>
      </GestureDetector>

      <Animated.View
        style={[
          styles.topBar,
          { transform: [{ translateY: topBarTranslate }] },
        ]}
        pointerEvents={controlsVisible ? 'auto' : 'none'}
      >
        <View style={styles.topToolbar}>
          <Pressable onPress={onBack} hitSlop={12} style={styles.toolbarIconBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.reader.textStrong} />
          </Pressable>
          <View style={styles.toolbarTitleWrap}>
            <Text style={styles.bookTitle} numberOfLines={1}>{book.title}</Text>
            <Text style={styles.bookMeta} numberOfLines={1}>
              {showTranslated ? (currentLang?.label || settings.targetLanguage) : 'Original text'}
            </Text>
          </View>
          <Pressable
            onPress={() => setSourceLangPickerVisible(true)}
            hitSlop={8}
            style={styles.toolbarPill}
          >
            <Text style={styles.toolbarPillText}>From {sourceLang?.label || sourceLanguage}</Text>
          </Pressable>
        </View>
      </Animated.View>

      <LanguagePicker
        visible={sourceLangPickerVisible}
        selected={sourceLanguage}
        onSelect={(code) => setSourceLanguage(code)}
        onClose={() => setSourceLangPickerVisible(false)}
      />

      <Animated.View
        style={[
          styles.bottomBar,
          { transform: [{ translateY: bottomBarTranslate }] },
        ]}
        pointerEvents={controlsVisible ? 'auto' : 'none'}
      >
        <View style={styles.bottomToolbar}>
          <Pressable
            onPress={() => goToPage(currentPage - 1)}
            disabled={isFirstPage}
            style={({ pressed }) => [
              styles.navBtn,
              isFirstPage && styles.navBtnDisabled,
              pressed && !isFirstPage && styles.navBtnPressed,
            ]}
          >
            <Ionicons name="chevron-back" size={19} color={isFirstPage ? Colors.reader.textMuted : Colors.reader.textStrong} />
            <Text style={[styles.navBtnText, isFirstPage && styles.navBtnTextDisabled]}>Prev</Text>
          </Pressable>

          <Pressable
            onPress={() => setShowTranslated((v) => !v)}
            style={[styles.modeToggle, showTranslated && styles.modeToggleActive]}
          >
            <Ionicons
              name={showTranslated ? 'language' : 'text-outline'}
              size={17}
              color={showTranslated ? Colors.app.background : Colors.reader.textStrong}
            />
            <Text style={[styles.modeToggleText, showTranslated && styles.modeToggleTextActive]}>
              {showTranslated ? 'Translated' : 'Original'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => goToPage(currentPage + 1)}
            disabled={isLastPage}
            style={({ pressed }) => [
              styles.navBtn,
              isLastPage && styles.navBtnDisabled,
              pressed && !isLastPage && styles.navBtnPressed,
            ]}
          >
            <Text style={[styles.navBtnText, isLastPage && styles.navBtnTextDisabled]}>Next</Text>
            <Ionicons name="chevron-forward" size={19} color={isLastPage ? Colors.reader.textMuted : Colors.reader.textStrong} />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.reader.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.reader.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  loadingBook: {
    width: 74,
    height: 100,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.reader.surface,
    borderWidth: 1,
    borderColor: Colors.reader.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  loadingText: {
    color: Colors.reader.textSecondary,
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  loadingBackBtn: {
    minHeight: 44,
    justifyContent: 'center',
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.reader.border,
  },
  loadingBackText: {
    color: Colors.reader.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  readingWrapper: {
    flex: 1,
  },
  readingArea: {
    flex: 1,
  },
  readingContent: {
    flexGrow: 1,
    alignItems: 'center',
  },
  pageColumn: {
    width: '100%',
    maxWidth: Reader.maxTextWidth,
  },
  pageText: {
    color: Colors.reader.text,
    fontFamily: Platform.OS === 'android' ? 'serif' : 'Georgia',
    letterSpacing: 0,
    textAlign: 'left',
  },
  translatedText: {
    color: Colors.reader.textStrong,
  },
  inlineStatus: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 184, 148, 0.12)',
    alignSelf: 'center',
  },
  inlineStatusError: {
    backgroundColor: 'rgba(212, 86, 86, 0.14)',
  },
  inlineStatusText: {
    color: Colors.reader.translating,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  inlineStatusTextError: {
    color: Colors.reader.error,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  retryText: {
    color: Colors.reader.accent,
    fontSize: FontSize.xs,
    fontWeight: '800',
    marginLeft: 2,
  },
  pageIndicator: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.xl,
    right: Spacing.xl,
    alignItems: 'center',
  },
  pageIndicatorTrack: {
    width: '100%',
    maxWidth: Reader.maxTextWidth,
    height: 2,
    backgroundColor: Colors.reader.border,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  pageIndicatorFill: {
    height: '100%',
    backgroundColor: Colors.reader.progress,
  },
  pageIndicatorText: {
    color: Colors.reader.textMuted,
    fontSize: FontSize.micro,
    fontWeight: '700',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  topBar: {
    position: 'absolute',
    top: (StatusBar.currentHeight || 0) + Spacing.sm,
    left: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
  },
  topToolbar: {
    width: '100%',
    maxWidth: 760,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.reader.overlay,
    borderWidth: 1,
    borderColor: Colors.reader.border,
    ...Shadow.floating,
  },
  toolbarIconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.reader.surfaceElevated,
  },
  toolbarTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  bookTitle: {
    color: Colors.reader.textStrong,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  bookMeta: {
    color: Colors.reader.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  toolbarPill: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.reader.surfaceElevated,
  },
  toolbarPillText: {
    color: Colors.reader.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'android' ? Spacing.lg : Spacing.xxl,
    left: Spacing.md,
    right: Spacing.md,
    alignItems: 'center',
  },
  bottomToolbar: {
    width: '100%',
    maxWidth: 520,
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.reader.overlay,
    borderWidth: 1,
    borderColor: Colors.reader.border,
    ...Shadow.floating,
  },
  navBtn: {
    minWidth: 88,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.reader.surfaceElevated,
  },
  navBtnPressed: {
    backgroundColor: Colors.reader.floating,
  },
  navBtnDisabled: {
    opacity: 0.38,
  },
  navBtnText: {
    color: Colors.reader.textStrong,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  navBtnTextDisabled: {
    color: Colors.reader.textMuted,
  },
  modeToggle: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.reader.surfaceElevated,
  },
  modeToggleActive: {
    backgroundColor: Colors.reader.accent,
  },
  modeToggleText: {
    color: Colors.reader.textStrong,
    fontSize: FontSize.sm,
    fontWeight: '800',
  },
  modeToggleTextActive: {
    color: Colors.app.background,
  },
});
