import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export function AuthScreen({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
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
      </View>
      <View style={styles.headingBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
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
    paddingVertical: 24,
    gap: 14,
    backgroundColor: '#f7f8fa',
  },
  brandBlock: {
    alignItems: 'center',
    gap: 10,
  },
  brandMark: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111',
  },
  brandMarkLabel: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '800',
  },
  brandName: {
    color: '#111111',
    fontSize: 26,
    fontWeight: '800',
  },
  headingBlock: {
    gap: 6,
    paddingHorizontal: 8,
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
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  description: {
    color: '#6b7280',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  card: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e8ebee',
    backgroundColor: '#ffffff',
    gap: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  footer: {
    paddingBottom: 6,
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
    paddingVertical: 8,
    alignItems: 'center',
  },
  ghostButtonLabel: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '600',
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
