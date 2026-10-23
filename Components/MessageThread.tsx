"use client";

import { markConversationRead, sendMessage, subscribeToMessages } from "@/services/messageService";
import type { Conversation, EasyRideMessage } from "@/Types/message";
import { Loader2, Send } from "lucide-react";
import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";

interface MessageThreadProps {
  conversation: Conversation;
  currentUser: {
    id: string;
    name: string;
  };
}

export default function MessageThread({ conversation, currentUser }: MessageThreadProps) {
  const [messages, setMessages] = useState<EasyRideMessage[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomReference = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    markConversationRead(conversation.id, currentUser.id).catch(console.error);
    return subscribeToMessages(conversation.id, setMessages);
  }, [conversation.id, currentUser.id]);

  useEffect(() => {
    bottomReference.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();

    if (!message.trim()) {
      return;
    }

    try {
      setSending(true);
      await sendMessage(conversation, currentUser, message);
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  const otherName =
    currentUser.id === conversation.buyerId ? conversation.sellerName : conversation.buyerName;

  return (
    <section className="flex h-[calc(100vh-190px)] min-h-[600px] flex-col bg-white">
      <header className="flex items-center gap-4 border-b border-[#E5E7EB] p-4 sm:p-5">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-gray-100">
          <Image src={conversation.listingImage} alt={conversation.listingTitle} fill className="object-cover" />
        </div>

        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold">{otherName}</h2>
          <p className="truncate text-sm font-medium text-[#0B5D3B]">{conversation.listingTitle}</p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto bg-[#F6F8F7] p-4 sm:p-6">
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-500">Start the conversation.</div>
          ) : (
            messages.map((item) => {
              const mine = item.senderId === currentUser.id;

              return (
                <div key={item.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-3xl px-4 py-3 sm:max-w-[70%] ${
                      mine
                        ? "rounded-br-md bg-[#0B5D3B] text-white"
                        : "rounded-bl-md border border-[#E5E7EB] bg-white text-[#202124]"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words text-sm leading-6">{item.body}</p>
                    <p className={`mt-1 text-[11px] ${mine ? "text-white/60" : "text-gray-400"}`}>
                      {mine ? "You" : item.senderName}
                    </p>
                  </div>
                </div>
              );
            })
          )}

          <div ref={bottomReference} />
        </div>
      </div>

      <form onSubmit={submit} className="border-t border-[#E5E7EB] bg-white p-4">
        <div className="mx-auto flex max-w-3xl items-end gap-3">
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            className="min-h-12 max-h-32 flex-1 resize-none rounded-2xl border border-[#E5E7EB] bg-[#F8F9FA] px-4 py-3 outline-none focus:border-[#0B5D3B]"
            placeholder="Type a message..."
          />

          <button
            type="submit"
            disabled={sending || !message.trim()}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#0B5D3B] text-white disabled:opacity-50"
          >
            {sending ? <Loader2 className="animate-spin" size={19} /> : <Send size={19} />}
          </button>
        </div>
      </form>
    </section>
  );
}
