"use client";

import ConversationList from "@/Components/ConversationList";
import MessageThread from "@/Components/MessageThread";
import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { markConversationRead, subscribeToUserConversations } from "@/services/messageService";
import type { Conversation } from "@/Types/message";
import { ArrowLeft, Archive, Loader2, MessageCircle, Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import toast from "react-hot-toast";

export default function MessagesPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<MessagesLoading />}>
        <MessagesContent />
      </Suspense>
    </RequireAuth>
  );
}

function MessagesLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8F9FA]">
      <Loader2 className="animate-spin text-[#0B5D3B]" size={32} />
    </main>
  );
}

function MessagesContent() {
  const { firebaseUser, profile } = useAuth();
  const currentUserId = profile?.id ?? firebaseUser?.uid ?? null;
  const searchParams = useSearchParams();
  const requestedConversationId = searchParams.get("conversation");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [archived, setArchived] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    try { setArchived(JSON.parse(window.localStorage.getItem(`easy-ride:archived-conversations:${profile.id}`) ?? "[]") as string[]); } catch { setArchived([]); }
  }, [profile]);
  const filteredConversations = conversations.filter((conversation) => {
    const isArchived = archived.includes(conversation.id);
    const unread = conversation.unreadBy?.includes(currentUserId ?? "");
    const otherName = currentUserId === conversation.buyerId ? conversation.sellerName : conversation.buyerName;
    return (tab === "all" ? !isArchived : tab === "unread" ? !isArchived && unread : isArchived) &&
      (!search || `${otherName} ${conversation.listingTitle} ${conversation.lastMessage}`.toLowerCase().includes(search.toLowerCase()));
  });
  const toggleArchive = (conversationId: string) => setArchived((current) => {
    const next = current.includes(conversationId) ? current.filter((id) => id !== conversationId) : [...current, conversationId];
    if (profile) window.localStorage.setItem(`easy-ride:archived-conversations:${profile.id}`, JSON.stringify(next));
    return next;
  });

  useEffect(() => {
    if (!currentUserId) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError("");
    const unsubscribe = subscribeToUserConversations(currentUserId, (items) => {
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
    }, (error) => {
      console.error("Could not load conversations", error);
      setLoading(false);
      setLoadError("Your conversations could not be loaded. Check your connection and try again.");
    });

    return unsubscribe;
  }, [currentUserId, requestedConversationId, retryCount]);

  useEffect(() => {
    if (!currentUserId || !selectedConversation) {
      return;
    }

    void markConversationRead(selectedConversation.id, currentUserId).catch((error: unknown) => {
      console.error("Could not mark conversation read", error);
    });
  }, [currentUserId, selectedConversation]);

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setMobileThreadOpen(true);

    if (currentUserId) {
      try {
        await markConversationRead(conversation.id, currentUserId);
      } catch {
        toast.error("Conversation opened, but its read status could not be updated.");
      }
    }
  };

  return (
    <DashboardShell role="personal"><section className="space-y-5">
        <div className="mb-6">
          <p className="text-sm font-semibold text-[#718179]">Home <span className="mx-2">›</span> Messages</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-3xl font-black sm:text-4xl">Messages</h1><p className="mt-2 text-[#73827B]">Stay connected with sellers, buyers, and rental hosts.</p></div><Link href="/marketplace" className="rounded-xl bg-[#07543D] px-4 py-3 text-sm font-bold text-white">Browse vehicles to message</Link></div>
        </div>

        {loading ? (
          <div className="flex min-h-[500px] items-center justify-center">
            <Loader2 className="animate-spin text-[#0B5D3B]" size={34} />
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
            <MessageCircle className="mx-auto text-[#07543D]" size={36} />
            <h2 className="mt-4 text-lg font-bold">Messages are temporarily unavailable</h2>
            <p className="mt-2 text-sm text-[#687970]">{loadError}</p>
            <button type="button" onClick={() => setRetryCount((count) => count + 1)} className="mt-4 rounded-xl bg-[#07543D] px-5 py-2.5 text-sm font-bold text-white">Try again</button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-sm lg:grid lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className={`border-r border-[#E5E7EB] ${mobileThreadOpen ? "hidden lg:block" : "block"}`}>
              <div className="border-b border-[#E5E7EB] p-4">
                <div className="relative"><Search className="absolute left-3 top-3 text-[#718179]" size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} className="h-10 w-full rounded-lg border border-[#E1E9E4] pl-9 pr-3 text-sm outline-none" placeholder="Search conversations"/></div>
                <div className="mt-3 flex rounded-xl bg-[#F3F7F4] p-1">{[["all","All"],["unread","Unread"],["archived","Archived"]].map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={`flex-1 rounded-lg px-2 py-2 text-xs font-bold ${tab===key?"bg-[#07543D] text-white":"text-[#687970]"}`}>{label}</button>)}</div>
                <p className="mt-3 text-xs text-gray-500">{filteredConversations.length} conversation{filteredConversations.length !== 1 ? "s" : ""}</p>
              </div>

              <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
                <ConversationList
                  conversations={filteredConversations}
                  currentUserId={currentUserId ?? ""}
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

              {selectedConversation && currentUserId && profile ? (
                <div><div className="flex justify-end border-b border-[#E5E7EB] px-4 py-2"><button onClick={()=>toggleArchive(selectedConversation.id)} className="inline-flex items-center gap-2 text-xs font-bold text-[#687970]"><Archive size={15}/>{archived.includes(selectedConversation.id)?"Restore conversation":"Archive conversation"}</button></div><MessageThread
                  key={selectedConversation.id}
                  conversation={selectedConversation}
                  currentUser={{ id: currentUserId, name: profile.name }}
                /></div>
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
      </section></DashboardShell>
  );
}
