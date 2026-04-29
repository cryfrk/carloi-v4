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
    padding: 20,
    gap: 18,
    backgroundColor: '#08131d',
  },
  hero: {
    marginTop: 32,
    padding: 24,
    borderRadius: 28,
    backgroundColor: '#102030',
    borderWidth: 1,
    borderColor: 'rgba(239,131,84,0.18)',
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
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 10,
  },
  description: {
    color: '#b7c4ce',
    fontSize: 15,
    lineHeight: 23,
  },
  card: {
    padding: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: '#0f1f2d',
    gap: 14,
  },
  footer: {
    paddingBottom: 28,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#f8f2ea',
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#f8f2ea',
    backgroundColor: '#0b1822',
  },
  primaryButton: {
    marginTop: 6,
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#ef8354',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonLabel: {
    color: '#08131d',
    fontWeight: '800',
    fontSize: 15,
  },
  ghostButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonLabel: {
    color: '#ffd6c2',
    fontSize: 14,
    fontWeight: '700',
  },
  choiceButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#0b1822',
    alignItems: 'center',
  },
  choiceButtonActive: {
    borderColor: '#ef8354',
    backgroundColor: 'rgba(239,131,84,0.16)',
  },
  choiceLabel: {
    color: '#b7c4ce',
    fontSize: 14,
    fontWeight: '700',
  },
  choiceLabelActive: {
    color: '#f8f2ea',
  },
  messageBox: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  messageError: {
    backgroundColor: 'rgba(216,82,82,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(216,82,82,0.3)',
  },
  messageSuccess: {
    backgroundColor: 'rgba(143,214,148,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(143,214,148,0.3)',
  },
  messageText: {
    color: '#d7e1e8',
    lineHeight: 20,
  },
  messageTextError: {
    color: '#ffd5d5',
  },
  messageTextSuccess: {
    color: '#dcffe0',
  },
});
