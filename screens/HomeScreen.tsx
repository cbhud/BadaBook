/**
 * HomeScreen - dark ebook library with continue reading and responsive grid.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { Colors, Spacing, BorderRadius, FontSize } from '../constants/theme';
import { getLanguageByCode } from '../constants/languages';
import { useApp } from '../context/AppContext';
import { parseEpub } from '../lib/epub-parser';
import { paginateChapters } from '../lib/paginator';
import BookCard from '../components/BookCard';
import LanguagePicker from '../components/LanguagePicker';
import { BookMeta } from '../types/book';

interface HomeScreenProps {
  onOpenBook: (book: BookMeta) => void;
  onOpenSettings: () => void;
}

type Filter = 'all' | 'reading' | 'epub' | 'pdf';

export default function HomeScreen({ onOpenBook, onOpenSettings }: HomeScreenProps) {
  const { width } = useWindowDimensions();
  const { state, addBook, removeBook, updateSettings } = useApp();
  const [importing, setImporting] = useState(false);
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const currentLang = getLanguageByCode(state.settings.targetLanguage);
  const continueBook = state.books.find((book) => book.lastPage > 0) ?? state.books[0];

  const horizontalPadding = width >= 768 ? Spacing.xxl : Spacing.xl;
  const columns = width >= 1024 ? 5 : width >= 768 ? 3 : 2;
  const gridGap = width >= 768 ? Spacing.xl : Spacing.lg;
  const cardWidth = Math.floor((width - horizontalPadding * 2 - gridGap * (columns - 1)) / columns);

  const filteredBooks = useMemo(() => {
    switch (filter) {
      case 'reading':
        return state.books.filter((book) => book.lastPage > 0);
      case 'epub':
      case 'pdf':
        return state.books.filter((book) => book.format === filter);
      default:
        return state.books;
    }
  }, [filter, state.books]);

  const handleImportBook = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/epub+zip', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const fileName = asset.name || 'Unknown';
      const fileUri = asset.uri;
      const isEpub = fileName.toLowerCase().endsWith('.epub');
      const isPdf = fileName.toLowerCase().endsWith('.pdf');

      if (!isEpub && !isPdf) {
        Alert.alert('Unsupported format', 'Please select an EPUB or PDF file.');
        return;
      }

      setImporting(true);

      const destDir = `${FileSystem.documentDirectory}books/`;
      await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      const destUri = `${destDir}${Date.now()}_${fileName}`;
      await FileSystem.copyAsync({ from: fileUri, to: destUri });

      let title = fileName.replace(/\.(epub|pdf)$/i, '');
      let author = 'Unknown Author';
      let totalPages = 0;

      if (isEpub) {
        try {
          const parsed = await parseEpub(destUri);
          title = parsed.title || title;
          author = parsed.author || author;
          const { pages } = paginateChapters(parsed.chapters, state.settings.fontSize);
          totalPages = pages.length;
        } catch (e: any) {
          console.warn('EPUB parse error:', e.message);
        }
      }

      await addBook({
        id: `book_${Date.now()}`,
        title,
        author,
        format: isEpub ? 'epub' : 'pdf',
        fileUri: destUri,
        totalPages,
        lastPage: 0,
        addedAt: Date.now(),
      });
    } catch (e: any) {
      console.error('Import error:', e);
      Alert.alert('Import failed', e.message || 'Could not import the file.');
    } finally {
      setImporting(false);
    }
  }, [addBook, state.settings.fontSize]);

  const handleDeleteBook = useCallback(
    (bookId: string, title: string) => {
      Alert.alert(
        'Remove book',
        `Remove "${title}" from your library?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeBook(bookId),
          },
        ],
      );
    },
    [removeBook],
  );

  const renderBook = useCallback(
    ({ item, index }: { item: BookMeta; index: number }) => (
      <View style={{ marginRight: (index + 1) % columns === 0 ? 0 : gridGap }}>
        <BookCard
          book={item}
          width={cardWidth}
          onPress={() => onOpenBook(item)}
          onDelete={() => handleDeleteBook(item.id, item.title)}
        />
      </View>
    ),
    [cardWidth, columns, gridGap, handleDeleteBook, onOpenBook],
  );

  const renderHeader = () => (
    <View style={styles.headerWrap}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appName}>BadaBook</Text>
          <Text style={styles.subtitle}>Read with live AI translation</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={() => setLangPickerVisible(true)} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="language" size={20} color={Colors.app.text} />
          </Pressable>
          <Pressable onPress={onOpenSettings} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={20} color={Colors.app.text} />
          </Pressable>
        </View>
      </View>

      {continueBook ? (
        <Pressable
          onPress={() => onOpenBook(continueBook)}
          style={({ pressed }) => [styles.continueCard, pressed && styles.pressed]}
        >
          <View style={styles.continueCover}>
            <Ionicons
              name={continueBook.format === 'epub' ? 'book-outline' : 'document-text-outline'}
              size={28}
              color={Colors.app.text}
            />
          </View>
          <View style={styles.continueBody}>
            <Text style={styles.kicker}>CONTINUE READING</Text>
            <Text style={styles.continueTitle} numberOfLines={2}>
              {continueBook.title}
            </Text>
            <Text style={styles.continueMeta} numberOfLines={1}>
              {continueBook.author} / {currentLang?.label || state.settings.targetLanguage}
            </Text>
            <View style={styles.continueProgressTrack}>
              <View
                style={[
                  styles.continueProgressFill,
                  {
                    width: `${continueBook.totalPages > 0
                      ? Math.min(100, ((continueBook.lastPage + 1) / continueBook.totalPages) * 100)
                      : 0}%`,
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.readPill}>
            <Ionicons name="play" size={14} color={Colors.app.background} />
            <Text style={styles.readPillText}>Read</Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyHero}>
          <Text style={styles.emptyHeroTitle}>Build your translated shelf</Text>
          <Text style={styles.emptyHeroText}>
            Import an EPUB or PDF and BadaBook will translate pages as you read.
          </Text>
          <Pressable
            onPress={handleImportBook}
            disabled={importing}
            style={({ pressed }) => [styles.importHeroBtn, pressed && styles.pressed]}
          >
            {importing ? (
              <ActivityIndicator color={Colors.app.background} size="small" />
            ) : (
              <>
                <Ionicons name="add" size={18} color={Colors.app.background} />
                <Text style={styles.importHeroText}>Import book</Text>
              </>
            )}
          </Pressable>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>My Library</Text>
          <Text style={styles.sectionSubtitle}>{filteredBooks.length} books</Text>
        </View>
        <Pressable
          onPress={handleImportBook}
          disabled={importing}
          style={({ pressed }) => [styles.importSmallBtn, pressed && styles.pressed]}
        >
          {importing ? (
            <ActivityIndicator color={Colors.app.background} size="small" />
          ) : (
            <Ionicons name="add" size={20} color={Colors.app.background} />
          )}
        </Pressable>
      </View>

      <View style={styles.filters}>
        {(['all', 'reading', 'epub', 'pdf'] as Filter[]).map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              onPress={() => setFilter(item)}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {item === 'all' ? 'All' : item === 'reading' ? 'Reading' : item.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.app.background} />
      <FlatList
        key={columns}
        data={filteredBooks}
        renderItem={renderBook}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          state.books.length > 0 ? (
            <View style={styles.filteredEmpty}>
              <Text style={styles.filteredEmptyText}>No books in this filter yet.</Text>
            </View>
          ) : null
        }
        contentContainerStyle={[
          styles.grid,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: Spacing.section,
          },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <LanguagePicker
        visible={langPickerVisible}
        selected={state.settings.targetLanguage}
        onSelect={(code) => updateSettings({ targetLanguage: code })}
        onClose={() => setLangPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.app.background,
  },
  headerWrap: {
    paddingTop: Spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  appName: {
    color: Colors.app.text,
    fontSize: FontSize.title,
    fontWeight: '700',
    letterSpacing: 0,
  },
  subtitle: {
    color: Colors.app.textSecondary,
    fontSize: FontSize.md,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.app.surface,
    borderWidth: 1,
    borderColor: Colors.app.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Colors.app.surface,
    borderWidth: 1,
    borderColor: Colors.app.borderSoft,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  continueCover: {
    width: 72,
    aspectRatio: 2 / 3,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cover.epubTo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBody: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: Colors.app.accentMuted,
    fontSize: FontSize.micro,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  continueTitle: {
    color: Colors.app.text,
    fontSize: FontSize.xl,
    fontWeight: '700',
    lineHeight: 23,
  },
  continueMeta: {
    color: Colors.app.textMuted,
    fontSize: FontSize.sm,
    marginTop: 4,
    marginBottom: Spacing.sm,
  },
  continueProgressTrack: {
    height: 4,
    backgroundColor: Colors.app.surfaceSoft,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  continueProgressFill: {
    height: '100%',
    backgroundColor: Colors.app.accent,
    borderRadius: BorderRadius.full,
  },
  readPill: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.app.accent,
  },
  readPillText: {
    color: Colors.app.background,
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  emptyHero: {
    alignItems: 'center',
    backgroundColor: Colors.app.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.app.borderSoft,
    padding: Spacing.xxl,
    marginBottom: Spacing.xxl,
  },
  emptyHeroTitle: {
    color: Colors.app.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyHeroText: {
    color: Colors.app.textSecondary,
    fontSize: FontSize.md,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  importHeroBtn: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.app.accent,
  },
  importHeroText: {
    color: Colors.app.background,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.app.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: Colors.app.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  importSmallBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.app.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  filterPill: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.app.surface,
    borderWidth: 1,
    borderColor: Colors.app.border,
  },
  filterPillActive: {
    backgroundColor: Colors.app.text,
    borderColor: Colors.app.text,
  },
  filterText: {
    color: Colors.app.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  filterTextActive: {
    color: Colors.app.background,
  },
  grid: {
    paddingTop: Spacing.md,
  },
  filteredEmpty: {
    alignItems: 'center',
    paddingVertical: Spacing.section,
  },
  filteredEmptyText: {
    color: Colors.app.textMuted,
    fontSize: FontSize.md,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
});
