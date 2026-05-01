import type { ExploreVehicleItem, FeedPost, SocialComment, StoryFeedGroup } from '@carloi-v4/types';
import { FuelType, MediaType, TransmissionType, VehicleEquipmentCategory } from '@carloi-v4/types';

const demoOwner = {
  id: 'demo-owner',
  username: 'carloi',
  firstName: 'Carloi',
  lastName: 'Ekibi',
  avatarUrl: null,
  blueVerified: true,
  goldVerified: false,
  isFollowing: false,
};

export const demoFeedPosts: FeedPost[] = [
  {
    id: 'demo-post-welcome',
    caption:
      "Carloi'ye hos geldin. Burada hem sosyal akis hem de arac dunyan bir arada. Ilk gonderini olusturup profilini hareketlendirebilirsin.",
    locationText: 'Carloi onboarding',
    createdAt: new Date('2026-05-01T09:00:00.000Z').toISOString(),
    owner: demoOwner,
    media: [
      {
        id: 'demo-post-media-welcome',
        mediaType: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 0,
      },
    ],
    likeCount: 128,
    commentCount: 2,
    isLiked: false,
    isSaved: false,
  },
  {
    id: 'demo-post-first-share',
    caption:
      'Aracini ekle, sonra ister ilan ac ister sadece kesfette paylas. Carloi ilk gunden bos hissettirmesin diye burada ornek bir akis goruyorsun.',
    locationText: 'Istanbul / Kadikoy',
    createdAt: new Date('2026-05-01T11:30:00.000Z').toISOString(),
    owner: {
      ...demoOwner,
      id: 'demo-owner-2',
      username: 'carloigarage',
      goldVerified: true,
    },
    media: [
      {
        id: 'demo-post-media-2',
        mediaType: 'IMAGE',
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
        sortOrder: 0,
      },
    ],
    likeCount: 76,
    commentCount: 1,
    isLiked: false,
    isSaved: false,
  },
];

export const demoFeedComments: Record<string, SocialComment[]> = {
  'demo-post-welcome': [
    {
      id: 'demo-comment-1',
      body: 'Ilk gonderi icin create alanina dokunup hizlica baslayabilirsin.',
      createdAt: new Date('2026-05-01T09:10:00.000Z').toISOString(),
      parentCommentId: null,
      owner: {
        id: 'demo-helper',
        username: 'carloihelp',
        firstName: 'Carloi',
        lastName: 'Destek',
        avatarUrl: null,
        blueVerified: true,
        goldVerified: false,
      },
      likeCount: 14,
      replyCount: 0,
      isLiked: false,
    },
    {
      id: 'demo-comment-2',
      body: 'Profilindeki Araclar sekmesinden koleksiyonunu olusturmayi unutma.',
      createdAt: new Date('2026-05-01T09:18:00.000Z').toISOString(),
      parentCommentId: null,
      owner: {
        id: 'demo-helper-2',
        username: 'carloicommunity',
        firstName: 'Carloi',
        lastName: 'Topluluk',
        avatarUrl: null,
        blueVerified: false,
        goldVerified: true,
      },
      likeCount: 9,
      replyCount: 0,
      isLiked: false,
    },
  ],
  'demo-post-first-share': [
    {
      id: 'demo-comment-3',
      body: 'Kesfet akisina acarsan araclarin reels gibi gorunur.',
      createdAt: new Date('2026-05-01T11:40:00.000Z').toISOString(),
      parentCommentId: null,
      owner: {
        id: 'demo-helper-3',
        username: 'carloiexplore',
        firstName: 'Carloi',
        lastName: 'Explore',
        avatarUrl: null,
        blueVerified: true,
        goldVerified: false,
      },
      likeCount: 6,
      replyCount: 0,
      isLiked: false,
    },
  ],
};

export const demoStoryGroups: StoryFeedGroup[] = [
  {
    owner: {
      id: 'demo-story-owner',
      username: 'carloi',
      firstName: 'Carloi',
      lastName: 'Baslangic',
      avatarUrl: null,
      blueVerified: true,
      goldVerified: false,
    },
    stories: [
      {
        id: 'demo-story-1',
        owner: {
          id: 'demo-story-owner',
          username: 'carloi',
          firstName: 'Carloi',
          lastName: 'Baslangic',
          avatarUrl: null,
          blueVerified: true,
          goldVerified: false,
        },
        media: {
          id: 'demo-story-media-1',
          url: 'https://images.unsplash.com/photo-1549924231-f129b911e442?auto=format&fit=crop&w=900&q=80',
          mediaType: 'IMAGE',
          sortOrder: 0,
        },
        caption: 'Ilk aracini ekle, sonra ister kesfete ac ister ilanlastir.',
        locationText: 'Carloi',
        createdAt: new Date('2026-05-01T10:00:00.000Z').toISOString(),
        expiresAt: new Date('2026-05-02T10:00:00.000Z').toISOString(),
        viewedByMe: false,
        viewerCount: 0,
      },
    ],
    hasUnviewed: true,
    latestCreatedAt: new Date('2026-05-01T10:00:00.000Z').toISOString(),
  },
];

