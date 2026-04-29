import type {
  CreateDirectThreadRequest,
  CreateGroupThreadRequest,
  CreateThreadResponse,
  ListingDealAgreementResponse,
  MarkThreadSeenResponse,
  MessageFriendsResponse,
  MessageSearchUsersResponse,
  MessageThreadDetail,
  MessageThreadsResponse,
  RequestInsuranceResponse,
  SendMessageRequest,
  SendMessageResponse,
  ShareLicenseResponse,
} from '@carloi-v4/types';

import { MOBILE_API_BASE_URL } from './api-base-url';

const API_BASE_URL = MOBILE_API_BASE_URL;

export class MessagesApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  accessToken: string;
  body?: object;
};

async function requestJson<TResponse>(path: string, options: RequestOptions) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${options.accessToken}`,
      'x-device-name': 'carloi-mobile',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new MessagesApiError(
      typeof payload.message === 'string' ? payload.message : 'Islem tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const mobileMessagesApi = {
  getThreads(accessToken: string) {
    return requestJson<MessageThreadsResponse>('/messages/threads', { accessToken });
  },
  getThread(accessToken: string, threadId: string) {
    return requestJson<MessageThreadDetail>(`/messages/threads/${threadId}`, { accessToken });
  },
  getFriends(accessToken: string) {
    return requestJson<MessageFriendsResponse>('/messages/friends', { accessToken });
  },
  searchUsers(accessToken: string, query: string) {
    return requestJson<MessageSearchUsersResponse>(`/messages/search-users?q=${encodeURIComponent(query)}`, {
      accessToken,
    });
  },
  createDirectThread(accessToken: string, body: CreateDirectThreadRequest) {
    return requestJson<CreateThreadResponse>('/messages/direct', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  createGroupThread(accessToken: string, body: CreateGroupThreadRequest) {
    return requestJson<CreateThreadResponse>('/messages/group', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  sendMessage(accessToken: string, threadId: string, body: SendMessageRequest) {
    return requestJson<SendMessageResponse>(`/messages/threads/${threadId}/messages`, {
      method: 'POST',
      accessToken,
      body,
    });
  },
  markSeen(accessToken: string, threadId: string) {
    return requestJson<MarkThreadSeenResponse>(`/messages/threads/${threadId}/seen`, {
      method: 'PATCH',
      accessToken,
    });
  },
  startListingDeal(accessToken: string, listingId: string) {
    return requestJson<CreateThreadResponse>(`/messages/listing/${listingId}/start`, {
      method: 'POST',
      accessToken,
    });
  },
  agreeToDeal(accessToken: string, threadId: string) {
    return requestJson<ListingDealAgreementResponse>(`/messages/listing-deal/${threadId}/agree`, {
      method: 'POST',
      accessToken,
    });
  },
  shareLicense(accessToken: string, threadId: string) {
    return requestJson<ShareLicenseResponse>(`/messages/listing-deal/${threadId}/share-license`, {
      method: 'POST',
      accessToken,
    });
  },
  requestInsurance(accessToken: string, threadId: string) {
    return requestJson<RequestInsuranceResponse>(`/messages/listing-deal/${threadId}/request-insurance`, {
      method: 'POST',
      accessToken,
    });
  },
};

