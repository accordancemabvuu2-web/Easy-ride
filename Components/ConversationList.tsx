"use client";

import type { Conversation } from "@/Types/message";
import { MessageCircle } from "lucide-react";
import Image from "next/image";

interface ConversationListProps {
  conversations: Conversation[];
  currentUserId: string;
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
}

export default function ConversationList({
  conversations,
  currentUserId,
  selectedId,
  onSelect,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center px-6 text-center">
        <MessageCircle className="text-gray-400" size={38} />
        <h2 className="mt-4 text-xl font-bold">No conversations</h2>
        <p className="mt-2 text-sm leading-6 text-gray-500">
          Messages between buyers and sellers will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#E5E7EB]">
      {conversations.map((conversation) => {
        const otherName =
          currentUserId === conversation.buyerId ? conversation.sellerName : conversation.buyerName;
        const unread = conversation.unreadBy?.includes(currentUserId);
        const selected = selectedId === conversation.id;

        return (
          <button
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation)}
            className={`flex w-full items-start gap-3 p-4 text-left transition ${
              selected
                ? "bg-[#0B5D3B]/10"
                : unread
                  ? "bg-[#0B5D3B]/5"
                  : "bg-white hover:bg-[#F8F9FA]"
            }`}
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
              <Image src={conversation.listingImage} alt={conversation.listingTitle} fill className="object-cover" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className={`truncate text-sm ${unread ? "font-bold" : "font-semibold"}`}>{otherName}</p>
                {unread ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#0B5D3B]" /> : null}
              </div>

              <p className="mt-1 truncate text-xs font-medium text-[#0B5D3B]">{conversation.listingTitle}</p>
              <p className={`mt-2 truncate text-sm ${unread ? "font-semibold text-gray-700" : "text-gray-500"}`}>
                {conversation.lastMessage}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
