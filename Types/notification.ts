export type NotificationType = string;

export interface EasyRideNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  link?: string;
  icon?: string;
  createdAt?: unknown;
}

