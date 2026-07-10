"use client";

import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserConversations,
  markConversationRead,
  sendMessage,
  subscribeToMessages,
} from "@/services/messageService";
import type { Conversation, EasyRideMessage } from "@/Types/message";
import { Loader2, MessageCircle, Send } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

export default function MessagesPage() {
  return (
    <RequireAuth>
      <MessagesContent />
    </RequireAuth>
  );
}

function MessagesContent() {
  const { profile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<EasyRideMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [draft, setDraft] = useState("");

  const selectedConversationId = searchParams.get("conversation") ?? "";

  const selectedConversation = useMemo(() => {
    if (selectedConversationId) {
      return conversations.find((conversation) => conversation.id === selectedConversationId) ?? null;
    }

    return conversations[0] ?? null;
  }, [conversations, selectedConversationId]);

  useEffect(() => {
    async function loadConversations() {
      if (!profile) {
        return;
      }

      try {
        setLoadingConversations(true);
        setConversations(await getUserConversations(profile.id));
      } catch {
        toast.error("Conversations could not be loaded.");
      } finally {
        setLoadingConversations(false);
      }
    }

    void loadConversations();
  }, [profile]);

  useEffect(() => {
    if (!profile || !selectedConversation) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    const unsubscribe = subscribeToMessages(selectedConversation.id, setMessages);
    void markConversationRead(selectedConversation.id, profile.id).finally(() =>
      setLoadingMessages(false),
    );

    if (!selectedConversationId) {
      router.replace(`${pathname}?conversation=${selectedConversation.id}`);
    }

    return unsubscribe;
  }, [pathname, profile, router, selectedConversation, selectedConversationId]);

  const sendCurrentMessage = async () => {
    if (!profile || !selectedConversation) {
      return;
    }

    if (!draft.trim()) {
      return;
    }

    try {
      await sendMessage(
        selectedConversation,
        {
          id: profile.id,
          name: profile.name,
        },
        draft.trim(),
      );
      setDraft("");
    } catch {
      toast.error("The message could not be sent.");
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA] text-[#202124]">
      <Navbar />

      <section className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
        <div className="flex items-center gap-3">
          <MessageCircle className="text-[#0B5D3B]" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#C9A227]">
              Messages
            </p>
            <h1 className="text-4xl font-bold">Conversations</h1>
          </div>
        </div>

        {loadingConversations ? (
          <div className="flex min-h-80 items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
          </div>
        ) : conversations.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-14 text-center">
            <MessageCircle className="mx-auto text-gray-400" size={40} />
            <h2 className="mt-5 text-2xl font-bold">No conversations yet</h2>
            <p className="mt-2 text-gray-500">
              Send a message from any vehicle page to start a thread.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[320px_1fr]">
            <aside className="rounded-3xl border border-[#E5E7EB] bg-white p-4">
              <div className="space-y-3">
                {conversations.map((conversation) => {
                  const active = conversation.id === selectedConversation?.id;

                  return (
                    <button
                      key={conversation.id}
                      type="button"
                      onClick={() => router.push(`${pathname}?conversation=${conversation.id}`)}
                      className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${
                        active ? "bg-[#0B5D3B]/8 ring-1 ring-[#0B5D3B]/20" : "hover:bg-[#F8F9FA]"
                      }`}
                    >
                      <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-gray-100">
                        <Image
                          src={conversation.listingImage}
                          alt={conversation.listingTitle}
                          fill
                          className="object-cover"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">
                          {conversation.listingTitle}
                        </p>
                        <p className="truncate text-sm text-gray-500">
                          {conversation.lastMessage}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="min-h-[640px] rounded-3xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
              {!selectedConversation ? (
                <div className="flex min-h-[560px] items-center justify-center text-center">
                  <div>
                    <MessageCircle className="mx-auto text-[#0B5D3B]" size={40} />
                    <h2 className="mt-4 text-2xl font-bold">Select a conversation</h2>
                    <p className="mt-2 text-gray-500">
                      Choose a thread to continue the discussion.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[560px] flex-col">
                  <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-4">
                    <div className="relative h-14 w-14 overflow-hidden rounded-2xl bg-gray-100">
                      <Image
                        src={selectedConversation.listingImage}
                        alt={selectedConversation.listingTitle}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {selectedConversation.listingTitle}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Chat with {selectedConversation.buyerId === profile?.id ? selectedConversation.sellerName : selectedConversation.buyerName}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto py-5">
                    {loadingMessages ? (
                      <div className="flex min-h-64 items-center justify-center">
                        <Loader2 className="animate-spin text-[#0B5D3B]" size={28} />
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="flex min-h-64 items-center justify-center text-center">
                        <p className="text-gray-500">No messages yet.</p>
                      </div>
                    ) : (
                      messages.map((message) => {
                        const mine = message.senderId === profile?.id;

                        return (
                          <div
                            key={message.id}
                            className={`flex ${mine ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-3xl px-4 py-3 ${
                                mine ? "bg-[#0B5D3B] text-white" : "bg-[#F8F9FA] text-[#202124]"
                              }`}
                            >
                              <p className="text-sm font-semibold opacity-80">
                                {message.senderName}
                              </p>
                              <p className="mt-1 leading-7">{message.body}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-[#E5E7EB] pt-4">
                    <div className="flex gap-3">
                      <input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="Write a message..."
                        className="input"
                      />

                      <button
                        type="button"
                        onClick={() => void sendCurrentMessage()}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-[#0B5D3B] px-6 py-4 font-bold text-white"
                      >
                        <Send size={18} />
                        Send
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </section>
    </main>
  );
}
