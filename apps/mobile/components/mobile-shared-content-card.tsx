import type {
  SharedListingSystemCard,
  SharedPostSystemCard,
  SharedVehicleSystemCard,
} from '@carloi-v4/types';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { mobileTheme } from '../lib/design-system';
import { resolveMobileMediaUrl } from '../lib/media-url';

type SharedCard = SharedPostSystemCard | SharedListingSystemCard | SharedVehicleSystemCard;

const labels: Record<SharedCard['type'], string> = {
  POST_CARD: 'Paylasilan gonderi',
  LISTING_CARD: 'Paylasilan ilan',
  VEHICLE_CARD: 'Paylasilan arac',
};

export function MobileSharedContentCard({
  body,
  card,
  mine = false,
  onPress,
}: {
  body?: string | null;
  card: SharedCard;
  mine?: boolean;
  onPress?: () => void;
}) {
  const imageUrl = resolveMobileMediaUrl(card.previewImageUrl);

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        mine ? styles.cardMine : null,
        pressed && onPress ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.thumbWrap}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
        ) : (
          <View style={styles.thumbFallback}>
            <Text style={styles.thumbFallbackLabel}>{card.type === 'POST_CARD' ? 'POST' : card.type === 'LISTING_CARD' ? 'ILAN' : 'ARAC'}</Text>
          </View>
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.kicker}>{labels[card.type]}</Text>
        <Text numberOfLines={2} style={styles.title}>{card.previewTitle}</Text>
        {card.previewSubtitle ? <Text numberOfLines={1} style={styles.subtitle}>{card.previewSubtitle}</Text> : null}
        {body ? <Text numberOfLines={2} style={styles.body}>{body}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  cardMine: {
    backgroundColor: '#f8fafc',
    borderColor: '#dbe4ee',
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  thumbWrap: {
    width: '100%',
    aspectRatio: 1.18,
    backgroundColor: '#eef1f4',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  thumbFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  thumbFallbackLabel: {
    color: mobileTheme.colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  copy: {
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  kicker: {
    color: mobileTheme.colors.textMuted,
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  title: {
    color: mobileTheme.colors.textStrong,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  subtitle: {
    color: mobileTheme.colors.textStrong,
    fontSize: 12,
    fontWeight: '600',
  },
  body: {
    color: mobileTheme.colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
