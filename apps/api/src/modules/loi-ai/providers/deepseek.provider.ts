import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { GenerateAssistantTextInput, GenerateAssistantTextResult, LoiAiProviderClient } from './ai-provider';

@Injectable()
export class DeepSeekProvider implements LoiAiProviderClient {
  readonly provider = AiProvider.DEEPSEEK;
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    this.client =
      apiKey && !apiKey.startsWith('replace-')
        ? new OpenAI({
            apiKey,
            baseURL: this.configService.get<string>('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com',
          })
        : null;
    this.model = this.configService.get<string>('DEEPSEEK_MODEL') ?? 'deepseek-chat';
  }

  isAvailable() {
    return Boolean(this.client);
  }

  async generateText(input: GenerateAssistantTextInput): Promise<GenerateAssistantTextResult> {
    if (!this.client) {
      throw new Error('DeepSeek provider is not configured.');
    }

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content:
          'Sen Carloi V4 icinde calisan Loi AI asistanisin. Verilen taslagi daha akici hale getir ama veri uydurma. Hassas veri aciklama. Yanit Turkce olsun ve sadece duz metin don.',
      },
      ...input.conversationHistory.slice(-4).map<ChatCompletionMessageParam>((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
      {
        role: 'user',
        content: [
          `Kullanici mesaji: ${input.userMessage}`,
          `Taslak cevap: ${input.draftText}`,
          'Gorev: Taslagi kisa, net ve dogal bir Turkce cevap olarak yeniden yaz. Uydurma ekleme.',
        ].join('\n'),
      },
    ];

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      temperature: 0.3,
      max_tokens: 350,
    });

    const content = completion.choices[0]?.message?.content;
    const text = typeof content === 'string' ? content.trim() : '';

    return {
      provider: this.provider,
      text: text && text.length > 0 ? text : input.draftText.trim(),
    };
  }
}
