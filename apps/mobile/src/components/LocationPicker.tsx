import React, { useState, useMemo, useRef } from 'react';
import {
  Modal, View, Text, TextInput, FlatList, Pressable,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { colors } from '../constants/theme';

export type LocationItem = { id: string; name: string; category?: string };

type Props = {
  visible: boolean;
  title: string;
  items: LocationItem[];
  selected: string;
  onSelect: (name: string) => void;
  onClose: () => void;
  lang?: 'ar' | 'en';
};

const CATEGORIES_AR = [
  'أحياء وشوارع',
  'مرافق ومعالم',
  'مستشفيات وعيادات',
  'مساجد وزوايا',
  'مدارس وجامعات',
  'حكومية وأمنية',
  'أندية رياضية',
  'مناطق محيطة',
];

const CATEGORY_ICONS: Record<string, string> = {
  'أحياء وشوارع': '🏘',
  'مرافق ومعالم': '📍',
  'مستشفيات وعيادات': '🏥',
  'مساجد وزوايا': '🕌',
  'مدارس وجامعات': '🎓',
  'حكومية وأمنية': '🏛',
  'أندية رياضية': '⚽',
  'مناطق محيطة': '🌾',
};

export default function LocationPicker({ visible, title, items, selected, onSelect, onClose, lang = 'ar' }: Props) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const rtl = lang === 'ar';

  const filtered = useMemo(() => {
    let list = items;
    if (query.trim()) {
      const q = query.trim();
      list = items.filter((item) => item.name.includes(q));
    } else if (activeCategory) {
      list = items.filter((item) => item.category === activeCategory);
    }
    return list;
  }, [query, activeCategory, items]);

  const categories = useMemo(() => {
    const present = new Set(items.map((i) => i.category).filter(Boolean));
    return CATEGORIES_AR.filter((c) => present.has(c));
  }, [items]);

  function handleSelect(name: string) {
    setQuery('');
    setActiveCategory(null);
    onSelect(name);
    onClose();
  }

  function handleClose() {
    setQuery('');
    setActiveCategory(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={styles.safe}>

        {/* Header */}
        <View style={[styles.header, rtl && styles.rowRev]}>
          <Text style={[styles.title, rtl && styles.rtl]}>{title}</Text>
          <Pressable onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, rtl && styles.rtl]}
            placeholder={lang === 'ar' ? 'ابحث عن موقع...' : 'Search location...'}
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={(t) => { setQuery(t); setActiveCategory(null); }}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Text style={styles.clearText}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* Category chips — only shown when not searching */}
        {!query && (
          <FlatList
            horizontal
            data={categories}
            keyExtractor={(c) => c}
            contentContainerStyle={styles.catList}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item: cat }) => (
              <Pressable
                onPress={() => setActiveCategory(activeCategory === cat ? null : cat)}
                style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
              >
                <Text style={styles.catIcon}>{CATEGORY_ICONS[cat] || '📍'}</Text>
                <Text style={[styles.catText, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
              </Pressable>
            )}
          />
        )}

        {/* Results count */}
        <Text style={[styles.countText, rtl && styles.rtl]}>
          {filtered.length} {lang === 'ar' ? 'موقع' : 'locations'}
          {activeCategory && !query ? ` — ${activeCategory}` : ''}
        </Text>

        {/* Location list */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          renderItem={({ item }) => {
            const isSelected = item.name === selected;
            return (
              <Pressable
                style={[styles.row, isSelected && styles.rowSelected, rtl && styles.rowRev]}
                onPress={() => handleSelect(item.name)}
              >
                <Text style={[styles.locationIcon]}>
                  {item.category ? (CATEGORY_ICONS[item.category] || '📍') : '📍'}
                </Text>
                <View style={styles.rowContent}>
                  <Text style={[styles.locationName, isSelected && styles.locationNameSelected, rtl && styles.rtl]}>
                    {item.name}
                  </Text>
                  {item.category && (
                    <Text style={[styles.locationCat, rtl && styles.rtl]}>{item.category}</Text>
                  )}
                </View>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {lang === 'ar' ? 'لا توجد نتائج' : 'No results found'}
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: Platform.OS === 'android' ? 16 : 8 },
  rowRev: { flexDirection: 'row-reverse' },
  title: { fontSize: 20, fontWeight: '900', color: colors.navy },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#E7EEF5', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: colors.navy, fontWeight: '900', fontSize: 14 },
  searchBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#D9E2EC', gap: 8 },
  searchIcon: { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, fontWeight: '700' },
  clearText: { color: colors.muted, fontSize: 14, padding: 4 },
  catList: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#E7EEF5', borderWidth: 1, borderColor: '#D9E2EC' },
  catChipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  catIcon: { fontSize: 14 },
  catText: { color: colors.navy, fontWeight: '800', fontSize: 13 },
  catTextActive: { color: '#fff' },
  countText: { paddingHorizontal: 18, paddingBottom: 6, color: colors.muted, fontWeight: '700', fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  sep: { height: 1, backgroundColor: '#EDF2F7' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  rowSelected: { backgroundColor: '#EBF8FF', borderRadius: 14, paddingHorizontal: 10, marginHorizontal: -10 },
  rowContent: { flex: 1 },
  locationIcon: { fontSize: 18 },
  locationName: { fontSize: 16, fontWeight: '800', color: colors.navy },
  locationNameSelected: { color: colors.teal },
  locationCat: { fontSize: 12, color: colors.muted, fontWeight: '600', marginTop: 2 },
  checkmark: { color: colors.teal, fontWeight: '900', fontSize: 18 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: colors.muted, fontSize: 16, fontWeight: '700' },
});
