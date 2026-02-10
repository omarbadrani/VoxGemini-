
export enum VoiceName {
  Kore = 'Kore (Default)',
  Puck = 'Puck',
  Charon = 'Charon',
  Zephyr = 'Zephyr',
  Fenrir = 'Fenrir',
  Layla = 'Layla (Arabic - MSA)',
  Hamza = 'Hamza (Arabic - MSA)',
  Noor = 'Noor (Arabic - Levantine)',
  Zaid = 'Zaid (Arabic - Gulf)'
}

export type AppTheme = 'midnight' | 'dawn' | 'abyss' | 'forest' | 'crimson';

export interface UserStats {
  storiesGenerated: number;
  totalListeningTime: number; // in seconds
  lastActive: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  preferredLanguage: 'en' | 'ar' | 'fr';
  preferredVoice: VoiceName;
  zenModeDefault: boolean;
  theme: AppTheme;
  stats: UserStats;
  library: Story[];
  createdAt: number;
}

export interface Story {
  id: string;
  title: string;
  author?: string;
  description?: string;
  content: string;
  timestamp: number;
  language: 'en' | 'ar' | 'fr';
  voice: VoiceName;
  category?: string;
  coverEmoji?: string;
  coverGradient?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
}

export type AppFeature = 'tts' | 'chat' | 'stt' | 'flash' | 'profile';
