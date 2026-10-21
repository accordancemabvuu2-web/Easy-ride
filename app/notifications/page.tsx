"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/hooks/useNotifications";
import { markAllNotificationsRead, markNotificationRead } from "@/services/notificationService";
import {
  BadgeDollarSign,
  Bell,
  CalendarDays,
  Car,
  CheckCheck,
  CreditCard,
  Loader2,
  LifeBuoy,
  MessageCircle,
  ShieldCheck,
  Star,
  Search,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const iconMap = {
  message: MessageCircle,
  new_message: MessageCircle,
  offer: BadgeDollarSign,
  booking: CalendarDays,
  payment: CreditCard,
  listing: Car,
  listing_approved: Car,
  listing_rejected: Car,
  listing_favorited: Car,
  listing_reported: Car,
  verification: ShieldCheck,
  review: Star,
  support: LifeBuoy,
  announcement: Bell,
} as const;

export default function NotificationsPage() {
  return (
    <RequireAuth>
      <NotificationsContent />
    </RequireAuth>
  );
}

function NotificationsContent() {
  const { profile } = useAuth();
  const isSeller = profile?.role === "seller" || profile?.role === "dealer";
  const notifications = useNotifications();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [preferences, setPreferences] = useState<Record<string, boolean>>({ offers: true, bookings: true, messages: true, price: true, marketing: false, email: true, push: true, inApp: true });

  useEffect(() => {
    if (!profile) return;
    try {
      const saved = window.localStorage.getItem(`easy-ride:notification-preferences:${profile.id}`);
      if (saved) setPreferences((current) => ({ ...current, ...(JSON.parse(saved) as Record<string, boolean>) }));
    } catch {
      // Keep the default preferences if local settings are unavailable.
    }
  }, [profile]);

  const unreadNotifications = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications],
  );
  const tabType = (notification: (typeof notifications)[number]) => {
    if (["offer"].includes(notification.type)) return "offers";
    if (["booking", "payment"].includes(notification.type)) return "bookings";
    if (["message", "new_message"].includes(notification.type)) return "messages";
    return "updates";
  };
  const filtered = useMemo(() => notifications.filter((item) => (tab === "all" || (tab === "unread" ? !item.read : tabType(item) === tab)) && (!search || `${item.title} ${item.message} ${item.type}`.toLowerCase().includes(search.trim().toLowerCase()))), [notifications, search, tab]);
  const togglePreference = (key: string) => setPreferences((current) => {
    const next = { ...current, [key]: !current[key] };
    window.localStorage.setItem(`easy-ride:notification-preferences:${profile?.id ?? "guest"}`, JSON.stringify(next));
    return next;
  });

  const markAllRead = async () => {
    try {
      setLoading(true);
      await markAllNotificationsRead(unreadNotifications);
    } catch {
      toast.error("Notifications could not be updated.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardShell role="personal"><section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[#718179]">Home <span className="mx-2">›</span> Notifications</p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">Notifications</h1>
            <p className="mt-2 text-[#73827B]">{isSeller?"Stay ahead of every buyer, booking, and inventory update.":"Stay up to date with your vehicles, offers, bookings, and messages."}</p>
          </div>
          <div className="flex flex-wrap gap-2">{unreadNotifications.length > 0 && <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6E0] bg-white px-4 py-3 text-sm font-semibold disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={17} /> : <CheckCheck size={17} />}
              Mark all read
            </button>}<a href="#notification-preferences" className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6E0] bg-white px-4 py-3 text-sm font-semibold"><Settings size={17}/>Settings</a></div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><NotificationMetric icon={Bell} label="Total notifications" value={notifications.length}/><NotificationMetric icon={CheckCheck} label="Unread" value={unreadNotifications.length}/><NotificationMetric icon={BadgeDollarSign} label="Offer updates" value={notifications.filter((n)=>n.type==="offer").length}/><NotificationMetric icon={CalendarDays} label="Booking updates" value={notifications.filter((n)=>["booking","payment"].includes(n.type)).length}/></div>
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]"><div className="space-y-4"><div className="flex flex-col gap-3 rounded-2xl border border-[#E5ECE8] bg-white p-3 sm:flex-row sm:items-center"><div className="flex flex-wrap gap-1">{[["all","All"],["unread","Unread"],["offers","Offers"],["bookings","Bookings"],["messages","Messages"],["updates","Other updates"]].map(([key,label])=><button key={key} onClick={()=>setTab(key)} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab===key?"bg-[#07543D] text-white":"text-[#687970]"}`}>{label} ({key==="all"?notifications.length:key==="unread"?unreadNotifications.length:notifications.filter((n)=>tabType(n)===key).length})</button>)}</div><div className="relative min-w-40 flex-1"><Search className="absolute left-3 top-3 text-[#718179]" size={17}/><input value={search} onChange={(e)=>setSearch(e.target.value)} className="h-10 w-full rounded-lg border border-[#E1E9E4] pl-9 pr-3 text-sm outline-none" placeholder="Search notifications"/></div></div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-[#D1D5DB] bg-white p-14 text-center">
            <Bell className="mx-auto text-gray-400" size={40} />
            <h2 className="mt-5 text-2xl font-bold">No notifications yet</h2>
            <p className="mt-2 text-gray-500">Activity will appear here when something happens on the platform.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((notification) => {
              const Icon = iconMap[notification.type] ?? Bell;

              return (
                <Link
                  key={notification.id}
                  href={notification.actionUrl ?? notification.link ?? "#"}
                  onClick={() => void markNotificationRead(notification.id)}
                  className={`block rounded-2xl border p-4 transition hover:shadow-sm ${
                    notification.read
                      ? "border-[#E5E7EB] bg-white"
                      : "border-[#0B5D3B]/20 bg-[#0B5D3B]/6"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-4">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-[#0B5D3B] shadow-sm">
                        <Icon size={18} />
                      </div>

                      <div>
                        <p className="font-bold">{notification.title}</p>
                        <p className="mt-2 text-sm leading-6 text-gray-600">{notification.message}</p>
                      </div>
                    </div>

                    {!notification.read && <span className="mt-1 h-3 w-3 rounded-full bg-[#0B5D3B]" />}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {!profile && (
          <p className="mt-4 text-sm text-gray-500">
            Please log in to see your personalized notifications.
          </p>
        )}
      </div><aside id="notification-preferences" className="h-fit rounded-2xl border border-[#E4EBE7] bg-white p-5"><h2 className="text-lg font-black">Notification preferences</h2><p className="mt-1 text-sm text-[#718179]">Choose the updates you want to see.</p><div className="mt-4 divide-y divide-[#EEF2EF]">{[["offers","Offers and negotiations"],["bookings","Bookings and reminders"],["messages","Messages"],["price","Price drops and saved searches"],["marketing","Marketing updates"],["email","Email channel"],["push","Push notifications"],["inApp","In-app notifications"]].map(([key,label])=><label key={key} className="flex cursor-pointer items-center justify-between gap-3 py-3"><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={preferences[key]} onChange={()=>togglePreference(key)} className="h-5 w-5 accent-[#07543D]"/></label>)}</div><Link href="/support" className="mt-4 inline-flex w-full justify-center rounded-xl bg-[#07543D] px-4 py-3 text-sm font-bold text-white">Contact support</Link></aside></div>
      </section></DashboardShell>
  );
}

function NotificationMetric({icon:Icon,label,value}:{icon:typeof Bell;label:string;value:number}){return <div className="flex items-center gap-4 rounded-2xl border border-[#E5ECE8] bg-white p-4"><span className="rounded-xl bg-[#EAF5EF] p-3 text-[#07543D]"><Icon size={20}/></span><div><p className="text-sm text-[#718179]">{label}</p><p className="text-2xl font-black">{value}</p></div></div>}
