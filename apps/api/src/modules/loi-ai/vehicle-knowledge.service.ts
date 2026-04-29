import type { VehicleKnowledge } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { normalizeLoiAiText } from './loi-ai-routing';

function toStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

@Injectable()
export class VehicleKnowledgeService {
  constructor(private readonly prisma: PrismaService) {}

  async findRelevantKnowledge(content: string) {
    const normalized = normalizeLoiAiText(content);
    const knowledgeRows = (await this.prisma.vehicleKnowledge.findMany({
      orderBy: [{ brandName: 'asc' }, { modelName: 'asc' }],
    })) as VehicleKnowledge[];

    return (
      knowledgeRows.find((row: VehicleKnowledge) => {
        const compactName = `${normalizeLoiAiText(row.brandName)} ${normalizeLoiAiText(row.modelName)}`;
        return normalized.includes(normalizeLoiAiText(row.modelName)) || normalized.includes(compactName);
      }) ?? null
    );
  }

  async getKnowledgeByModel(brandName?: string | null, modelName?: string | null) {
    if (!brandName && !modelName) {
      return null;
    }

    return this.prisma.vehicleKnowledge.findFirst({
      where: {
        brandName: brandName ?? undefined,
        modelName: modelName ?? undefined,
      },
    });
  }

  buildKnowledgeSummary(row: {
    brandName: string;
    modelName: string;
    chronicIssues: unknown;
    marketNotes: string;
    partsAvailability: string;
    buyerAdvice: string;
    sellerAdvice: string;
  }) {
    const chronicIssues = toStringArray(row.chronicIssues);

    return {
      text: [
        `${row.brandName} ${row.modelName} icin eldeki bilgi notlarim sunlar:`,
        chronicIssues.length
          ? `Kronik noktalar: ${chronicIssues.slice(0, 3).join(' ')}`
          : 'Kronik ariza tarafinda net bir liste yok, yine de ekspertiz ve test surusu onemli.',
        `Pazar notu: ${row.marketNotes}`,
        `Parca durumu: ${row.partsAvailability}`,
        `Alici onerisi: ${row.buyerAdvice}`,
        `Satici onerisi: ${row.sellerAdvice}`,
      ].join('\n\n'),
      chronicIssues,
    };
  }
}
