export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;

  buyerId: string;
  buyerName: string;

  sellerId: string;
  sellerName: string;

  lastMessage: string;
  lastMessageAt?: unknown;

  participants: string[];
  unreadBy: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface EasyRideMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  createdAt?: unknown;
  read: boolean;
}
