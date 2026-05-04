import type {
  AttachmentType,
  InsuranceRequestStatus,
  MessageThreadType,
  MessageType,
} from './enums';
import { SharedContentType, SystemMessageCardType } from './enums';

export interface MessageParticipantSummary {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isPrivate: boolean;
  isMutualFollow?: boolean;
}

export interface MessageAttachmentView {
  id: string;
  attachmentType: AttachmentType;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  sizeBytes: number | null;
  sortOrder: number;
}

export interface LicenseInfoSystemCard {
  type: SystemMessageCardType.LICENSE_INFO_CARD;
  listingId: string;
  vehicleInfo: string;
  licenseOwnerName: string;
  maskedTcNo: string | null;
  maskedPlate: string | null;
  buttonLabel: string;
}

export interface InsuranceOfferSystemCard {
  type: SystemMessageCardType.INSURANCE_OFFER_CARD;
  requestId: string;
  offerId: string;
  amount: number;
  currency: string;
  buttonLabel: string;
}

export interface PaymentStatusSystemCard {
  type: SystemMessageCardType.PAYMENT_STATUS_CARD;
  requestId: string | null;
  paymentId: string | null;
  status: string;
  buttonLabel: string;
}

export interface PolicyDocumentSystemCard {
  type: SystemMessageCardType.POLICY_DOCUMENT_CARD;
  requestId: string;
  buttonLabel: string;
}

export interface SharedPostSystemCard {
  type: SystemMessageCardType.POST_CARD;
  contentType: SharedContentType.POST;
  targetId: string;
  previewTitle: string;
  previewImageUrl: string | null;
  previewSubtitle: string | null;
}

export interface SharedListingSystemCard {
  type: SystemMessageCardType.LISTING_CARD;
  contentType: SharedContentType.LISTING;
  targetId: string;
  previewTitle: string;
  previewImageUrl: string | null;
  previewSubtitle: string | null;
}

export interface SharedVehicleSystemCard {
  type: SystemMessageCardType.VEHICLE_CARD;
  contentType: SharedContentType.VEHICLE;
  targetId: string;
  previewTitle: string;
  previewImageUrl: string | null;
  previewSubtitle: string | null;
}

export interface MessageView {
  id: string;
  threadId: string;
  senderId: string;
  senderUsername: string;
  senderFullName: string;
  isMine: boolean;
  body: string | null;
  messageType: MessageType;
  seenAt: string | null;
  createdAt: string;
  attachments: MessageAttachmentView[];
  systemCard:
    | LicenseInfoSystemCard
    | InsuranceOfferSystemCard
    | PaymentStatusSystemCard
    | PolicyDocumentSystemCard
    | SharedPostSystemCard
    | SharedListingSystemCard
    | SharedVehicleSystemCard
    | null;
}

export interface MessagePreview {
  id: string;
  bodyPreview: string | null;
  messageType: MessageType;
  createdAt: string;
  seenAt: string | null;
  senderUsername: string;
}

export interface ThreadListingCard {
  id: string;
  listingNo: string;
  title: string;
  firstMediaUrl: string | null;
  price: number;
  currency: string;
  city: string;
  district: string | null;
  sellerId: string;
  sellerUsername: string;
}

export interface DealAgreementSummary {
  id: string;
  listingId: string;
  threadId: string;
  buyerId: string;
  sellerId: string;
  buyerAgreedAt: string | null;
  sellerAgreedAt: string | null;
  licenseSharedAt: string | null;
  isFullyAgreed: boolean;
  canShareLicenseInfo: boolean;
  currentUserRole: 'BUYER' | 'SELLER' | 'VIEWER';
  insuranceRequestId: string | null;
  insuranceStatus: InsuranceRequestStatus | null;
}

export interface MessageThreadSummary {
  id: string;
  type: MessageThreadType;
  groupName: string | null;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  participants: MessageParticipantSummary[];
  lastMessage: MessagePreview | null;
  listing: ThreadListingCard | null;
  dealAgreement: DealAgreementSummary | null;
}

export interface MessageThreadDetail extends MessageThreadSummary {
  messages: MessageView[];
}

export interface MessageThreadsResponse {
  items: MessageThreadSummary[];
}

export interface MessageFriendsResponse {
  items: MessageParticipantSummary[];
}

export interface MessageSearchUsersResponse {
  items: MessageParticipantSummary[];
}

export interface SendMessageRequest {
  body?: string;
  messageType: MessageType;
  attachmentUrls?: string[];
  attachmentAssetIds?: string[];
}

export interface SendMessageResponse {
  success: true;
  threadId: string;
  message: MessageView;
}

export interface CreateDirectThreadRequest {
  targetUserId: string;
  initialMessage?: SendMessageRequest;
}

export interface CreateGroupThreadRequest {
  groupName: string;
  participantIds: string[];
  initialMessage?: SendMessageRequest;
}

export interface CreateThreadResponse {
  success: true;
  thread: MessageThreadDetail;
}

export interface MarkThreadSeenResponse {
  success: true;
  threadId: string;
  seenAt: string;
}

export interface ListingDealAgreementResponse {
  success: true;
  thread: MessageThreadDetail;
  dealAgreement: DealAgreementSummary;
}

export interface ShareLicenseResponse {
  success: true;
  thread: MessageThreadDetail;
  dealAgreement: DealAgreementSummary;
}

export interface RequestInsuranceResponse {
  success: true;
  requestId: string;
  status: InsuranceRequestStatus;
  thread: MessageThreadDetail;
}

export interface ShareContentRequest {
  targetUserIds: string[];
  contentType: SharedContentType;
  contentId: string;
}

export interface ShareContentResponse {
  success: true;
  sharedCount: number;
  threadIds: string[];
}
