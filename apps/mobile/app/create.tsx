import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function CreateHubScreen() {
  const router = useRouter();

  return (
    <View style={styles.backdrop}>
      <Pressable style={styles.scrim} onPress={() => router.back()} />
      <View style={styles.sheet}>
        <Text style={styles.kicker}>Olustur</Text>
        <Text style={styles.title}>Ne paylasmak istiyorsun?</Text>
        <Pressable style={styles.card} onPress={() => router.replace('/create-post')}>
          <Text style={styles.cardTitle}>Gonderi olustur</Text>
          <Text style={styles.cardCopy}>Coklu medya, caption ve konumla sosyal paylasim ac.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.replace('/create-story')}>
          <Text style={styles.cardTitle}>Hikaye olustur</Text>
          <Text style={styles.cardCopy}>24 saatlik story akisina girecek foto veya videoyu yukleyip hemen paylas.</Text>
        </Pressable>
        <Pressable style={styles.card} onPress={() => router.replace('/create-listing')}>
          <Text style={styles.cardTitle}>Ilan olustur</Text>
          <Text style={styles.cardCopy}>Garajindaki bir araci ilan akisina al ve yayina cik.</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  scrim: { ...StyleSheet.absoluteFillObject },
  sheet: {
    gap: 12,
    padding: 22,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: '#0d1d2a',
  },
  kicker: { color: '#ffd6c2', fontSize: 11, fontWeight: '800', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { color: '#f8f2ea', fontSize: 24, fontWeight: '900' },
  card: { gap: 6, padding: 18, borderRadius: 22, backgroundColor: '#102030' },
  cardTitle: { color: '#f8f2ea', fontSize: 16, fontWeight: '800' },
  cardCopy: { color: '#b9c7d1', lineHeight: 20 },
});
