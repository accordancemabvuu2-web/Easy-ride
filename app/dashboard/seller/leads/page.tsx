"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { getUserConversations } from "@/services/messageService";
import { getUserOffers } from "@/services/offerService";
import { vehicles as demoVehicles } from "@/Data/vehicles";
import type { Conversation } from "@/Types/message";
import type { VehicleOffer } from "@/Types/offer";
import { BadgeDollarSign, CalendarDays, Loader2, MapPin, MessageCircle, Search, Send, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function SellerLeadsPage() {
  return <RequireAuth><RoleGuard allowedRoles={["seller", "dealer", "buyer"]} label="Seller"><LeadsContent /></RoleGuard></RequireAuth>;
}

function LeadsContent() {
  const { profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [offers, setOffers] = useState<VehicleOffer[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
  const load = useCallback(async () => {
    if (!profile && !demoMode) { setLoading(false); return; }
    setLoading(true);
    try {
      if (demoMode) {
        const sellerId = profile?.id ?? "seller-demo";
        const vehicle = demoVehicles[0];
        const sampleConversation: Conversation = {
          id: "demo-lead-maya", buyerId: "buyer-maya", sellerId, listingId: vehicle.id,
          listingTitle: `${vehicle.year} ${vehicle.make} ${vehicle.model}`, listingImage: vehicle.coverImage,
          buyerName: "Maya Chen", sellerName: profile?.name ?? "EasyRide Seller",
          lastMessage: "Hi, is this vehicle still available? I would love to see it this weekend.",
          unreadBy: [sellerId], participants: [sellerId, "buyer-maya"], updatedAt: new Date().toISOString(),
        };
        setConversations([sampleConversation]);
        setOffers([]);
        setSelectedId(sampleConversation.id);
        return;
      }
      if (!profile) return;
      const [nextConversations, nextOffers] = await Promise.all([
        getUserConversations(profile.id), getUserOffers(profile.id),
      ]);
      setConversations(nextConversations.filter((item) => item.sellerId === profile.id));
      setOffers(nextOffers.filter((item) => item.sellerId === profile.id));
    } finally { setLoading(false); }
  }, [demoMode, profile]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => conversations.filter((conversation) => {
    const text = `${conversation.buyerName} ${conversation.listingTitle} ${conversation.lastMessage}`.toLowerCase();
    const unread = conversation.unreadBy?.includes(profile?.id ?? "") ?? false;
    return text.includes(search.toLowerCase()) && (tab === "all" || (tab === "unread" ? unread : !unread));
  }), [conversations, profile?.id, search, tab]);
  const selected = filtered.find((conversation) => conversation.id === selectedId) ?? filtered[0] ?? null;
  const unreadCount = conversations.filter((conversation) => conversation.unreadBy?.includes(profile?.id ?? "")).length;
  const pendingOffers = offers.filter((offer) => ["pending", "countered"].includes(offer.status)).length;

  return <DashboardShell role="seller"><div className="mx-auto max-w-[1440px]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">Seller studio <span className="mx-2">/</span><span className="font-bold text-slate-800">Leads</span></p><h1 className="mt-2 text-4xl font-black">Buyer leads</h1><p className="mt-2 text-slate-600">Respond quickly, build trust, and turn interest into your next deal.</p></div><Link href="/dashboard/seller/messages" className="rounded-xl bg-[#063F2C] px-5 py-3 font-bold text-white"><MessageCircle className="mr-2 inline" size={18}/>Open messages</Link></header>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><LeadMetric icon={Users} label="Buyer conversations" value={conversations.length}/><LeadMetric icon={MessageCircle} label="Awaiting reply" value={unreadCount}/><LeadMetric icon={BadgeDollarSign} label="Offers to review" value={pendingOffers}/><LeadMetric icon={CalendarDays} label="Appointments" value="—"/></div>
    <div className="mt-6 grid min-h-[620px] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]"><section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Your buyer leads</h2><p className="mt-1 text-sm text-slate-500">Messages and offers connected to your listings.</p></div><label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search buyer, vehicle, message" className="h-10 w-64 rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-700"/></label></div><div className="mt-4 flex gap-2 border-b border-slate-100 pb-3">{[["all","All leads",conversations.length],["unread","Awaiting reply",unreadCount],["read","Active",Math.max(0,conversations.length-unreadCount)]].map(([key,label,count])=><button key={String(key)} onClick={()=>setTab(String(key))} className={`rounded-full px-4 py-2 text-sm font-bold ${tab===key?"bg-[#063F2C] text-white":"bg-slate-50 text-slate-600"}`}>{label} {count}</button>)}</div>
      {loading?<div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-emerald-800"/></div>:filtered.length?<div className="divide-y divide-slate-100">{filtered.map((conversation)=>{const isSelected=selected?.id===conversation.id;const unread=conversation.unreadBy?.includes(profile?.id??"");return <button key={conversation.id} onClick={()=>setSelectedId(conversation.id)} className={`grid w-full gap-3 py-4 text-left sm:grid-cols-[minmax(0,1fr)_auto] ${isSelected?"rounded-xl bg-emerald-50 px-3":""}`}><span className="flex min-w-0 gap-3"><span className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100"><Image src={conversation.listingImage} alt={conversation.listingTitle} fill className="object-cover" sizes="80px"/></span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2 font-black">{conversation.buyerName}{unread&&<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] text-emerald-800">New lead</span>}</span><span className="mt-1 block text-sm font-semibold text-emerald-800">{conversation.listingTitle}</span><span className="mt-1 block truncate text-sm text-slate-500">{conversation.lastMessage}</span></span></span><span className="flex items-center gap-2 self-center text-sm font-bold text-emerald-800">Reply <Send size={15}/></span></button>})}</div>:<div className="py-16 text-center"><MessageCircle className="mx-auto text-slate-300" size={38}/><h3 className="mt-3 font-black">No leads match this view</h3><p className="mt-1 text-sm text-slate-500">Buyer messages about your listings will appear here.</p></div>}</section>
    <aside className="space-y-4">{selected?<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><div><h2 className="text-xl font-black">{selected.buyerName}</h2><span className="mt-1 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">{selected.unreadBy?.includes(profile?.id??"")?"Awaiting reply":"Active conversation"}</span></div><MessageCircle className="text-emerald-700"/></div><p className="mt-5 text-sm font-bold text-slate-600">Vehicle of interest</p><div className="mt-2 flex gap-3"><div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-slate-100"><Image src={selected.listingImage} alt={selected.listingTitle} fill className="object-cover" sizes="112px"/></div><div><p className="font-bold">{selected.listingTitle}</p><p className="mt-1 text-sm text-slate-500">Listing enquiry</p></div></div><p className="mt-5 text-sm font-bold">Latest buyer message</p><p className="mt-2 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">{selected.lastMessage}</p><Link href={`/messages?conversation=${encodeURIComponent(selected.id)}`} className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#063F2C] px-4 py-3 text-sm font-bold text-white"><Send size={16}/>Reply to buyer</Link></section>:<section className="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500">Select a buyer conversation to see details and reply.</section>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Offers needing a response</h2>{offers.filter((offer)=>["pending","countered"].includes(offer.status)).slice(0,3).map((offer)=><Link key={offer.id} href={`/dashboard/seller/offers?highlight=${offer.id}`} className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3"><span><b className="block text-sm">{offer.buyerName}</b><span className="text-xs text-slate-500">{offer.listingTitle}</span></span><span className="whitespace-nowrap text-sm font-black">{offer.currency} {offer.offeredPrice.toLocaleString()}</span></Link>)}{pendingOffers===0&&<p className="mt-2 text-sm text-slate-500">No offers need a response right now.</p>}<Link href="/dashboard/seller/offers" className="mt-4 inline-flex text-sm font-bold text-emerald-800">View all offers →</Link></section>
      <section className="rounded-2xl bg-[#063F2C] p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Respond faster. Close more deals.</p><h2 className="mt-2 text-xl font-black">Keep every conversation moving.</h2><p className="mt-2 text-sm text-white/75">Quick replies and clear next steps help buyers commit.</p><Link href="/messages" className="mt-4 inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-[#063F2C]">Open messages</Link></section></aside></div>
  </div></DashboardShell>;
}

function LeadMetric({icon:Icon,label,value}:{icon:typeof Users;label:string;value:number|string}) { return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><Icon size={21}/></span><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-black">{value}</p></div></div>; }
