import { Injectable } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { choosePreferredProvider, detectLoiAiTaskKinds } from './loi-ai-routing';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiProvider } from './providers/openai.provider';
import type { GenerateAssistantTextInput, GenerateAssistantTextResult } from './providers/ai-provider';

@Injectable()
export class LoiAiProviderRouterService {
  constructor(
    private readonly openAiProvider: OpenAiProvider,
    private readonly deepSeekProvider: DeepSeekProvider,
    private readonly mockAiProvider: MockAiProvider,
  ) {}

  choosePreferredProvider(content: string) {
    const provider = choosePreferredProvider(detectLoiAiTaskKinds(content));
    return provider === 'OPENAI' ? AiProvider.OPENAI : AiProvider.DEEPSEEK;
  }

  async generate(input: GenerateAssistantTextInput): Promise<GenerateAssistantTextResult> {
    const preferred = choosePreferredProvider(input.taskKinds);
    const primary = preferred === 'OPENAI' ? this.openAiProvider : this.deepSeekProvider;
    const secondary = preferred === 'OPENAI' ? this.deepSeekProvider : this.openAiProvider;

    if (primary.isAvailable()) {
      try {
        return await primary.generateText(input);
      } catch {
        // Fall through to the next provider.
      }
    }

    if (secondary.isAvailable()) {
      try {
        return await secondary.generateText(input);
      } catch {
        // Fall through to the mock provider.
      }
    }

    return this.mockAiProvider.generateText(input);
  }
}
