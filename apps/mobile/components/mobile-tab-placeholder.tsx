import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { MobileShell } from './mobile-shell';

export function MobileTabPlaceholder({
  title,
  subtitle,
  eyebrow,
  bullets,
}: {
  title: string;
  subtitle: string;
  eyebrow: string;
  bullets: string[];
}) {
  return (
    <MobileShell title={title} subtitle={subtitle}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {bullets.map((bullet) => (
          <View key={bullet} style={styles.detailCard}>
            <Text style={styles.cardTitle}>{bullet}</Text>
            <Text style={styles.cardCopy}>
              Bu ekran asama 4 sonrasinda ilgili domain moduluyle gercek veri akisina baglanacak.
            </Text>
          </View>
        ))}
      </ScrollView>
    </MobileShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
    paddingBottom: 10,
  },
  heroCard: {
    gap: 8,
    padding: 22,
    borderRadius: 28,
    backgroundColor: '#102030',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eyebrow: {
    color: '#ffd6c2',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: '#f8f2ea',
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: '#b7c4ce',
    lineHeight: 21,
  },
  detailCard: {
    gap: 8,
    padding: 18,
    borderRadius: 24,
    backgroundColor: '#0d1d2a',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardTitle: {
    color: '#f8f2ea',
    fontSize: 16,
    fontWeight: '800',
  },
  cardCopy: {
    color: '#b7c4ce',
    lineHeight: 21,
  },
});
