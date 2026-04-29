import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LoiAiController } from './loi-ai.controller';
import { LoiAiUsageLimitService } from './loi-ai-usage-limit.service';
import { LoiAiProviderRouterService } from './loi-ai-provider-router.service';
import { ListingSearchIntentParser } from './listing-search-intent.parser';
import { LoiAiService } from './loi-ai.service';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { MockAiProvider } from './providers/mock-ai.provider';
import { OpenAiProvider } from './providers/openai.provider';
import { VehicleKnowledgeService } from './vehicle-knowledge.service';

@Module({
  imports: [AuthModule],
  controllers: [LoiAiController],
  providers: [
    LoiAiService,
    ListingSearchIntentParser,
    VehicleKnowledgeService,
    LoiAiUsageLimitService,
    OpenAiProvider,
    DeepSeekProvider,
    MockAiProvider,
    LoiAiProviderRouterService,
  ],
  exports: [LoiAiService],
})
export class LoiAiModule {}
