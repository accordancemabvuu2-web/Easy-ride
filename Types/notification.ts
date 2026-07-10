export type NotificationType =
  | "listing_approved"
  | "listing_rejected"
  | "new_message"
  | "listing_favorited"
  | "listing_reported";

export interface EasyRideNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt?: unknown;
}
