import type {
  CommentLikeResponse,
  CommentsResponse,
  CreateCommentRequest,
  CreatePostRequest,
  CreatePostResponse,
  CreateStoryRequest,
  CreateStoryResponse,
  FeedResponse,
  FollowResponse,
  PostInteractionResponse,
  StoryFeedResponse,
  StoryViewersResponse,
  UserStoriesResponse,
} from '@carloi-v4/types';

import { WEB_API_BASE_URL } from './api-base-url';

const API_BASE_URL = WEB_API_BASE_URL;

export class SocialApiError extends Error {}

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
      'x-device-name': 'carloi-web',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;

  if (!response.ok) {
    throw new SocialApiError(
      typeof payload.message === 'string' ? payload.message : 'Islem tamamlanamadi.',
    );
  }

  return payload as TResponse;
}

export const webSocialApi = {
  getFeed(accessToken: string, cursor?: string) {
    const search = new URLSearchParams();

    if (cursor) {
      search.set('cursor', cursor);
    }

    const suffix = search.toString() ? `?${search.toString()}` : '';
    return requestJson<FeedResponse>(`/feed${suffix}`, { accessToken });
  },
  createPost(accessToken: string, body: CreatePostRequest) {
    return requestJson<CreatePostResponse>('/posts', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  getStoriesFeed(accessToken: string) {
    return requestJson<StoryFeedResponse>('/stories/feed', { accessToken });
  },
  getUserStories(accessToken: string, userId: string) {
    return requestJson<UserStoriesResponse>(`/stories/user/${userId}`, { accessToken });
  },
  createStory(accessToken: string, body: CreateStoryRequest) {
    return requestJson<CreateStoryResponse>('/stories', {
      method: 'POST',
      accessToken,
      body,
    });
  },
  viewStory(accessToken: string, storyId: string) {
    return requestJson<{ success: true; viewedByMe: boolean; viewerCount: number }>(
      `/stories/${storyId}/view`,
      {
        method: 'POST',
        accessToken,
      },
    );
  },
  getStoryViewers(accessToken: string, storyId: string) {
    return requestJson<StoryViewersResponse>(`/stories/${storyId}/viewers`, { accessToken });
  },
  deleteStory(accessToken: string, storyId: string) {
    return requestJson<{ success: true }>(`/stories/${storyId}`, {
      method: 'DELETE',
      accessToken,
    });
  },
  likePost(accessToken: string, postId: string) {
    return requestJson<PostInteractionResponse>(`/posts/${postId}/like`, {
      method: 'POST',
      accessToken,
    });
  },
  unlikePost(accessToken: string, postId: string) {
    return requestJson<PostInteractionResponse>(`/posts/${postId}/like`, {
      method: 'DELETE',
      accessToken,
    });
  },
  savePost(accessToken: string, postId: string) {
    return requestJson<PostInteractionResponse>(`/posts/${postId}/save`, {
      method: 'POST',
      accessToken,
    });
  },
  unsavePost(accessToken: string, postId: string) {
    return requestJson<PostInteractionResponse>(`/posts/${postId}/save`, {
      method: 'DELETE',
      accessToken,
    });
  },
  getComments(accessToken: string, postId: string) {
    return requestJson<CommentsResponse>(`/posts/${postId}/comments`, {
      accessToken,
    });
  },
  createComment(accessToken: string, postId: string, body: CreateCommentRequest) {
    return requestJson<{ success: true; comment: CommentsResponse['items'][number] }>(
      `/posts/${postId}/comments`,
      {
        method: 'POST',
        accessToken,
        body,
      },
    );
  },
  likeComment(accessToken: string, postId: string, commentId: string) {
    return requestJson<CommentLikeResponse>(`/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
      accessToken,
    });
  },
  unlikeComment(accessToken: string, postId: string, commentId: string) {
    return requestJson<CommentLikeResponse>(`/posts/${postId}/comments/${commentId}/like`, {
      method: 'DELETE',
      accessToken,
    });
  },
  followUser(accessToken: string, userId: string) {
    return requestJson<FollowResponse>(`/users/${userId}/follow`, {
      method: 'POST',
      accessToken,
    });
  },
  unfollowUser(accessToken: string, userId: string) {
    return requestJson<FollowResponse>(`/users/${userId}/follow`, {
      method: 'DELETE',
      accessToken,
    });
  },
};

