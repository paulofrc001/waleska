export type MessageStatus = 'pending' | 'approved' | 'rejected';

export interface MessagePhoto {
  id: string;
  message_id: string;
  storage_path: string;
  public_path: string;
  status: MessageStatus;
  created_at: string;
}

export interface GuestbookMessage {
  id: string;
  author_name: string;
  message: string;
  status: MessageStatus;
  featured: boolean;
  created_at: string;
  approved_at?: string | null;
  updated_at: string;
  photos?: MessagePhoto[];
}

export interface SiteSettings {
  id: string;
  title: string;
  subtitle: string;
  main_message: string;
  birthday_message: string;
  post_birthday_message: string;
  hero_photo: string | null;
  visual_theme: {
    palette: string;
  };
  display_settings: {
    show_gallery: boolean;
    show_hugs: boolean;
    show_countdown: boolean;
    auto_approve_messages?: boolean;
  };
  updated_at?: string;
}

export interface DashboardStats {
  total_messages: number;
  pending_messages: number;
  approved_messages: number;
  rejected_messages: number;
  total_photos: number;
  total_hugs: number;
}

export interface HugRecord {
  id: string;
  created_at: string;
}