export const demoExploreVehicles: ExploreVehicleItem[] = [
  {
    id: 'demo-vehicle-egea',
    firstMediaUrl: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=80',
    media: [
      {
        id: 'demo-explore-media-1',
        url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=900&q=80',
        mediaType: MediaType.IMAGE,
        sortOrder: 0,
      },
    ],
    owner: {
      id: 'demo-owner-vehicle-1',
      username: 'egealovers',
      fullName: 'Carloi Showcase',
      avatarUrl: null,
      blueVerified: true,
      goldVerified: false,
    },
    city: 'Istanbul',
    brand: 'Fiat',
    model: 'Egea',
    package: 'Urban Plus',
    year: 2022,
    engineVolume: 1598,
    enginePower: 130,
    fuelType: FuelType.DIESEL,
    transmissionType: TransmissionType.MANUAL,
    km: 48200,
    bodyType: 'Sedan',
    description: 'Boyasiz, temiz kullanilmis ve kesfete acik ornek bir arac paylasimi.',
    equipmentNotes: 'Geri gorus kamerasi, carplay, hiz sabitleme',
    standardEquipment: [
      {
        category: VehicleEquipmentCategory.SAFETY,
        items: [
          { id: 'demo-egea-eq-1', name: 'ABS', isStandard: true, manualReviewNeeded: false },
          { id: 'demo-egea-eq-2', name: 'ESP', isStandard: true, manualReviewNeeded: false },
        ],
      },
      {
        category: VehicleEquipmentCategory.COMFORT,
        items: [
          {
            id: 'demo-egea-eq-3',
            name: 'Hiz sabitleyici',
            isStandard: true,
            manualReviewNeeded: false,
          },
          {
            id: 'demo-egea-eq-4',
            name: 'Geri gorus kamerasi',
            isStandard: true,
            manualReviewNeeded: false,
          },
        ],
      },
    ],
    extraEquipment: [
      {
        id: 'demo-egea-extra-1',
        category: VehicleEquipmentCategory.MULTIMEDIA,
        name: 'Kablosuz CarPlay modulu',
        note: null,
        isStandard: false,
        manualReviewNeeded: false,
      },
    ],
    showInExplore: true,
    openToOffers: true,
  },
  {
    id: 'demo-vehicle-clio',
    firstMediaUrl: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=900&q=80',
    media: [
      {
        id: 'demo-explore-media-2',
        url: 'https://images.unsplash.com/photo-1502161254066-6c74afbf07aa?auto=format&fit=crop&w=900&q=80',
        mediaType: MediaType.IMAGE,
        sortOrder: 0,
      },
    ],
    owner: {
      id: 'demo-owner-vehicle-2',
      username: 'cliofan',
      fullName: 'Carloi Community',
      avatarUrl: null,
      blueVerified: false,
      goldVerified: true,
    },
    city: 'Ankara',
    brand: 'Renault',
    model: 'Clio',
    package: 'Touch',
    year: 2021,
    engineVolume: 999,
    enginePower: 100,
    fuelType: FuelType.GASOLINE,
    transmissionType: TransmissionType.AUTOMATIC,
    km: 36100,
    bodyType: 'Hatchback',
    description: 'Sehir ici kullanim odakli, ekonomik ve reels benzeri akis icin secilmis bir ornek.',
    equipmentNotes: 'Led farlar, dijital klima, kablosuz carplay',
    standardEquipment: [
      {
        category: VehicleEquipmentCategory.COMFORT,
        items: [
          { id: 'demo-clio-eq-1', name: 'Dijital klima', isStandard: true, manualReviewNeeded: false },
          { id: 'demo-clio-eq-2', name: 'Anahtarsiz calistirma', isStandard: true, manualReviewNeeded: false },
        ],
      },
      {
        category: VehicleEquipmentCategory.LIGHTING,
        items: [
          { id: 'demo-clio-eq-3', name: 'LED farlar', isStandard: true, manualReviewNeeded: false },
        ],
      },
    ],
    extraEquipment: [
      {
        id: 'demo-clio-extra-1',
        category: VehicleEquipmentCategory.INTERIOR,
        name: 'Koltuk isitma',
        note: 'Sonradan eklendi',
        isStandard: false,
        manualReviewNeeded: false,
      },
    ],
    showInExplore: true,
    openToOffers: false,
  },
];

export const loiAiSuggestedPrompts = [
  '800k arac bul',
  'En az yakan araclar',
  'Egea vs Clio karsilastir',
];
