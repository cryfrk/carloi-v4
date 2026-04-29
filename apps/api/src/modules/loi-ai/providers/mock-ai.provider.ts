import { Injectable } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import type { GenerateAssistantTextInput, GenerateAssistantTextResult, LoiAiProviderClient } from './ai-provider';

@Injectable()
export class MockAiProvider implements LoiAiProviderClient {
  readonly provider = AiProvider.INTERNAL;

  isAvailable() {
    return true;
  }

  async generateText(input: GenerateAssistantTextInput): Promise<GenerateAssistantTextResult> {
    return {
      provider: this.provider,
      text: input.draftText.trim(),
    };
  }
}

