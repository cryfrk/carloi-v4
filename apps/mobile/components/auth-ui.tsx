import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export function AuthScreen({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.brandBlock}>
        <View style={styles.brandMark}>
          <Text style={styles.brandMarkLabel}>C</Text>
        </View>
        <Text style={styles.brandName}>Carloi</Text>
        <Text style={styles.brandTagline}>Araclar, ilanlar ve sosyal akis tek yerde.</Text>
      </View>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
      <View style={styles.card}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </ScrollView>
  );
}

export function AuthInput({
  label,
  secureTextEntry,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = 'none',
  keyboardType,
}: {
  label: string;
  secureTextEntry?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6d8090"
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryButton, disabled ? styles.primaryButtonDisabled : null]}
    >
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.ghostButton}>
      <Text style={styles.ghostButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function ChoiceButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.choiceButton, active ? styles.choiceButtonActive : null]}
    >
      <Text style={[styles.choiceLabel, active ? styles.choiceLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

export function FormMessage({
  tone = 'neutral',
  message,
}: {
  tone?: 'neutral' | 'error' | 'success';
  message: string;
}) {
  return (
    <View
      style={[
        styles.messageBox,
        tone === 'error' ? styles.messageError : null,
        tone === 'success' ? styles.messageSuccess : null,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          tone === 'error' ? styles.messageTextError : null,
          tone === 'success' ? styles.messageTextSuccess : null,
        ]}
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    minHeight: '100%',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 28,
    gap: 16,
    backgroundColor: '#f5f6f7',
  },
  brandBlock: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 28,
  },
  brandMark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  brandMarkLabel: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '900',
  },
  brandName: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '900',
  },
  brandTagline: {
    color: '#6b7280',
    fontSize: 14,
  },
  hero: {
    gap: 8,
    paddingHorizontal: 6,
    paddingTop: 6,
    alignItems: 'center',
  },
  eyebrow: {
    color: '#8a8f98',
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontSize: 11,
    fontWeight: '700',
  },
  title: {
    color: '#111111',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  card: {
    padding: 18,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#e8ebee',
    backgroundColor: '#ffffff',
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  footer: {
    paddingBottom: 12,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#111111',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#111111',
    backgroundColor: '#fafafa',
  },
  primaryButton: {
    marginTop: 6,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonLabel: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
  },
  ghostButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonLabel: {
    color: '#111111',
    fontSize: 14,
    fontWeight: '700',
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
  },
  choiceButtonActive: {
    borderColor: '#111111',
    backgroundColor: '#f3f4f6',
  },
  choiceLabel: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '700',
  },
  choiceLabelActive: {
    color: '#111111',
  },
  messageBox: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#f3f4f6',
  },
  messageError: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  messageSuccess: {
    backgroundColor: '#ecfdf3',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  messageText: {
    color: '#374151',
    lineHeight: 20,
  },
  messageTextError: {
    color: '#be123c',
  },
  messageTextSuccess: {
    color: '#166534',
  },
});
