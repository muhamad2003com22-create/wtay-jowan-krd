export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  bio?: string;
  joinedAt: string;
  isAdmin?: boolean;
}

export interface Quote {
  id: string;
  text: string;
  author: string;
  category: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  createdAt: string;
  likesCount: number;
  viewsCount: number;
  commentsCount: number;
}

export interface Like {
  userId: string;
  quoteId: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  quoteId: string;
  userId: string;
  userDisplayName: string;
  userPhotoURL?: string;
  text: string;
  createdAt: string;
}

export interface AdminLog {
  id: string;
  eventType: 'login' | 'join' | 'post_created' | 'post_deleted' | 'profile_updated';
  userId: string;
  userEmail: string;
  userName: string;
  timestamp: string;
  details?: string;
}

export const KURDISH_CATEGORIES = [
  { id: 'all', name: 'هەموو بابەتەکان', value: 'All' },
  { id: 'life', name: 'ژیان', value: 'Life' },
  { id: 'wisdom', name: 'پەند و حیکمەت', value: 'Wisdom' },
  { id: 'love', name: 'خۆشەویستی', value: 'Love' },
  { id: 'friendship', name: 'هاوڕێیەتی', value: 'Friendship' },
  { id: 'hope', name: 'ئومێد و هیوا', value: 'Hope' },
  { id: 'success', name: 'سەرکەوتن', value: 'Success' },
  { id: 'literature', name: 'ئەدەب و شیعر', value: 'Literature' }
];
