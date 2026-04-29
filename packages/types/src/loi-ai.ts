import type {
  AiCardType,
  AiMessageRole,
  AiProvider,
  AttachmentType,
  DamageStatus,
  FuelType,
  ListingDescriptionTone,
  TransmissionType,
} from './enums';

export interface LoiAiAttachmentInput {
  type: AttachmentType;
  url?: string;
  name?: string;
  mimeType?: string;
  transcript?: string;
}

export interface LoiAiCard {
  type: AiCardType;
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
}

export interface LoiAiMessageView {
  id: string;
  role: AiMessageRole;
  provider: AiProvider | null;
  content: string;
  attachments: LoiAiAttachmentInput[];
  cards: LoiAiCard[];
  createdAt: string;
}

export interface LoiAiConversationSummary {
  id: string;
  title: string;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoiAiConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: LoiAiMessageView[];
}

export interface CreateLoiAiConversationRequest {
  title?: string;
}

export interface SendLoiAiMessageRequest {
  content: string;
  attachments?: LoiAiAttachmentInput[];
}

export interface SendLoiAiMessageResponse {
  conversationId: string;
  title: string;
  userMessage: LoiAiMessageView;
  assistantMessage: LoiAiMessageView;
  selectedProvider: AiProvider;
}

export interface CompareListingsRequest {
  listingIds: string[];
}

export interface ListingComparisonRow {
  label: string;
  values: string[];
}

export interface CompareListingsResponse {
  text: string;
  cards: LoiAiCard[];
  rows: ListingComparisonRow[];
  recommendedListingId: string | null;
  reasons: string[];
}

export interface GenerateSellerQuestionsResponse {
  listingId: string;
  questions: string[];
}

export interface GenerateListingDescriptionDraft {
  title?: string;
  brandText?: string;
  modelText?: string;
  packageText?: string;
  year?: number;
  color?: string;
  fuelType?: FuelType;
  transmissionType?: TransmissionType;
  km?: number;
  city?: string;
  district?: string;
  price?: number;
  damageStatuses?: DamageStatus[];
  hasExpertiseReport?: boolean;
  tradeAvailable?: boolean;
  equipmentSummary?: string;
}

export interface GenerateListingDescriptionRequest {
  garageVehicleId?: string;
  draft?: GenerateListingDescriptionDraft;
  tone: ListingDescriptionTone;
}

export interface GenerateListingDescriptionResponse {
  description: string;
  tone: ListingDescriptionTone;
  provider: AiProvider;
}

export interface LoiAiUserCardMetadata {
  username?: string;
  fullName?: string;
  blueVerified?: boolean;
  goldVerified?: boolean;
}

export interface LoiAiListingCardMetadata {
  listingNo?: string;
  city?: string;
  district?: string;
  km?: number;
  sellerType?: string;
}

import type { GarageVehicleSummary } from './garage';
import type { UserType } from './enums';

export interface PublicProfileResponse {
  id: string;
  username: string;
  fullName: string;
  userType: UserType;
  avatarUrl: string | null;
  bio: string | null;
  locationText: string | null;
  blueVerified: boolean;
  goldVerified: boolean;
  publicGarage: GarageVehicleSummary[];
}

