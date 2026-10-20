"use client";

import BookingStatusBadge from "@/Components/BookingStatusBadge";
import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { vehicles as demoVehicles } from "@/Data/vehicles";
import { approveBooking, getUserBookings, rejectBooking, updateBookingStatus } from "@/services/bookingService";
import type { BookingStatus, RentalBooking } from "@/Types/booking";
import { ArrowRight, CalendarDays, CarFront, Check, Clock3, Loader2, MapPin, Plus, Sparkles, Wrench } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

const DEMO_BOOKING_KEY = "easy-ride:seller-demo-rentals";
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function SellerRentalManagementPage() {
  return <RequireAuth><RoleGuard allowedRoles={["buyer", "seller", "dealer"]} label="Seller"><RentalManagement /></RoleGuard></RequireAuth>;
}

function RentalManagement() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDays, setScheduleDays] = useState<Date[]>([]);
  const [view, setView] = useState<"week" | "month">("week");

  const load = useCallback(async () => {
    if (!profile && !demoMode) { setLoading(false); return; }
    setLoading(true);
    try {
      if (demoMode) {
        let saved: RentalBooking[] = [];
        let allStored: RentalBooking[] = [];
        try { saved = JSON.parse(window.localStorage.getItem(DEMO_BOOKING_KEY) ?? "[]") as RentalBooking[]; } catch { saved = []; }
        try { allStored = JSON.parse(window.localStorage.getItem("easy-ride:bookings") ?? "[]") as RentalBooking[]; } catch { allStored = []; }
        const sellerId = profile?.id ?? "seller-demo";
        const sellerName = profile?.name ?? "EasyRide Seller";
        let mine = saved.filter((booking) => booking.ownerId === sellerId);
        if (!mine.length) {
          const rentalVehicles = demoVehicles.filter((vehicle) => vehicle.listingType === "rent");
          const date = (delta: number) => { const day = new Date(); day.setDate(day.getDate() + delta); return day.toISOString().slice(0, 10); };
          mine = [
            demoBooking(sellerId, sellerName, rentalVehicles[0], "rental-maya", "Maya Chen", date(0), date(3), "confirmed", "I will arrive for pickup this afternoon."),
            demoBooking(sellerId, sellerName, rentalVehicles[0], "rental-jordan", "Jordan Williams", date(2), date(5), "pending", "Could I collect the vehicle at 10 AM?"),
            demoBooking(sellerId, sellerName, rentalVehicles[1], "rental-priya", "Priya Shah", date(-2), date(0), "active", "Vehicle collected. Thank you!"),
            demoBooking(sellerId, sellerName, rentalVehicles[1], "rental-noah", "Noah Martin", date(-8), date(-5), "completed", "Great rental experience."),
          ];
          window.localStorage.setItem(DEMO_BOOKING_KEY, JSON.stringify(mine));
          window.localStorage.setItem("easy-ride:bookings", JSON.stringify([...allStored.filter((booking) => !mine.some((sample) => sample.id === booking.id)), ...mine]));
        }
        setBookings(mine);
      } else {
        if (!profile) return;
        setBookings((await getUserBookings(profile.id)).filter((booking) => booking.ownerId === profile.id));
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Rental management could not be loaded.");
    } finally { setLoading(false); }
  }, [profile]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const today = new Date();
    const first = new Date(today);
    if (view === "week") first.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    else first.setDate(1);
    const length = view === "week" ? 7 : new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    setScheduleDays(Array.from({ length }, (_, index) => { const day = new Date(first); day.setDate(first.getDate() + index); return day; }));
  }, [view]);

  const today = new Date().toISOString().slice(0, 10);
  const active = bookings.filter((booking) => booking.status === "active").length;
  const pickups = bookings.filter((booking) => ["confirmed", "awaiting_payment"].includes(booking.status) && booking.pickupDate >= today).length;
  const dueBack = bookings.filter((booking) => booking.status === "active" && booking.returnDate <= today).length;
  const utilization = bookings.length ? Math.round(active / Math.max(2, new Set(bookings.map((booking) => booking.listingId)).size) * 100) : 0;
  const operations = bookings.filter((booking) => booking.pickupDate === today || booking.returnDate === today || booking.status === "pending").sort((a,b) => a.pickupDate.localeCompare(b.pickupDate));

  const updateStatus = async (booking: RentalBooking, status: BookingStatus) => {
    try {
      if (demoMode) {
        const next = bookings.map((item) => item.id === booking.id ? { ...item, status, updatedAt: new Date().toISOString() } : item);
        setBookings(next);
        window.localStorage.setItem(DEMO_BOOKING_KEY, JSON.stringify(next));
        const allBookings = JSON.parse(window.localStorage.getItem("easy-ride:bookings") ?? "[]") as RentalBooking[];
        window.localStorage.setItem("easy-ride:bookings", JSON.stringify(allBookings.map((item) => item.id === booking.id ? { ...item, status, updatedAt: new Date().toISOString() } : item)));
      } else {
        await updateBookingStatus(booking.id, status);
        await load();
      }
      toast.success(status === "active" ? "Pickup marked complete." : "Return marked complete.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Booking status could not be updated."); }
  };

  const approve = async (booking: RentalBooking) => {
    if (!profile) return;
    try {
      if (demoMode) {
        const next = bookings.map((item) => item.id === booking.id ? { ...item, status: "awaiting_payment" as const, paymentStatus: "pending" as const } : item);
        setBookings(next); window.localStorage.setItem(DEMO_BOOKING_KEY, JSON.stringify(next));
        const allBookings = JSON.parse(window.localStorage.getItem("easy-ride:bookings") ?? "[]") as RentalBooking[];
        window.localStorage.setItem("easy-ride:bookings", JSON.stringify(allBookings.map((item) => item.id === booking.id ? { ...item, status: "awaiting_payment", paymentStatus: "pending" } : item)));
      } else { await approveBooking(booking.id, profile.id); await load(); }
      toast.success("Rental request approved.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request could not be approved."); }
  };
  const decline = async (booking: RentalBooking) => {
    if (!profile) return;
    const reason = window.prompt("Reason for declining this rental request:");
    if (!reason?.trim()) return;
    try {
      if (demoMode) {
        const next = bookings.map((item) => item.id === booking.id ? { ...item, status: "rejected" as const, rejectionReason: reason.trim() } : item);
        setBookings(next); window.localStorage.setItem(DEMO_BOOKING_KEY, JSON.stringify(next));
        const allBookings = JSON.parse(window.localStorage.getItem("easy-ride:bookings") ?? "[]") as RentalBooking[];
        window.localStorage.setItem("easy-ride:bookings", JSON.stringify(allBookings.map((item) => item.id === booking.id ? { ...item, status: "rejected", rejectionReason: reason.trim() } : item)));
      } else { await rejectBooking(booking.id, profile.id, reason.trim()); await load(); }
      toast.success("Rental request declined.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Request could not be declined."); }
  };

  return <DashboardShell role="seller"><div className="mx-auto max-w-[1440px]">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">Seller studio <span className="mx-2">/</span>Rental management</p><h1 className="mt-2 text-4xl font-black">Rental management</h1><p className="mt-2 text-slate-600">Keep every rental ready, visible, and moving on schedule.</p>{demoMode&&<span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Demo rentals · actions are saved in this browser</span>}</div><div className="flex gap-2"><Link href="/dashboard/seller/bookings" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">All bookings</Link><Link href="/dashboard/seller/add-vehicle?type=rent" className="rounded-xl bg-[#063F2C] px-5 py-3 font-bold text-white"><Plus className="mr-2 inline" size={18}/>Create rental</Link></div></header>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><RentalMetric icon={CarFront} label="Active rentals" value={active}/><RentalMetric icon={CalendarDays} label="Upcoming pickups" value={pickups}/><RentalMetric icon={Clock3} label="Due back today" value={dueBack}/><RentalMetric icon={Sparkles} label="Fleet utilization" value={`${utilization}%`}/></div>
    {loading?<div className="flex min-h-72 items-center justify-center"><Loader2 className="animate-spin text-emerald-800"/></div>:<div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]"><div className="min-w-0 space-y-5"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Rental schedule</h2><p className="mt-1 text-sm text-slate-500">Pickup and return activity across your fleet.</p></div><div className="flex rounded-lg border border-slate-200 p-1">{(["week","month"] as const).map((period)=><button key={period} onClick={()=>setView(period)} className={`rounded-md px-3 py-2 text-sm font-bold capitalize ${view===period?"bg-emerald-50 text-emerald-900":"text-slate-500"}`}>{period}</button>)}</div></div><div className="mt-5 overflow-x-auto"><div className="grid min-w-[760px]" style={{gridTemplateColumns:`180px repeat(${scheduleDays.length},minmax(74px,1fr))`}}><div className="border-b border-slate-100 p-2 text-xs font-bold text-slate-500">Vehicle</div>{scheduleDays.map((date)=><div key={date.toISOString()} className={`border-b border-l border-slate-100 p-2 text-center ${date.toISOString().slice(0,10)===today?"bg-emerald-50":""}`}><span className="block text-[10px] font-bold uppercase text-slate-400">{date.toLocaleDateString(undefined,{weekday:"short"})}</span><b>{date.getDate()}</b></div>)}{[...new Map(bookings.map((booking)=>[booking.listingId,booking])).values()].map((vehicle)=>{const vehicleBookings=bookings.filter((booking)=>booking.listingId===vehicle.listingId);return <div key={vehicle.listingId} className="contents"><div className="flex items-center gap-2 border-b border-slate-100 p-2"><div className="relative h-10 w-14 overflow-hidden rounded-md bg-slate-100"><Image src={vehicle.listingImage} alt={vehicle.listingTitle} fill className="object-cover" sizes="56px"/></div><span className="min-w-0 truncate text-xs font-bold">{vehicle.listingTitle}</span></div>{scheduleDays.map((date)=>{const dateKey=date.toISOString().slice(0,10);const event=vehicleBookings.find((booking)=>(booking.pickupDate===dateKey||booking.returnDate===dateKey)&&!(["completed","cancelled","rejected"].includes(booking.status)));return <div key={`${vehicle.listingId}-${dateKey}`} className="relative min-h-16 border-b border-l border-slate-100 p-1">{event&&<div title={`${event.renterName}: ${event.status}`} className={`mt-2 rounded-md px-1 py-1.5 text-center text-[10px] font-bold ${event.pickupDate===dateKey?"bg-emerald-100 text-emerald-900":"bg-blue-100 text-blue-900"}`}>{event.pickupDate===dateKey?"Pickup":"Return"}<span className="hidden 2xl:inline"> · {event.renterName.split(" ")[0]}</span></div>}</div>})}</div>})}</div></div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">Today’s operations</h2><p className="mt-1 text-sm text-slate-500">Pickup and return actions that need attention.</p></div><Link href="/dashboard/seller/bookings" className="text-sm font-bold text-emerald-800">View all bookings <ArrowRight className="ml-1 inline" size={15}/></Link></div>{operations.length?operations.map((booking)=><div key={booking.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"><div className="flex min-w-0 items-center gap-3"><div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100"><Image src={booking.listingImage} alt={booking.listingTitle} fill className="object-cover" sizes="80px"/></div><div className="min-w-0"><p className="truncate font-bold">{booking.listingTitle}</p><p className="mt-1 text-sm text-slate-500">{booking.renterName} · {booking.pickupDate===today?"Pickup today":"Return due today"}</p><BookingStatusBadge status={booking.status}/></div></div><div className="flex flex-wrap gap-2">{booking.status==="pending"&&<><button onClick={()=>void approve(booking)} className="rounded-lg bg-[#063F2C] px-3 py-2 text-sm font-bold text-white">Approve</button><button onClick={()=>void decline(booking)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold">Decline</button></>}{booking.status==="confirmed"&&<button onClick={()=>void updateStatus(booking,"active")} className="rounded-lg bg-[#063F2C] px-3 py-2 text-sm font-bold text-white">Complete pickup</button>}{booking.status==="active"&&<button onClick={()=>void updateStatus(booking,"completed")} className="rounded-lg bg-[#063F2C] px-3 py-2 text-sm font-bold text-white">Complete return</button>}<Link href={`/bookings/${booking.id}`} className="rounded-lg border border-emerald-800 px-3 py-2 text-sm font-bold text-emerald-900">Details</Link></div></div>):<p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No pickups or returns need attention today.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-black">Upcoming reservations</h2>{bookings.filter((booking)=>!["completed","cancelled","rejected"].includes(booking.status)).map((booking)=><div key={booking.id} className="mt-3 grid gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[1fr_auto] sm:items-center"><div className="flex items-center gap-3"><div><p className="font-bold">{booking.listingTitle}</p><p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14}/>{booking.renterName} · {booking.pickupDate} to {booking.returnDate}</p></div></div><div className="flex items-center gap-2"><BookingStatusBadge status={booking.status}/>{booking.status==="pending"&&<button onClick={()=>void approve(booking)} className="rounded-lg bg-[#063F2C] px-3 py-2 text-xs font-bold text-white">Approve</button>}<Link href={`/bookings/${booking.id}`} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Open</Link></div></div>)}{bookings.every((booking)=>["completed","cancelled","rejected"].includes(booking.status))&&<p className="mt-3 text-sm text-slate-500">No upcoming reservations.</p>}</section></div>
      <aside className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Fleet readiness</h2><Readiness icon={Check} label="Ready" value={Math.max(0,2-active-dueBack)}/><Readiness icon={CarFront} label="On rental" value={active}/><Readiness icon={Sparkles} label="Cleaning" value={dueBack}/><Readiness icon={Wrench} label="Maintenance" value={0}/></section><section className="rounded-2xl bg-[#063F2C] p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Rent with confidence</p><h2 className="mt-2 text-xl font-black">Protect every handoff</h2><p className="mt-2 text-sm text-white/75">Confirm pickup details and record the vehicle condition at every return.</p><Link href="/dashboard/seller/support" className="mt-5 block rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-[#063F2C]">View rental policies</Link></section><section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h2 className="flex items-center gap-2 font-black"><Wrench size={18} className="text-amber-600"/>Needs attention</h2><p className="mt-2 text-sm text-slate-600">{dueBack?`${dueBack} vehicle(s) are due back today.`:"Your fleet has no overdue returns."}</p><Link href="/dashboard/seller/bookings" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-amber-900">Review reservations <ArrowRight size={15}/></Link></section></aside></div>}</div></DashboardShell>;
}

function demoBooking(ownerId:string,ownerName:string,vehicle:(typeof demoVehicles)[number],id:string,renterName:string,pickupDate:string,returnDate:string,status:BookingStatus,renterMessage:string):RentalBooking { const days=Math.max(1,Math.ceil((new Date(returnDate).getTime()-new Date(pickupDate).getTime())/86400000));const amount=vehicle.price*days;return {id,listingId:vehicle.id,listingTitle:`${vehicle.year} ${vehicle.make} ${vehicle.model}`,listingImage:vehicle.coverImage,renterId:`demo-${id}`,renterName,renterEmail:`${renterName.toLowerCase().replace(" ",".")}@example.com`,renterPhone:"+1 416 555 0100",ownerId,ownerName,pickupDate,returnDate,totalDays:days,dailyRate:vehicle.price,subtotal:amount,serviceFee:0,deposit:0,totalAmount:amount,currency:vehicle.currency,status,renterMessage,paymentStatus:status==="confirmed"||status==="active"?"paid":"pending",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}; }
function RentalMetric({icon:Icon,label,value}:{icon:typeof CarFront;label:string;value:number|string}) { return <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className="rounded-xl bg-emerald-50 p-3 text-emerald-800"><Icon size={21}/></span><div><p className="text-sm text-slate-500">{label}</p><p className="text-2xl font-black">{value}</p></div></div>; }
function Readiness({icon:Icon,label,value}:{icon:typeof Check;label:string;value:number}) { return <div className="mt-5 flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-600"><Icon size={17}/>{label}</span><b>{value}</b></div>; }
