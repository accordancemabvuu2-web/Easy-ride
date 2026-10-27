"use client";

import ConversationList from "@/Components/ConversationList";
import MessageThread from "@/Components/MessageThread";
import Navbar from "@/Components/Navbar";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { markConversationRead, subscribeToUserConversations } from "@/services/messageService";
import type { Conversation } from "@/Types/message";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MessagesPage() {
  return (
    <RequireAuth>
      <MessagesContent />
    </RequireAuth>
  );
}

function MessagesContent() {
  const { firebaseUser, profile } = useAuth();
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  useEffect(() => {
    if (!firebaseUser) {
      return;
    }

    const unsubscribe = subscribeToUserConversations(firebaseUser.uid, (items) => {
      setConversations(items);
      setLoading(false);

      if (requestedConversationId) {
        const requested = items.find((item) => item.id === requestedConversationId);

        if (requested) {
          setSelectedConversation(requested);
          setMobileThreadOpen(true);
          return;
        }
      }

      setSelectedConversation((current) => current ?? items[0] ?? null);
    });

    return unsubscribe;
  }, [firebaseUser, requestedConversationId]);

  useEffect(() => {
    if (!firebaseUser || !selectedConversation) {
      return;
    }

    void markConversationRead(selectedConversation.id, firebaseUser.uid);
  }, [firebaseUser, selectedConversation]);

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMobileThreadOpen(true);

    if (firebaseUser) {
      await markConversationRead(conversation.id, firebaseUser.uid);
    }
  };

  return (
    <main className="min-h-screen bg-[#F8F9FA]">
      <Navbar />

      <section className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <MessageCircle className="text-[#0B5D3B]" />
            <h1 className="text-3xl font-bold sm:text-4xl">Messages</h1>
          </div>
          <p className="mt-2 text-gray-500">Chat securely with buyers and sellers.</p>
        </div>

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={34} />
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-[#E5E7EB] bg-white shadow-sm lg:grid lg:grid-cols-[360px_1fr]">
            <aside className={`border-r border-[#E5E7EB] ${mobileThreadOpen ? "hidden lg:block" : "block"}`}>
              <div className="border-b border-[#E5E7EB] px-5 py-4">
                <h2 className="font-bold">Conversations</h2>
                <p className="mt-1 text-xs text-gray-500">
                  {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="max-h-[calc(100vh-270px)] overflow-y-auto">
                <ConversationList
                  conversations={conversations}
                  currentUserId={firebaseUser?.uid ?? ""}
                  selectedId={selectedConversation?.id ?? null}
                  onSelect={(conversation) => void selectConversation(conversation)}
                />
              </div>
            </aside>

            <div className={`${mobileThreadOpen ? "block" : "hidden lg:block"}`}>
              {mobileThreadOpen ? (
                <button
                  type="button"
                  onClick={() => setMobileThreadOpen(false)}
                  className="flex w-full items-center gap-2 border-b border-[#E5E7EB] px-4 py-3 font-semibold text-[#0B5D3B] lg:hidden"
                >
                  <ArrowLeft size={18} />
                  Conversations
                </button>
              ) : null}

              {selectedConversation && firebaseUser && profile ? (
                <MessageThread
                  key={selectedConversation.id}
                  conversation={selectedConversation}
                  currentUser={{
                    id: firebaseUser.uid,
                    name: profile.name,
                  }}
                />
              ) : (
                <div className="flex min-h-[600px] flex-col items-center justify-center px-6 text-center">
                  <MessageCircle className="text-gray-400" size={44} />
                  <h2 className="mt-5 text-2xl font-bold">Select a conversation</h2>
                  <p className="mt-2 max-w-md text-gray-500">
                    Choose a conversation to view and send messages.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
