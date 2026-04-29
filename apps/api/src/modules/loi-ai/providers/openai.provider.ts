import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProvider } from '@prisma/client';
import OpenAI from 'openai';
import type { GenerateAssistantTextInput, GenerateAssistantTextResult, LoiAiProviderClient } from './ai-provider';

function buildPrompt(input: GenerateAssistantTextInput) {
  const history = input.conversationHistory
    .slice(-6)
    .map((turn) => `${turn.role === 'user' ? 'Kullanici' : 'Asistan'}: ${turn.content}`)
    .join('\n');

  return [
    'Kullanici mesaji:',
    input.userMessage,
    history ? '\nSon baglam:\n' + history : '',
    '\nTaslak cevap:',
    input.draftText,
    '\nGorev: Taslak cevabi Turkce, dogal ve profesyonel bir dille yeniden yaz. Sadece verilen bilgilere sadik kal. Hassas veri uydurma veya aciga cikarma. Emin degilsen bunu acikca soyle. Yanit sadece duz metin olsun.',
  ]
    .filter(Boolean)
    .join('\n');
}

@Injectable()
export class OpenAiProvider implements LoiAiProviderClient {
  readonly provider = AiProvider.OPENAI;
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.client = apiKey && !apiKey.startsWith('replace-') ? new OpenAI({ apiKey }) : null;
    this.model = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-5-mini';
  }

  isAvailable() {
    return Boolean(this.client);
  }

  async generateText(input: GenerateAssistantTextInput): Promise<GenerateAssistantTextResult> {
    if (!this.client) {
      throw new Error('OpenAI provider is not configured.');
    }

    const response = await this.client.responses.create({
      model: this.model,
      instructions:
        'Sen Carloi V4 icinde calisan Loi AI asistanisin. Verilen taslagi daha akici hale getir ama veri uydurma. Telefon, TC, ruhsat, email, plaka gibi hassas verileri acik yazma. Yanit Turkce olsun.',
      input: buildPrompt(input),
      max_output_tokens: 350,
    });

    const text = response.output_text?.trim();

    return {
      provider: this.provider,
      text: text && text.length > 0 ? text : input.draftText.trim(),
    };
  }
}

