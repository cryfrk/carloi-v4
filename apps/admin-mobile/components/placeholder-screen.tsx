import { View, Text, StyleSheet } from 'react-native';

export function PlaceholderScreen({
  eyebrow,
  title,
  description,
  bullets,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
}) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>

      <View style={styles.grid}>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.card}>
            <Text style={styles.cardLabel}>Future slice</Text>
            <Text style={styles.cardTitle}>{bullet}</Text>
            <Text style={styles.cardCopy}>
              Bu ekran, sonraki sprintlerde gercek API ve state yonetimi ile genisleyecek.
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 18,
    backgroundColor: '#08131d',
  },
  hero: {
    padding: 22,
    borderRadius: 24,
    backgroundColor: '#102030',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eyebrow: {
    color: '#ffd6c2',
    textTransform: 'uppercase',
    letterSpacing: 2,
    fontSize: 12,
    marginBottom: 12,
  },
  title: {
    color: '#f8f2ea',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 10,
  },
  description: {
    color: '#b7c4ce',
    lineHeight: 22,
    fontSize: 15,
  },
  grid: {
    gap: 14,
  },
  card: {
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#0f1f2d',
    borderWidth: 1,
    borderColor: 'rgba(239,131,84,0.18)',
  },
  cardLabel: {
    color: '#ef8354',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontSize: 11,
    marginBottom: 8,
  },
  cardTitle: {
    color: '#f8f2ea',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  cardCopy: {
    color: '#b7c4ce',
    lineHeight: 21,
  },
});
