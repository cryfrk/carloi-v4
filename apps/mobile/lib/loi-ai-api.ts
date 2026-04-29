import type {
  CompareListingsRequest,
  CompareListingsResponse,
  CreateLoiAiConversationRequest,
  GenerateListingDescriptionRequest,
  GenerateListingDescriptionResponse,
  GenerateSellerQuestionsResponse,
  LoiAiConversationDetail,
  LoiAiConversationSummary,
  PostDetailResponse,
  PublicProfileResponse,
  SendLoiAiMessageRequest,
  SendLoiAiMessageResponse,
} from '@carloi-v4/types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

export class LoiAiApiError extends Error {}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE';
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
    throw new LoiAiApiError(
      typeof payload.message === 'string' ? payload.message : 'Islem tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const mobileLoiAiApi = {
  createConversation(accessToken: string, body: CreateLoiAiConversationRequest = {}) {
    return requestJson<LoiAiConversationDetail>('/loi-ai/conversations', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  getConversations(accessToken: string) {
    return requestJson<LoiAiConversationSummary[]>('/loi-ai/conversations', {
      accessToken,
    });
  },
  getConversation(accessToken: string, conversationId: string) {
    return requestJson<LoiAiConversationDetail>(`/loi-ai/conversations/${conversationId}`, {
      accessToken,
    });
  },
  deleteConversation(accessToken: string, conversationId: string) {
    return requestJson<{ success: true }>(`/loi-ai/conversations/${conversationId}`, {
      method: 'DELETE',
      accessToken,
    });
  },
  sendMessage(accessToken: string, conversationId: string, body: SendLoiAiMessageRequest) {
    return requestJson<SendLoiAiMessageResponse>(`/loi-ai/conversations/${conversationId}/messages`, {
      method: 'POST',
      accessToken,
      body,
    });
  },
  compareListings(accessToken: string, body: CompareListingsRequest) {
    return requestJson<CompareListingsResponse>('/loi-ai/compare-listings', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  generateSellerQuestions(accessToken: string, listingId: string) {
    return requestJson<GenerateSellerQuestionsResponse>(`/loi-ai/listings/${listingId}/seller-questions`, {
      accessToken,
    });
  },
  generateListingDescription(accessToken: string, body: GenerateListingDescriptionRequest) {
    return requestJson<GenerateListingDescriptionResponse>('/loi-ai/generate-listing-description', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  getPublicProfile(accessToken: string, userId: string) {
    return requestJson<PublicProfileResponse>(`/users/${userId}/public-profile`, {
      accessToken,
    });
  },
  getPostDetail(accessToken: string, postId: string) {
    return requestJson<PostDetailResponse>(`/posts/${postId}`, {
      accessToken,
    });
  },
};
