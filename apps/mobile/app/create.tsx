import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { mobileTheme } from '../lib/design-system';

const CREATE_OPTIONS = [
  {
    title: 'Gonderi olustur',
    copy: 'Coklu medya, caption ve konumla sosyal paylasim ac.',
    href: '/create-post',
  },
  {
    title: 'Hikaye olustur',
    copy: '24 saatlik story akisina girecek foto veya videoyu yukleyip hemen paylas.',
    href: '/create-story',
  },
  {
    title: 'Ilan olustur',
    copy: 'Profilindeki arac koleksiyonundan bir araci secip ilan akisina al.',
    href: '/create-listing',
  },
] as const;

export default function CreateHubScreen() {
  const router = useRouter();

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.scrim} onPress={() => router.back()} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.kicker}>Olustur</Text>
        <Text style={styles.title}>Ne paylasmak istiyorsun?</Text>
        <Text style={styles.subtitle}>Akisi bozmadan yeni bir gonderi, hikaye veya ilan baslat.</Text>
        <View style={styles.options}>
          {CREATE_OPTIONS.map((option) => (
            <Pressable key={option.href} style={styles.option} onPress={() => router.replace(option.href)}>
              <View style={styles.optionIndex}>
                <Text style={styles.optionIndexLabel}>+</Text>
              </View>
              <View style={styles.optionCopy}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionText}>{option.copy}</Text>
              </View>
              <Text style={styles.optionArrow}>›</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: mobileTheme.colors.surface,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d0d5dd',
    marginBottom: 4,
  },
  kicker: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: mobileTheme.colors.textStrong,
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 20,
  },
  options: {
    gap: 8,
    marginTop: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: mobileTheme.colors.border,
  },
  optionIndex: {
    width: 34,
    height: 34,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: mobileTheme.colors.surfaceMuted,
  },
  optionIndexLabel: {
    color: mobileTheme.colors.textStrong,
    fontSize: 18,
    fontWeight: '700',
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionTitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 15,
    fontWeight: '700',
  },
  optionText: {
    color: mobileTheme.colors.textMuted,
    lineHeight: 19,
  },
  optionArrow: {
    color: mobileTheme.colors.textMuted,
    fontSize: 22,
    lineHeight: 22,
  },
});

