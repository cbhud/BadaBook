/**
 * BookCard - responsive library tile with ebook-style cover geometry.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, Shadow } from '../constants/theme';
import { BookMeta } from '../types/book';

interface BookCardProps {
  book: BookMeta;
  width: number;
  onPress: () => void;
  onDelete: () => void;
}

export default function BookCard({ book, width, onPress, onDelete }: BookCardProps) {
  const progress = book.totalPages > 0
    ? Math.min(100, Math.round(((book.lastPage + 1) / book.totalPages) * 100))
    : 0;

  const isEpub = book.format === 'epub';
  const coverColor = isEpub ? Colors.cover.epubFrom : Colors.cover.pdfFrom;
  const badgeColor = isEpub ? Colors.app.accentSoft : 'rgba(55, 114, 207, 0.18)';
  const badgeText = isEpub ? Colors.app.accentMuted : '#8eb6f0';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width },
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.cover, { backgroundColor: coverColor }]}>
        <View style={styles.coverSheen} />
        <Text style={styles.coverTitle} numberOfLines={4}>
          {book.title}
        </Text>
        <Text style={styles.coverAuthor} numberOfLines={1}>
          {book.author}
        </Text>
        <View style={[styles.formatBadge, { backgroundColor: badgeColor }]}>
          <Text style={[styles.formatText, { color: badgeText }]}>
            {book.format.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {book.author}
        </Text>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      </View>

      <Pressable
        onPress={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        style={styles.deleteBtn}
        hitSlop={12}
      >
        <Ionicons name="close" size={16} color={Colors.app.textSecondary} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.xl,
  },
  cardPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  cover: {
    aspectRatio: 2 / 3,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    ...Shadow.cover,
  },
  coverSheen: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  coverTitle: {
    color: Colors.app.text,
    fontSize: FontSize.md,
    fontWeight: '700',
    lineHeight: 18,
    marginRight: Spacing.sm,
  },
  coverAuthor: {
    color: Colors.app.textSecondary,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  formatBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  formatText: {
    fontSize: FontSize.micro,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  info: {
    paddingTop: Spacing.md,
  },
  title: {
    color: Colors.app.text,
    fontSize: FontSize.md,
    fontWeight: '600',
    lineHeight: 19,
  },
  author: {
    color: Colors.app.textMuted,
    fontSize: FontSize.sm,
    marginTop: 3,
    marginBottom: Spacing.sm,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.app.surfaceSoft,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.app.accent,
    borderRadius: BorderRadius.full,
  },
  progressText: {
    width: 34,
    color: Colors.app.textMuted,
    fontSize: FontSize.micro,
    fontWeight: '600',
    textAlign: 'right',
  },
  deleteBtn: {
    position: 'absolute',
    top: Spacing.xs,
    left: Spacing.xs,
    width: 30,
    height: 30,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(0, 0, 0, 0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
