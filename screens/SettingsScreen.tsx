/**
 * SettingsScreen - dark ebook app settings and reader controls.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  StatusBar,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius, FontSize, Reader } from '../constants/theme';
import { getLanguageByCode } from '../constants/languages';
import { useApp } from '../context/AppContext';
import LanguagePicker from '../components/LanguagePicker';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const { width } = useWindowDimensions();
  const { state, updateSettings } = useApp();
  const { settings } = state;

  const [fontSize, setFontSize] = useState(
    Math.min(Reader.maxFontSize, Math.max(Reader.minFontSize, settings.fontSize)),
  );
  const [langPickerVisible, setLangPickerVisible] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLang = getLanguageByCode(settings.targetLanguage);

  const horizontalPadding = width >= 768 ? Spacing.xxxl : Spacing.xl;

  const handleSelectLanguage = (code: string) => {
    updateSettings({ targetLanguage: code }).catch((err: any) => {
      Alert.alert('Settings not saved', err?.message || 'Could not save language settings.');
    });
  };

  useEffect(() => {
    setFontSize(Math.min(Reader.maxFontSize, Math.max(Reader.minFontSize, settings.fontSize)));
  }, [settings.fontSize]);

  useEffect(() => {
    if (fontSize === settings.fontSize) return;

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      updateSettings({ fontSize }).catch((err: any) => {
        Alert.alert('Settings not saved', err?.message || 'Could not save reader settings.');
      });
    }, 450);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [fontSize, settings.fontSize, updateSettings]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.app.background} />
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <Pressable onPress={onBack} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={20} color={Colors.app.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Translation and reader comfort</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: horizontalPadding }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.readerPreview}>
          <Text style={styles.previewKicker}>READER PREVIEW</Text>
          <Text
            style={[
              styles.previewText,
              { fontSize, lineHeight: Math.round(fontSize * Reader.lineHeightMultiplier) },
            ]}
          >
            A quiet page, warm type, and enough room for the story to breathe.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>READER</Text>
        <View style={styles.card}>
          <View style={styles.readerControlHeader}>
            <View>
              <Text style={styles.rowTitle}>Font size</Text>
              <Text style={styles.rowDescription}>Comfort range: 16-24px</Text>
            </View>
            <Text style={styles.fontSizeValue}>{fontSize}px</Text>
          </View>

          <View style={styles.fontSizeRow}>
            <Pressable
              onPress={() => setFontSize(Math.max(Reader.minFontSize, fontSize - 1))}
              style={styles.fontSizeBtn}
            >
              <Text style={styles.fontSizeBtnText}>A-</Text>
            </Pressable>
            <View style={styles.fontTrack}>
              <View
                style={[
                  styles.fontTrackFill,
                  {
                    width: `${((fontSize - Reader.minFontSize) /
                      (Reader.maxFontSize - Reader.minFontSize)) * 100}%`,
                  },
                ]}
              />
            </View>
            <Pressable
              onPress={() => setFontSize(Math.min(Reader.maxFontSize, fontSize + 1))}
              style={styles.fontSizeBtn}
            >
              <Text style={styles.fontSizeBtnText}>A+</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.sectionTitle}>TRANSLATION</Text>
        <View style={styles.card}>
          <Pressable
            onPress={() => setLangPickerVisible(true)}
            style={({ pressed }) => [styles.settingsRow, pressed && styles.pressed]}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="language" size={19} color={Colors.app.accent} />
            </View>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Target language</Text>
              <Text style={styles.rowDescription}>
                {currentLang?.label || settings.targetLanguage}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.app.textMuted} />
          </Pressable>
        </View>

      </ScrollView>

      <LanguagePicker
        visible={langPickerVisible}
        selected={settings.targetLanguage}
        onSelect={handleSelectLanguage}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xl,
  },
  iconBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.app.surface,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.app.border,
  },
  headerCopy: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.app.text,
    fontSize: FontSize.xxl,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: Colors.app.textSecondary,
    fontSize: FontSize.sm,
    marginTop: 2,
  },
  content: {
    paddingBottom: Spacing.section,
  },
  readerPreview: {
    backgroundColor: Colors.reader.surface,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.reader.border,
    padding: Spacing.xl,
    marginBottom: Spacing.xxl,
  },
  previewKicker: {
    color: Colors.app.accentMuted,
    fontSize: FontSize.micro,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  previewText: {
    color: Colors.reader.text,
    fontFamily: 'Georgia',
  },
  sectionTitle: {
    color: Colors.app.textMuted,
    fontSize: FontSize.micro,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
  },
  card: {
    backgroundColor: Colors.app.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.app.borderSoft,
    marginBottom: Spacing.xxl,
  },
  settingsRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.app.accentSoft,
  },
  rowCopy: {
    flex: 1,
  },
  rowTitle: {
    color: Colors.app.text,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  rowDescription: {
    color: Colors.app.textMuted,
    fontSize: FontSize.sm,
    marginTop: 3,
  },
  readerControlHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  fontSizeValue: {
    color: Colors.app.accentMuted,
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  fontSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  fontSizeBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.app.surfaceElevated,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.app.border,
  },
  fontSizeBtnText: {
    color: Colors.app.text,
    fontSize: FontSize.md,
    fontWeight: '800',
  },
  fontTrack: {
    flex: 1,
    height: 5,
    backgroundColor: Colors.app.surfaceSoft,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  fontTrackFill: {
    height: '100%',
    backgroundColor: Colors.app.accent,
    borderRadius: BorderRadius.full,
  },
  pressed: {
    opacity: 0.78,
  },
});
