/**
 * LanguagePicker - dark bottom sheet language selector.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/theme';
import { LANGUAGES, type Language } from '../constants/languages';

interface LanguagePickerProps {
  visible: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export default function LanguagePicker({
  visible,
  selected,
  onSelect,
  onClose,
}: LanguagePickerProps) {
  const [search, setSearch] = useState('');

  const filtered = LANGUAGES.filter(
    (l) =>
      l.label.toLowerCase().includes(search.toLowerCase()) ||
      l.nativeName.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelect = (lang: Language) => {
    onSelect(lang.code);
    onClose();
    setSearch('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Select language</Text>
              <Text style={styles.headerSubtitle}>Used for translation output</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.app.text} />
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons
              name="search"
              size={17}
              color={Colors.app.textMuted}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search languages"
              placeholderTextColor={Colors.app.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => {
              const isSelected = item.code === selected;
              return (
                <Pressable
                  onPress={() => handleSelect(item)}
                  style={({ pressed }) => [
                    styles.item,
                    isSelected && styles.itemSelected,
                    pressed && styles.itemPressed,
                  ]}
                >
                  <View style={styles.itemContent}>
                    <Text style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.itemNative}>{item.nativeName}</Text>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color={Colors.app.accent}
                    />
                  )}
                </Pressable>
              );
            }}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: Colors.app.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.app.surface,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '86%',
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderColor: Colors.app.border,
  },
  grabber: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.app.surfaceSoft,
    marginTop: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    color: Colors.app.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Colors.app.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.app.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.app.surfaceElevated,
    marginHorizontal: Spacing.xl,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.app.border,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    color: Colors.app.text,
    fontSize: FontSize.md,
    paddingVertical: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
  },
  item: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  itemSelected: {
    backgroundColor: Colors.app.accentSoft,
  },
  itemPressed: {
    opacity: 0.72,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    color: Colors.app.text,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  itemLabelSelected: {
    color: Colors.app.accentMuted,
  },
  itemNative: {
    color: Colors.app.textMuted,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
});
