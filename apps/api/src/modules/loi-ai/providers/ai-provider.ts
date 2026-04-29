import type { AiProvider } from '@prisma/client';
import type { LoiAiTaskKind } from '../loi-ai-routing';

export type LoiAiConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type GenerateAssistantTextInput = {
  taskKinds: LoiAiTaskKind[];
  userMessage: string;
  draftText: string;
  conversationHistory: LoiAiConversationTurn[];
};

export type GenerateAssistantTextResult = {
  provider: AiProvider;
  text: string;
};

export interface LoiAiProviderClient {
  readonly provider: AiProvider;
  isAvailable(): boolean;
  generateText(input: GenerateAssistantTextInput): Promise<GenerateAssistantTextResult>;
}

