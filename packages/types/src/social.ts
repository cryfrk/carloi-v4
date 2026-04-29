export type SocialMediaType = 'IMAGE' | 'VIDEO';

export interface SocialMediaItem {
  id: string;
  mediaType: SocialMediaType;
  url: string;
  sortOrder: number;
}

export interface SocialOwnerSummary {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  blueVerified: boolean;
  goldVerified: boolean;
  isFollowing: boolean;
}

export interface FeedPost {
  id: string;
  caption: string | null;
  locationText: string | null;
  createdAt: string;
  owner: SocialOwnerSummary;
  media: SocialMediaItem[];
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

export interface FeedResponse {
  items: FeedPost[];
  nextCursor: string | null;
}

export interface CreatePostMediaInput {
  url: string;
  mediaType?: SocialMediaType;
  mediaAssetId?: string;
}

export interface CreatePostRequest {
  caption?: string;
  locationText?: string;
  media: CreatePostMediaInput[];
}

export interface CreatePostResponse {
  success: true;
  post: {
    id: string;
    caption: string | null;
    locationText: string | null;
    createdAt: string;
    updatedAt: string;
    media: SocialMediaItem[];
  };
}

export interface StoryMediaItem {
  id: string;
  url: string;
  mediaType: SocialMediaType;
  sortOrder: number;
}

export interface StoryOwnerSummary {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  blueVerified: boolean;
  goldVerified: boolean;
}

export interface StoryItem {
  id: string;
  owner: StoryOwnerSummary;
  media: StoryMediaItem | null;
  caption: string | null;
  locationText: string | null;
  createdAt: string;
  expiresAt: string;
  viewedByMe: boolean;
  viewerCount: number | null;
}

export interface StoryFeedGroup {
  owner: StoryOwnerSummary;
  stories: StoryItem[];
  hasUnviewed: boolean;
  latestCreatedAt: string | null;
}

export interface StoryFeedResponse {
  items: StoryFeedGroup[];
}

export interface UserStoriesResponse {
  owner: StoryOwnerSummary | null;
  items: StoryItem[];
}

export interface StoryViewerItem {
  id: string;
  viewedAt: string;
  viewer: StoryOwnerSummary;
}

export interface StoryViewersResponse {
  items: StoryViewerItem[];
}

export interface CreateStoryMediaInput {
  url: string;
  mediaType?: SocialMediaType;
  mediaAssetId?: string;
  durationSeconds?: number;
}

export interface CreateStoryRequest {
  caption?: string;
  locationText?: string;
  visibility?: 'PUBLIC' | 'FOLLOWERS_ONLY';
  media: CreateStoryMediaInput;
}

export interface CreateStoryResponse {
  success: true;
  story: StoryItem;
}

export interface PostInteractionResponse {
  success: true;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

export interface CreateCommentRequest {
  body: string;
  parentCommentId?: string;
}

export interface SocialComment {
  id: string;
  body: string;
  createdAt: string;
  parentCommentId: string | null;
  owner: Omit<SocialOwnerSummary, 'isFollowing'>;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
}

export interface CommentsResponse {
  items: SocialComment[];
  nextCursor: string | null;
}

export interface CommentLikeResponse {
  success: true;
  isLiked: boolean;
  likeCount: number;
}

export interface FollowResponse {
  success: true;
  following: boolean;
}

export type PostDetailResponse = FeedPost;

