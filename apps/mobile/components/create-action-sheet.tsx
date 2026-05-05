import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { mobileTheme } from '../lib/design-system';

type CreateActionSheetProps = {
  visible: boolean;
  onClose: () => void;
};

const CREATE_ACTIONS = [
  {
    key: 'post',
    title: 'Gonderi olustur',
    description: 'Feed icin foto veya video paylas.',
    icon: 'images-outline' as const,
    href: '/create-post',
  },
  {
    key: 'story',
    title: 'Hikaye olustur',
    description: 'Tam ekran hikaye paylas.',
    icon: 'sparkles-outline' as const,
    href: '/create-story',
  },
  {
    key: 'listing',
    title: 'Ilan olustur',
    description: 'Aracini satisa cikarmak icin ilan hazirla.',
    icon: 'car-sport-outline' as const,
    href: '/create-listing',
  },
  {
    key: 'vehicle',
    title: 'Arac ekle',
    description: 'Profilindeki arac koleksiyonuna ekle.',
    icon: 'add-circle-outline' as const,
    href: '/vehicles/create',
  },
];

export function CreateActionSheet({ visible, onClose }: CreateActionSheetProps) {
  const router = useRouter();

  function handleNavigate(href: string) {
    onClose();
    router.push(href as never);
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Ne yapmak istiyorsun?</Text>
            <Text style={styles.copy}>Bulundugun ekrandan ayrilmadan Carloi icin yeni icerik uret.</Text>
          </View>

          <View style={styles.actionList}>
            {CREATE_ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => handleNavigate(action.href)}
                style={styles.actionCard}
              >
                <View style={styles.iconWrap}>
                  <Ionicons color="#111111" name={action.icon} size={20} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={styles.actionTitle}>{action.title}</Text>
                  <Text style={styles.actionDescription}>{action.description}</Text>
                </View>
                <Ionicons color="#111111" name="chevron-forward" size={18} />
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,17,17,0.26)',
  },
  sheet: {
    gap: 18,
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#d7dbe0',
  },
  header: {
    gap: 6,
  },
  title: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
  },
  copy: {
    color: '#6b7280',
    lineHeight: 20,
  },
  actionList: {
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: mobileTheme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: '#edf0f3',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  actionCopy: {
    flex: 1,
    gap: 3,
  },
  actionTitle: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '800',
  },
  actionDescription: {
    color: '#6b7280',
    fontSize: 12.5,
    lineHeight: 18,
  },
});
