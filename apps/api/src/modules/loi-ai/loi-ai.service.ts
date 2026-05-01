import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AiMessageRole,
  AiProvider,
  AttachmentType,
  ContentVisibility,
  DamageStatus,
  ListingStatus,
  Prisma,
} from '@prisma/client';
import { isObdEnabled } from '../../common/feature-flags';
import { PrismaService } from '../../common/prisma/prisma.service';
import { trimNullable } from '../listings/listings.utils';
import { detectLoiAiTaskKinds, normalizeLoiAiText, type LoiAiTaskKind } from './loi-ai-routing';
import { LoiAiUsageLimitService } from './loi-ai-usage-limit.service';
import { LoiAiProviderRouterService } from './loi-ai-provider-router.service';
import { ListingSearchIntentParser, type ListingSearchIntent } from './listing-search-intent.parser';
import { VehicleKnowledgeService } from './vehicle-knowledge.service';
import { CreateConversationDto, SendConversationMessageDto } from './dto/conversation.dto';
import {
  GenerateListingDescriptionDto,
  ListingDescriptionToneDto,
} from './dto/generate-listing-description.dto';

const DEFAULT_CONVERSATION_TITLE = 'Yeni sohbet';

type AttachmentInput = {
  type: AttachmentType;
  url?: string;
  name?: string;
  mimeType?: string;
  transcript?: string;
};

type AssistantCard = {
  type: 'LISTING_CARD' | 'USER_CARD' | 'POST_CARD' | 'COMPARISON_CARD';
  entityId: string;
  appRoute: string;
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  badges?: string[];
  metadata?: Record<string, string | number | boolean | null>;
};

type ToolResultDraft = {
  toolName: string;
  resultJson: Prisma.InputJsonValue;
  success?: boolean;
};

type AssistantDraft = {
  taskKinds: LoiAiTaskKind[];
  draftText: string;
  cards: AssistantCard[];
  toolResults: ToolResultDraft[];
};

type ListingSearchResult = {
  id: string;
  listingNo: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  city: string;
  district: string | null;
  sellerType: string;
  firstMediaUrl: string | null;
  isSaved: boolean;
  brand: string | null;
  model: string | null;
  package: string | null;
  km: number | null;
  year: number | null;
  bodyType: string | null;
  fuelType: string | null;
  transmissionType: string | null;
  sellerUsername: string;
  damageParts: Array<{ partName: string; damageStatus: DamageStatus }>;
  hasExpertiseReport: boolean;
  equipmentSummary: string | null;
};

type UserSearchResult = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  blueVerified: boolean;
  goldVerified: boolean;
  bio: string | null;
  locationText: string | null;
};

type PostSearchResult = {
  id: string;
  caption: string | null;
  ownerId: string;
  ownerUsername: string;
  ownerFullName: string;
  ownerAvatarUrl: string | null;
  firstMediaUrl: string | null;
  createdAt: string;
};

@Injectable()
export class LoiAiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerRouter: LoiAiProviderRouterService,
    private readonly listingSearchIntentParser: ListingSearchIntentParser,
    private readonly vehicleKnowledgeService: VehicleKnowledgeService,
    private readonly usageLimitService: LoiAiUsageLimitService,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    const conversation = await this.prisma.aiConversation.create({
      data: {
        userId,
        title: trimNullable(dto.title) ?? DEFAULT_CONVERSATION_TITLE,
      },
    });

    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: [],
    };
  }

  async getConversations(userId: string) {
    const conversations = await this.prisma.aiConversation.findMany({
      where: {
        userId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    return conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title,
      lastMessagePreview: conversation.messages[0]?.content.slice(0, 160) ?? null,
      lastMessageAt: conversation.messages[0]?.createdAt.toISOString() ?? null,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
    }));
  }

  async getConversation(userId: string, conversationId: string) {
    const conversation = await this.getConversationRecord(userId, conversationId);

    return {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt.toISOString(),
      updatedAt: conversation.updatedAt.toISOString(),
      messages: conversation.messages.map((message) => this.serializeMessage(message)),
    };
  }

  async deleteConversation(userId: string, conversationId: string) {
    await this.ensureConversationOwner(userId, conversationId);

    await this.prisma.aiConversation.delete({
      where: {
        id: conversationId,
      },
    });

    return {
      success: true,
    };
  }

  async sendMessage(userId: string, conversationId: string, dto: SendConversationMessageDto) {
    await this.usageLimitService.consume(userId, 'chat', 1);
    const content = dto.content.trim();

    if (!content) {
      throw new BadRequestException('Mesaj bos olamaz.');
    }

    const conversation = await this.getConversationRecord(userId, conversationId);
    const attachments = dto.attachments ?? [];

    const userMessage = await this.prisma.aiMessage.create({
      data: {
        conversationId,
        role: AiMessageRole.USER,
        content,
        metadata:
          attachments.length > 0
            ? ({ attachments: attachments.map((attachment) => ({ ...attachment })) } as Prisma.InputJsonValue)
            : undefined,
      },
    });

    const assistantDraft = await this.buildAssistantDraft(userId, content, attachments);
    const requestedProvider = this.providerRouter.choosePreferredProvider(content);
    const providerResult = await this.providerRouter.generate({
      taskKinds: assistantDraft.taskKinds,
      userMessage: content,
      draftText: assistantDraft.draftText,
      conversationHistory: conversation.messages
        .slice(-6)
        .map((message) => ({
          role: message.role === AiMessageRole.ASSISTANT ? ('assistant' as const) : ('user' as const),
          content: message.content,
        }))
        .concat([{ role: 'user' as const, content }]),
    });

    const assistantMessage = await this.prisma.$transaction(async (tx) => {
      const createdAssistantMessage = await tx.aiMessage.create({
        data: {
          conversationId,
          role: AiMessageRole.ASSISTANT,
          provider: providerResult.provider,
          content: providerResult.text,
          metadata: {
            cards: assistantDraft.cards,
            requestedProvider,
          },
        },
      });

      for (const toolResult of assistantDraft.toolResults) {
        await tx.aiToolResult.create({
          data: {
            conversationId,
            messageId: createdAssistantMessage.id,
            toolName: toolResult.toolName,
            resultJson: toolResult.resultJson as Prisma.InputJsonValue,
            success: toolResult.success ?? true,
          },
        });
      }

      await tx.aiConversation.update({
        where: {
          id: conversationId,
        },
        data: {
          title:
            conversation.messages.length === 0 && conversation.title === DEFAULT_CONVERSATION_TITLE
              ? this.generateConversationTitle(content)
              : undefined,
          updatedAt: new Date(),
        },
      });

      return createdAssistantMessage;
    });

    const updatedConversation = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });

    return {
      conversationId,
      title: updatedConversation?.title ?? conversation.title,
      userMessage: this.serializeMessage(userMessage),
      assistantMessage: this.serializeMessage({
        ...assistantMessage,
        metadata: {
          cards: assistantDraft.cards,
          requestedProvider,
        },
      }),
      selectedProvider: providerResult.provider,
    };
  }

  async compareListings(userId: string, listingIds: string[]) {
    await this.usageLimitService.consume(userId, 'compare', 2);
    const comparison = await this.buildListingComparison(userId, listingIds);
    const providerResult = await this.providerRouter.generate({
      taskKinds: ['COMPARISON', 'TECHNICAL'],
      userMessage: `Bu ilanlari karsilastir: ${listingIds.join(', ')}`,
      draftText: comparison.text,
      conversationHistory: [],
    });

    return {
      text: providerResult.text,
      cards: comparison.cards,
      rows: comparison.rows,
      recommendedListingId: comparison.recommendedListingId,
      reasons: comparison.reasons,
    };
  }

  async generateSellerQuestions(userId: string, listingId: string) {
    await this.usageLimitService.consume(userId, 'seller-questions', 1);
    const listing = await this.findListingById(userId, listingId);
    const questions = await this.buildSellerQuestions(listing);

    return {
      listingId,
      questions,
    };
  }

  async generateListingDescription(userId: string, dto: GenerateListingDescriptionDto) {
    await this.usageLimitService.consume(userId, 'listing-description', 1);
    const facts = dto.garageVehicleId
      ? await this.getGarageVehicleDescriptionFacts(userId, dto.garageVehicleId)
      : dto.draft;

    if (!facts) {
      throw new BadRequestException('Aciklama uretmek icin taslak bilgi veya garaj araci gerekir.');
    }

    const draftText = this.buildListingDescriptionDraftText(facts, dto.tone);
    const providerResult = await this.providerRouter.generate({
      taskKinds: ['DESCRIPTION'],
      userMessage: 'Ilan aciklamasi uret',
      draftText,
      conversationHistory: [],
    });

    return {
      description: providerResult.text.slice(0, 600),
      tone: dto.tone,
      provider: providerResult.provider,
    };
  }

  private async buildAssistantDraft(
    userId: string,
    content: string,
    attachments: AttachmentInput[],
  ): Promise<AssistantDraft> {
    const taskKinds = detectLoiAiTaskKinds(content);
    const normalized = normalizeLoiAiText(content);
    const intent = await this.listingSearchIntentParser.parse(content);
    const listingNoMatches = [...content.matchAll(/CLV4-[A-Z0-9-]+/gi)].map((match) =>
      match[0].toUpperCase(),
    );

    if (listingNoMatches.length >= 2 || taskKinds.includes('COMPARISON')) {
      const listingIds = await this.resolveListingIdsFromReferences(userId, listingNoMatches);
      if (listingIds.length >= 2) {
        const comparison = await this.buildListingComparison(userId, listingIds.slice(0, 4));
        return {
          taskKinds: ['COMPARISON', 'TECHNICAL'],
          draftText: this.withAttachmentNote(comparison.text, attachments),
          cards: comparison.cards,
          toolResults: [
            {
              toolName: 'compareListings',
              resultJson: {
                listingIds,
                recommendedListingId: comparison.recommendedListingId,
                reasons: comparison.reasons,
              },
            },
          ],
        };
      }
    }

    if (intent.listingNo) {
      const listing = await this.findListingByNo(userId, intent.listingNo);

      if (listing) {
        if (taskKinds.includes('SELLER_QUESTIONS')) {
          const questions = await this.buildSellerQuestions(listing);

          return {
            taskKinds: ['SELLER_QUESTIONS', 'SEARCH'],
            draftText: this.withAttachmentNote(
              [
                `${listing.listingNo} numarali ilan icin saticiya su sorulari yoneltmenizi oneririm:`,
                ...questions.map((question, index) => `${index + 1}. ${question}`),
              ].join('\n'),
              attachments,
            ),
            cards: [this.toListingCard(listing)],
            toolResults: [
              {
                toolName: 'generateSellerQuestions',
                resultJson: {
                  listingId: listing.id,
                  questions,
                },
              },
            ],
          };
        }

        const exactText = [
          `${listing.listingNo} numarali ilani buldum.`,
          `${listing.title} icin fiyat ${this.formatMoney(listing.price, listing.currency)} seviyesinde.`,
          this.buildListingObservation(listing),
        ].join(' ');

        return {
          taskKinds: ['SEARCH'],
          draftText: this.withAttachmentNote(exactText, attachments),
          cards: [this.toListingCard(listing)],
          toolResults: [
            {
              toolName: 'findListingByNumber',
              resultJson: {
                listingId: listing.id,
                listingNo: listing.listingNo,
              },
            },
          ],
        };
      }
    }

    const knowledge = await this.vehicleKnowledgeService.findRelevantKnowledge(content);
    if (knowledge && (taskKinds.includes('TECHNICAL') || !intent.hasAnyFilter)) {
      const knowledgeSummary = this.vehicleKnowledgeService.buildKnowledgeSummary(knowledge);

      return {
        taskKinds: ['TECHNICAL'],
        draftText: this.withAttachmentNote(knowledgeSummary.text, attachments),
        cards: [],
        toolResults: [
          {
            toolName: 'vehicleKnowledge',
            resultJson: {
              brandName: knowledge.brandName,
              modelName: knowledge.modelName,
              chronicIssues: knowledgeSummary.chronicIssues,
            },
          },
        ],
      };
    }

    if (intent.hasAnyFilter || normalized.includes('ilan')) {
      const listings = await this.searchListings(userId, intent, 6);

      if (listings.length > 0) {
        const cards = listings.map((listing) => this.toListingCard(listing));
        const summaryLines = [
          `${listings.length} ilan buldum. En uygun gorunenleri ustte kart olarak biraktim.`,
          ...listings.slice(0, 3).map(
            (listing, index) =>
              `${index + 1}. ${listing.title} - ${this.formatMoney(listing.price, listing.currency)} - ${listing.city}${
                listing.district ? `/${listing.district}` : ''
              } - ${listing.km ? `${listing.km.toLocaleString('tr-TR')} km` : 'km bilgisi yok'}`,
          ),
        ];

        return {
          taskKinds: ['SEARCH'],
          draftText: this.withAttachmentNote(summaryLines.join('\n'), attachments),
          cards,
          toolResults: [
            {
              toolName: 'searchListings',
              resultJson: {
                listingIds: listings.map((listing) => listing.id),
                filters: intent,
              },
            },
          ],
        };
      }

      return {
        taskKinds: ['SEARCH'],
        draftText: this.withAttachmentNote(
          'Veritabaninda aradiginiza uyan aktif ilan bulamadim. Fiyat araligini genisletmeyi, sehir filtresini kaldirmayi veya marka-model bilgisini daha esnek vermeyi deneyebilirsiniz.',
          attachments,
        ),
        cards: [],
        toolResults: [
          {
            toolName: 'searchListings',
            resultJson: {
              listingIds: [],
              filters: intent,
            },
          },
        ],
      };
    }

    const usernameMatch = content.match(/@([A-Za-z0-9._-]+)/)?.[1] ?? null;
    if (
      usernameMatch ||
      normalized.includes('profil') ||
      normalized.includes('kullanici') ||
      normalized.includes('kullanýcý')
    ) {
      const users = await this.searchUsers(content, usernameMatch);

      if (users.length > 0) {
        return {
          taskKinds: ['SEARCH'],
          draftText: this.withAttachmentNote(
            `${users.length} profil buldum. En ilgili sonuclari kart olarak biraktim.`,
            attachments,
          ),
          cards: users.map((user) => this.toUserCard(user)),
          toolResults: [
            {
              toolName: 'searchUsers',
              resultJson: {
                userIds: users.map((user) => user.id),
              },
            },
          ],
        };
      }
    }

    if (
      normalized.includes('gonderi') ||
      normalized.includes('gönderi') ||
      normalized.includes('post')
    ) {
      const posts = await this.searchPosts(content);

      if (posts.length > 0) {
        return {
          taskKinds: ['SEARCH'],
          draftText: this.withAttachmentNote(
            `${posts.length} gonderi buldum. Ilgili kartlari acip ayrintiya bakabilirsiniz.`,
            attachments,
          ),
          cards: posts.map((post) => this.toPostCard(post)),
          toolResults: [
            {
              toolName: 'searchPosts',
              resultJson: {
                postIds: posts.map((post) => post.id),
              },
            },
          ],
        };
      }
    }

    return {
      taskKinds: taskKinds.length > 0 ? taskKinds : ['GENERAL'],
      draftText: this.withAttachmentNote(
        'Size ilan bulma, ilan karsilastirma, saticiya hazir soru uretme ve arac hakkinda teknik notlar sunma konularinda yardimci olabilirim. Ornegin "800 bin TL civari Fiat Egea bul" veya "Fiat Egea kronik arizalari neler" diyebilirsiniz.',
        attachments,
      ),
      cards: [],
      toolResults: [],
    };
  }

  private async resolveListingIdsFromReferences(userId: string, references: string[]) {
    if (references.length === 0) {
      return [];
    }

    const listings = await this.prisma.listing.findMany({
      where: {
        listingNo: {
          in: references,
        },
        listingStatus: ListingStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        listingNo: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return references
      .map((reference) => listings.find((listing) => listing.listingNo === reference)?.id ?? null)
      .filter((value): value is string => Boolean(value));
  }

  private async buildListingComparison(userId: string, listingIds: string[]) {
    const listings = await this.searchListings(
      userId,
      {
        listingNo: null,
        requirePaintFree: false,
        requireReplacementFree: false,
        hasAnyFilter: false,
      },
      20,
      listingIds,
    );

    if (listings.length < 2) {
      throw new BadRequestException('Karsilastirma icin en az iki gecerli ilan gerekir.');
    }

    const scored = listings.map((listing) => ({
      listing,
      score: this.scoreListingForComparison(listing),
    }));
    scored.sort((left, right) => right.score - left.score);
    const recommended = scored[0]?.listing ?? null;
    const reasons = recommended ? this.buildComparisonReasons(recommended) : [];

    return {
      text: [
        'Secilen ilanlari fiyat, kilometre, yil, paket ve kaporta durumu uzerinden karsilastirdim.',
        recommended
          ? `Su an daha dengeli gorunen ilan ${recommended.listingNo}. ${this.buildListingObservation(recommended)}`
          : 'Net bir oneride bulunmak icin daha fazla veri gerekiyor.',
      ].join(' '),
      cards: [
        ...listings.map((listing) => this.toListingCard(listing)),
        {
          type: 'COMPARISON_CARD' as const,
          entityId: listingIds.join(','),
          appRoute: `/loi-ai?comparison=${listingIds.join(',')}`,
          title: 'Ilan karsilastirma ozeti',
          subtitle: recommended ? `Onerilen ilan: ${recommended.listingNo}` : 'Karsilastirma ozeti',
          description: reasons.join(' '),
          badges: recommended ? [recommended.listingNo] : [],
        },
      ],
      rows: [
        {
          label: 'Fiyat',
          values: listings.map((listing) => this.formatMoney(listing.price, listing.currency)),
        },
        {
          label: 'Kilometre',
          values: listings.map((listing) =>
            listing.km ? `${listing.km.toLocaleString('tr-TR')} km` : 'Belirtilmemis',
          ),
        },
        { label: 'Yil', values: listings.map((listing) => String(listing.year ?? '-')) },
        { label: 'Paket', values: listings.map((listing) => listing.package ?? '-') },
        {
          label: 'Kaporta',
          values: listings.map((listing) => this.describeDamageSummary(listing.damageParts)),
        },
        ...(isObdEnabled()
          ? [
              {
                label: 'Expertiz',
                values: listings.map((listing) => (listing.hasExpertiseReport ? 'Var' : 'Yok')),
              },
            ]
          : []),
        {
          label: 'Konum',
          values: listings.map(
            (listing) => `${listing.city}${listing.district ? `/${listing.district}` : ''}`,
          ),
        },
        { label: 'Satici tipi', values: listings.map((listing) => listing.sellerType) },
      ],
      recommendedListingId: recommended?.id ?? null,
      reasons,
    };
  }

  private scoreListingForComparison(listing: ListingSearchResult) {
    let score = 0;
    score += Math.max(0, 100 - Math.round(listing.price / 50_000));
    score += Math.max(0, 80 - Math.round((listing.km ?? 180_000) / 5_000));
    score += Math.max(0, (listing.year ?? 2005) - 2000);
    score += listing.hasExpertiseReport ? 18 : 0;
    score += listing.damageParts.some((item) => item.damageStatus !== DamageStatus.NONE) ? 0 : 16;
    score += listing.sellerType === 'OWNER' ? 6 : 3;
    score += Math.min(12, Math.round(listing.description.trim().length / 45));
    return score;
  }

  private buildComparisonReasons(listing: ListingSearchResult) {
    const reasons: string[] = [];

    if (isObdEnabled() && listing.hasExpertiseReport) {
      reasons.push('Carloi expertiz raporu mevcut.');
    }
    if (!listing.damageParts.some((item) => item.damageStatus !== DamageStatus.NONE)) {
      reasons.push('Kaporta kaydi temiz gorunuyor.');
    }
    if ((listing.km ?? 999_999) < 120_000) {
      reasons.push('Kilometre seviyesi makul tarafta.');
    }
    if ((listing.year ?? 0) >= 2020) {
      reasons.push('Model yili guncel kalmis.');
    }
    if (reasons.length === 0) {
      reasons.push('Fiyat, paket ve aciklama dengesi diger seceneklere gore daha tutarli duruyor.');
    }

    return reasons;
  }

  private async buildSellerQuestions(listing: ListingSearchResult) {
    const knowledge = await this.vehicleKnowledgeService.getKnowledgeByModel(
      listing.brand ?? null,
      listing.model ?? null,
    );
    const chronicIssues = knowledge
      ? this.vehicleKnowledgeService.buildKnowledgeSummary(knowledge).chronicIssues
      : [];

    const questions = [
      'Aracta tramer veya sigorta kaydi var mi?',
      'Boya ve degisen bilgisi ekspertiz raporuyla birebir uyumlu mu?',
      'Sasi, podye veya direklerde islem var mi?',
      'Son periyodik bakim ne zaman ve hangi kilometrede yapildi?',
      'Pazarlik payiniz var mi ve araci gormek icin ne zaman uygunsunuz?',
    ];

    if (!listing.hasExpertiseReport) {
      questions.splice(2, 0, 'Guncel bir ekspertiz raporu paylasabilir misiniz?');
    }

    if (chronicIssues.length > 0) {
      const issue = chronicIssues[0];
      if (issue) {
        questions.push(
          `Bu modelde sik konusulan konu olarak ${issue.toLocaleLowerCase('tr-TR')} ile ilgili islem yapildi mi?`,
        );
      }
    }

    return questions.slice(0, 7);
  }

  private async searchListings(
    userId: string,
    intent: ListingSearchIntent,
    limit: number,
    restrictToIds?: string[],
  ): Promise<ListingSearchResult[]> {
    const where: Prisma.ListingWhereInput = {
      deletedAt: null,
      listingStatus: ListingStatus.ACTIVE,
      ...(restrictToIds && restrictToIds.length > 0 ? { id: { in: restrictToIds } } : {}),
      ...(intent.listingNo ? { listingNo: intent.listingNo } : {}),
      ...(intent.city ? { city: intent.city } : {}),
      ...(intent.sellerType ? { sellerType: intent.sellerType } : {}),
      ...(intent.minPrice || intent.maxPrice
        ? {
            price: {
              ...(intent.minPrice ? { gte: new Prisma.Decimal(intent.minPrice) } : {}),
              ...(intent.maxPrice ? { lte: new Prisma.Decimal(intent.maxPrice) } : {}),
            },
          }
        : {}),
      ...(intent.requirePaintFree || intent.requireReplacementFree
        ? {
            damageParts: {
              none: {
                damageStatus: {
                  not: DamageStatus.NONE,
                },
              },
            },
          }
        : {}),
      garageVehicle: {
        is: {
          deletedAt: null,
          ...(intent.brandId ? { brandId: intent.brandId } : {}),
          ...(intent.modelId ? { modelId: intent.modelId } : {}),
          ...(intent.packageId ? { vehiclePackageId: intent.packageId } : {}),
          ...(intent.minKm || intent.maxKm
            ? {
                km: {
                  ...(intent.minKm ? { gte: intent.minKm } : {}),
                  ...(intent.maxKm ? { lte: intent.maxKm } : {}),
                },
              }
            : {}),
          ...(intent.fuelType ? { fuelType: intent.fuelType } : {}),
          ...(intent.transmissionType ? { transmissionType: intent.transmissionType } : {}),
          ...(intent.yearMin || intent.yearMax
            ? {
                year: {
                  ...(intent.yearMin ? { gte: intent.yearMin } : {}),
                  ...(intent.yearMax ? { lte: intent.yearMax } : {}),
                },
              }
            : {}),
        },
      },
    };

    const listings = await this.prisma.listing.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: Math.max(limit, restrictToIds?.length ?? 0),
      include: {
        seller: {
          select: {
            username: true,
          },
        },
        media: {
          orderBy: {
            sortOrder: 'asc',
          },
          take: 1,
        },
        savedItems: {
          where: {
            userId,
          },
          select: {
            id: true,
          },
        },
        damageParts: {
          orderBy: {
            partName: 'asc',
          },
        },
        garageVehicle: {
          include: {
            vehiclePackage: {
              include: {
                model: {
                  include: {
                    brand: true,
                  },
                },
                spec: true,
              },
            },
          },
        },
      },
    });

    const mapped = listings.map<ListingSearchResult>((listing) => ({
      id: listing.id,
      listingNo: listing.listingNo,
      title: listing.title,
      description: listing.description,
      price: Number(listing.price),
      currency: listing.currency,
      city: listing.city,
      district: listing.district ?? null,
      sellerType: listing.sellerType,
      firstMediaUrl: listing.media[0]?.url ?? null,
      isSaved: listing.savedItems.length > 0,
      brand:
        listing.garageVehicle?.vehiclePackage?.model.brand.name ?? listing.garageVehicle?.brandText ?? null,
      model:
        listing.garageVehicle?.vehiclePackage?.model.name ?? listing.garageVehicle?.modelText ?? null,
      package:
        listing.garageVehicle?.vehiclePackage?.name ?? listing.garageVehicle?.packageText ?? null,
      km: listing.garageVehicle?.km ?? null,
      year: listing.garageVehicle?.year ?? null,
      bodyType: listing.garageVehicle?.vehiclePackage?.spec?.bodyType ?? null,
      fuelType:
        (listing.garageVehicle?.vehiclePackage?.spec?.fuelType as string | null) ??
        listing.garageVehicle?.fuelType ??
        null,
      transmissionType:
        (listing.garageVehicle?.vehiclePackage?.spec?.transmissionType as string | null) ??
        listing.garageVehicle?.transmissionType ??
        null,
      sellerUsername: listing.seller.username,
      damageParts: listing.damageParts.map((item) => ({
        partName: item.partName,
        damageStatus: item.damageStatus,
      })),
      hasExpertiseReport: listing.hasExpertiseReport,
      equipmentSummary: listing.garageVehicle?.vehiclePackage?.spec?.equipmentSummary ?? null,
    }));

    const bodyTypeFiltered = intent.bodyType
      ? mapped.filter(
          (listing) =>
            normalizeLoiAiText(listing.bodyType ?? '') === normalizeLoiAiText(intent.bodyType ?? ''),
        )
      : mapped;

    if (restrictToIds && restrictToIds.length > 0) {
      return restrictToIds
        .map((listingId) => bodyTypeFiltered.find((listing) => listing.id === listingId) ?? null)
        .filter((listing): listing is ListingSearchResult => Boolean(listing));
    }

    return bodyTypeFiltered.slice(0, limit);
  }

  private async findListingByNo(userId: string, listingNo: string) {
    const listings = await this.searchListings(
      userId,
      {
        listingNo,
        requirePaintFree: false,
        requireReplacementFree: false,
        hasAnyFilter: true,
      },
      1,
    );

    return listings[0] ?? null;
  }

  private async findListingById(userId: string, listingId: string) {
    const listings = await this.searchListings(
      userId,
      {
        listingNo: null,
        requirePaintFree: false,
        requireReplacementFree: false,
        hasAnyFilter: true,
      },
      1,
      [listingId],
    );

    if (!listings[0]) {
      throw new NotFoundException('Ilan bulunamadi.');
    }

    return listings[0];
  }

  private async searchUsers(content: string, exactUsername?: string | null): Promise<UserSearchResult[]> {
    const rawTokens = content
      .replace(/[@.,!?/\\-]/g, ' ')
      .split(/\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
      .slice(0, 4);

    const tokens = rawTokens.filter(
      (token) =>
        !['kullanici', 'kullanýcý', 'profil', 'bul', 'ara', 'goster', 'göster'].includes(
          normalizeLoiAiText(token),
        ),
    );

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(exactUsername
          ? {
              username: {
                equals: exactUsername,
                mode: 'insensitive',
              },
            }
          : tokens.length > 0
            ? {
                OR: tokens.flatMap((token) => [
                  {
                    username: {
                      contains: token,
                      mode: 'insensitive',
                    },
                  },
                  {
                    firstName: {
                      contains: token,
                      mode: 'insensitive',
                    },
                  },
                  {
                    lastName: {
                      contains: token,
                      mode: 'insensitive',
                    },
                  },
                ]),
              }
            : {}),
        profile: {
          is: {
            isPrivate: false,
          },
        },
      },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        profile: {
          select: {
            avatarUrl: true,
            blueVerified: true,
            goldVerified: true,
            bio: true,
            locationText: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return users.map((user) => ({
      id: user.id,
      username: user.username,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: user.profile?.avatarUrl ?? null,
      blueVerified: user.profile?.blueVerified ?? false,
      goldVerified: user.profile?.goldVerified ?? false,
      bio: user.profile?.bio ?? null,
      locationText: user.profile?.locationText ?? null,
    }));
  }

  private async searchPosts(content: string): Promise<PostSearchResult[]> {
    const terms = content
      .replace(/[.,!?/\\-]/g, ' ')
      .split(/\s+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 3)
      .slice(0, 4);

    if (terms.length === 0) {
      return [];
    }

    const posts = await this.prisma.post.findMany({
      where: {
        visibility: ContentVisibility.PUBLIC,
        OR: terms.map((term) => ({
          caption: {
            contains: term,
            mode: 'insensitive',
          },
        })),
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        media: {
          orderBy: {
            sortOrder: 'asc',
          },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    return posts.map((post) => ({
      id: post.id,
      caption: post.caption,
      ownerId: post.owner.id,
      ownerUsername: post.owner.username,
      ownerFullName: `${post.owner.firstName} ${post.owner.lastName}`.trim(),
      ownerAvatarUrl: post.owner.profile?.avatarUrl ?? null,
      firstMediaUrl: post.media[0]?.url ?? null,
      createdAt: post.createdAt.toISOString(),
    }));
  }

  private toListingCard(listing: ListingSearchResult): AssistantCard {
    return {
      type: 'LISTING_CARD',
      entityId: listing.id,
      appRoute: `/listings/${listing.id}`,
      title: listing.title,
      subtitle: `${listing.brand ?? '-'} ${listing.model ?? ''} ${listing.package ?? ''}`.trim(),
      description: `${listing.city}${listing.district ? ` / ${listing.district}` : ''} - ${
        listing.km ? `${listing.km.toLocaleString('tr-TR')} km` : 'km bilgisi yok'
      }`,
      imageUrl: listing.firstMediaUrl,
      price: listing.price,
      currency: listing.currency,
      badges: [
        listing.listingNo,
        listing.sellerType,
        ...(isObdEnabled() && listing.hasExpertiseReport ? ['Expertiz'] : []),
      ],
      metadata: {
        listingNo: listing.listingNo,
        city: listing.city,
        district: listing.district,
        km: listing.km,
        sellerType: listing.sellerType,
        isSaved: listing.isSaved,
      },
    };
  }

  private toUserCard(user: UserSearchResult): AssistantCard {
    return {
      type: 'USER_CARD',
      entityId: user.id,
      appRoute: `/profile/${user.id}`,
      title: `@${user.username}`,
      subtitle: user.fullName,
      description: user.bio ?? user.locationText ?? 'Acik profil',
      imageUrl: user.avatarUrl,
      badges: [user.blueVerified ? 'Blue' : '', user.goldVerified ? 'Gold' : ''].filter(Boolean),
      metadata: {
        username: user.username,
        fullName: user.fullName,
        blueVerified: user.blueVerified,
        goldVerified: user.goldVerified,
      },
    };
  }

  private toPostCard(post: PostSearchResult): AssistantCard {
    return {
      type: 'POST_CARD',
      entityId: post.id,
      appRoute: `/posts/${post.id}`,
      title: post.caption?.slice(0, 80) || `@${post.ownerUsername} gonderisi`,
      subtitle: `@${post.ownerUsername}`,
      description: post.ownerFullName,
      imageUrl: post.firstMediaUrl,
      metadata: {
        ownerId: post.ownerId,
      },
    };
  }

  private buildListingObservation(listing: ListingSearchResult) {
    const fragments = [
      listing.km ? `${listing.km.toLocaleString('tr-TR')} km` : 'Kilometre bilgisi eksik',
      listing.year ? `${listing.year} model` : 'Yil bilgisi eksik',
      this.describeDamageSummary(listing.damageParts),
      ...(isObdEnabled()
        ? [listing.hasExpertiseReport ? 'Carloi expertiz raporu mevcut.' : 'Expertiz raporu eklenmemis.']
        : []),
    ];

    return fragments.join(' ');
  }

  private describeDamageSummary(parts: Array<{ partName: string; damageStatus: DamageStatus }>) {
    const problematic = parts.filter((part) => part.damageStatus !== DamageStatus.NONE);

    if (problematic.length === 0) {
      return 'Kaporta kaydinda boya veya degisen bilgisi gorunmuyor.';
    }

    const shortList = problematic
      .slice(0, 3)
      .map((part) => `${part.partName} ${part.damageStatus === DamageStatus.PAINTED ? 'boyali' : 'degisen'}`)
      .join(', ');

    return `Kaporta notu: ${shortList}${problematic.length > 3 ? ' ve diger kayitlar' : ''}.`;
  }

  private withAttachmentNote(text: string, attachments: AttachmentInput[]) {
    if (attachments.length === 0) {
      return text;
    }

    const transcript = attachments
      .map((item) => item.transcript?.trim())
      .filter((item): item is string => Boolean(item));

    if (transcript.length > 0) {
      return `${text}\n\nEk notlarinizi de kaydettim: ${transcript.join(' | ')}`;
    }

    return `${text}\n\nEkleri kaydettim. Bu asamada medya icerigini dogrudan analiz etmiyorum ama konuya baglam olarak eslik ettirebilirim.`;
  }

  private formatMoney(amount: number, currency: string) {
    return `${amount.toLocaleString('tr-TR')} ${currency}`;
  }

  private generateConversationTitle(content: string) {
    const sanitized = content.replace(/\s+/g, ' ').trim();

    if (!sanitized) {
      return DEFAULT_CONVERSATION_TITLE;
    }

    const words = sanitized.split(' ').slice(0, 6).join(' ');
    return words.length > 60 ? `${words.slice(0, 57)}...` : words;
  }

  private serializeMessage(message: {
    id: string;
    role: AiMessageRole;
    provider: AiProvider | null;
    content: string;
    metadata: Prisma.JsonValue | null;
    createdAt: Date;
  }) {
    const metadata = this.readMessageMetadata(message.metadata);

    return {
      id: message.id,
      role: message.role,
      provider: message.provider,
      content: message.content,
      attachments: metadata.attachments,
      cards: metadata.cards,
      createdAt: message.createdAt.toISOString(),
    };
  }

  private readMessageMetadata(value: Prisma.JsonValue | null) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return {
        attachments: [] as AttachmentInput[],
        cards: [] as AssistantCard[],
      };
    }

    const metadata = value as {
      attachments?: AttachmentInput[];
      cards?: AssistantCard[];
    };

    return {
      attachments: Array.isArray(metadata.attachments) ? metadata.attachments : [],
      cards: Array.isArray(metadata.cards) ? metadata.cards : [],
    };
  }

  private async ensureConversationOwner(userId: string, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Konusma bulunamadi.');
    }
  }

  private async getConversationRecord(userId: string, conversationId: string) {
    const conversation = await this.prisma.aiConversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Konusma bulunamadi.');
    }

    return conversation;
  }

  private async getGarageVehicleDescriptionFacts(userId: string, garageVehicleId: string) {
    const vehicle = await this.prisma.garageVehicle.findFirst({
      where: {
        id: garageVehicleId,
        ownerId: userId,
        deletedAt: null,
      },
      include: {
        vehiclePackage: {
          include: {
            model: {
              include: {
                brand: true,
              },
            },
            spec: true,
          },
        },
        obdExpertiseReports: {
          where: {
            reportStatus: 'COMPLETED',
          },
          orderBy: [{ reportedAt: 'desc' }, { createdAt: 'desc' }],
          take: 1,
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Garaj araci bulunamadi.');
    }

    return {
      brandText: vehicle.vehiclePackage?.model.brand.name ?? vehicle.brandText,
      modelText: vehicle.vehiclePackage?.model.name ?? vehicle.modelText,
      packageText: vehicle.vehiclePackage?.name ?? vehicle.packageText ?? undefined,
      year: vehicle.year,
      color: vehicle.color ?? undefined,
      fuelType: vehicle.vehiclePackage?.spec?.fuelType ?? vehicle.fuelType,
      transmissionType: vehicle.vehiclePackage?.spec?.transmissionType ?? vehicle.transmissionType,
      km: vehicle.km,
      hasExpertiseReport: isObdEnabled() && vehicle.obdExpertiseReports.length > 0,
      equipmentSummary: vehicle.vehiclePackage?.spec?.equipmentSummary ?? undefined,
    };
  }

  private buildListingDescriptionDraftText(
    facts:
      | NonNullable<GenerateListingDescriptionDto['draft']>
      | Awaited<ReturnType<typeof this.getGarageVehicleDescriptionFacts>>,
    tone: ListingDescriptionToneDto,
  ) {
    const titlePart = [facts.brandText, facts.modelText, facts.packageText].filter(Boolean).join(' ');
    const opening =
      tone === ListingDescriptionToneDto.FRIENDLY
        ? `${titlePart || 'Arac'} ilgilenenler icin temiz ve duzenli kullanilmaya calisilmis bir secenek olarak sunuluyor.`
        : tone === ListingDescriptionToneDto.SHORT
          ? `${titlePart || 'Arac'} satistadir.`
          : `${titlePart || 'Arac'} icin ilan aciklamasi hazirlandi.`;

    const factsLine = [
      facts.year ? `${facts.year} model` : null,
      facts.km !== undefined ? `${facts.km.toLocaleString('tr-TR')} km` : null,
      facts.fuelType ? `${facts.fuelType.toLocaleLowerCase('tr-TR')} motor` : null,
      facts.transmissionType ? `${facts.transmissionType.toLocaleLowerCase('tr-TR')} vites` : null,
      facts.color ? `${facts.color} renk` : null,
    ]
      .filter(Boolean)
      .join(', ');

    const expertiseLine = isObdEnabled()
      ? facts.hasExpertiseReport
        ? 'Carloi expertiz raporu mevcut.'
        : 'Expertiz bilgisi belirtilmemistir.'
      : null;

    const draftPrice = 'price' in facts ? facts.price : undefined;
    const draftCity = 'city' in facts ? facts.city : undefined;
    const draftDistrict = 'district' in facts ? facts.district : undefined;
    const draftTradeAvailable = 'tradeAvailable' in facts ? facts.tradeAvailable : undefined;
    const damageStatuses = 'damageStatuses' in facts ? facts.damageStatuses ?? [] : [];
    const damageLine =
      damageStatuses.length > 0 && damageStatuses.every((item) => item === DamageStatus.NONE)
        ? 'Kullanici verisine gore boya veya degisen kaydi bulunmuyor.'
        : damageStatuses.some((item) => item !== DamageStatus.NONE)
          ? 'Kaporta durumu ilanda acik sekilde belirtilmelidir.'
          : null;

    const equipmentLine = facts.equipmentSummary ? `One cikan donanim: ${facts.equipmentSummary}.` : null;
    const priceLine =
      draftPrice !== undefined
        ? `Talep edilen fiyat ${draftPrice.toLocaleString('tr-TR')} TL seviyesindedir.`
        : null;
    const locationLine = draftCity
      ? `Arac ${draftCity}${draftDistrict ? `/${draftDistrict}` : ''} konumundadir.`
      : null;
    const tradeLine = draftTradeAvailable ? 'Takas dusunulebilir.' : null;

    const sections = [opening, factsLine, expertiseLine, damageLine, equipmentLine, locationLine, priceLine, tradeLine]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return sections.length > 600 ? `${sections.slice(0, 597)}...` : sections;
  }
}


