"use client";

import DashboardShell, { useDashboardSearch } from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import RoleGuard from "@/Components/RoleGuard";
import { useAuth } from "@/contexts/AuthContext";
import { vehicles as demoVehicles } from "@/Data/vehicles";
import { deleteListing, getMyListings, updateListingStatus } from "@/services/listingService";
import type { ListingStatus, Vehicle } from "@/Types/vehicle";
import { AlertTriangle, ArrowDownUp, BarChart3, CarFront, Check, Eye, Fuel, Heart, ImagePlus, Loader2, MessageCircle, MoreVertical, Plus, Search, Settings2, SlidersHorizontal, Tag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
type InventoryTab = "all" | "draft" | "review" | "live" | "reserved" | "sold" | "paused" | "archived" | "attention";
type InventoryListing = Vehicle & { stockNumber: string; enquiries: number; offers: number; attention?: string; demoStatus?: string };
const tabs: Array<{ id: InventoryTab; label: string }> = [
  { id: "all", label: "All" }, { id: "draft", label: "Drafts" }, { id: "review", label: "In review" },
  { id: "live", label: "Live" }, { id: "reserved", label: "Reserved" }, { id: "sold", label: "Sold" },
  { id: "paused", label: "Paused" }, { id: "archived", label: "Archived" },
];
const demoStatuses = ["attention", "active", "reserved", "pending", "sold", "active"];
const demoStock = ["ER1024", "ER1031", "ER0998", "ER1042", "ER0977", "ER1018"];
const demoEnquiries = [6, 14, 12, 3, 8, 4];
const demoOffers = [2, 4, 3, 0, 2, 1];

export default function SellerInventoryPage() {
  return <RequireAuth><RoleGuard allowedRoles={["buyer", "seller", "dealer"]} label="Seller"><InventoryContent /></RoleGuard></RequireAuth>;
}

function InventoryContent() {
  const { profile } = useAuth();
  const dashboardSearch = useDashboardSearch();
  const [listings, setListings] = useState<InventoryListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<InventoryTab>("all");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [makeFilter, setMakeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [sort, setSort] = useState("updated");
  const [view, setView] = useState<"cards" | "table">("cards");
  const [selected, setSelected] = useState<InventoryListing | null>(null);
  const load = useCallback(async () => {
    if (!profile && !demoMode) { setLoading(false); return; }
    try {
      setLoading(true);
      const ownedListings = profile && !demoMode ? await getMyListings(profile.id) : [];
      const vehicles = demoMode
        ? [...demoVehicles, ...ownedListings.filter((vehicle) => !vehicle.id.startsWith("seed-") && !demoVehicles.some((sample) => sample.id === vehicle.id))]
        : ownedListings;
      setListings(vehicles.map((vehicle) => {
        const seedNumber = vehicle.id.startsWith("seed-") ? Number(vehicle.id.slice(5)) : 0;
        const sampleIndex = seedNumber > 0 ? seedNumber - 1 : -1;
        return {
        ...vehicle,
        stockNumber: sampleIndex >= 0 ? demoStock[sampleIndex % demoStock.length] : `ER${vehicle.id.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase()}`,
        enquiries: sampleIndex >= 0 ? demoEnquiries[sampleIndex % demoEnquiries.length] : 0,
        offers: sampleIndex >= 0 ? demoOffers[sampleIndex % demoOffers.length] : 0,
        demoStatus: sampleIndex >= 0 ? demoStatuses[sampleIndex % demoStatuses.length] : undefined,
        attention: demoMode && sampleIndex === 0 ? "Add 2 photos to publish this Toyota Axio" : undefined,
      };
      }));
    } catch {
      toast.error("Your inventory could not be loaded.");
    } finally { setLoading(false); }
  }, [profile]);
  useEffect(() => { void load(); }, [load]);

  const resolvedStatus = (listing: InventoryListing) => listing.demoStatus ?? listing.status;
  const counts = useMemo(() => ({
    total: listings.length,
    live: listings.filter((item) => resolvedStatus(item) === "active").length,
    attention: listings.filter((item) => item.attention || resolvedStatus(item) === "rejected").length,
    done: listings.filter((item) => ["reserved", "sold", "rented"].includes(resolvedStatus(item))).length,
  }), [listings]);
  const filtered = useMemo(() => listings.filter((item) => {
    const status = resolvedStatus(item);
    const searchTerm = (query || dashboardSearch).toLowerCase();
    const searchMatch = `${item.make} ${item.model} ${item.year} ${item.stockNumber} ${item.location.city} ${item.location.country} ${status}`.toLowerCase().includes(searchTerm);
    const tabMatch = tab === "all" || (tab === "attention" ? Boolean(item.attention) : tab === "draft" ? status === "draft" : tab === "review" ? status === "pending" : tab === "live" ? status === "active" : status === tab);
    return searchMatch && tabMatch && (statusFilter === "all" || status === statusFilter) && (makeFilter === "all" || item.make === makeFilter) && (locationFilter === "all" || item.location.city === locationFilter);
  }).sort((a, b) => sort === "price-asc" ? a.price - b.price : sort === "price-desc" ? b.price - a.price : sort === "performance" ? (b.views + b.favoritesCount + b.enquiries) - (a.views + a.favoritesCount + a.enquiries) : (b.updatedAt ?? b.createdAt ?? "").localeCompare(a.updatedAt ?? a.createdAt ?? "")), [dashboardSearch, listings, query, tab, statusFilter, makeFilter, locationFilter, sort]);

  const updateStatus = async (listing: InventoryListing, status: ListingStatus) => {
    try { await updateListingStatus(listing.id, status); toast.success("Listing updated."); await load(); setSelected(null); }
    catch { toast.error("Listing could not be updated."); }
  };
  const remove = async (listing: InventoryListing) => {
    if (!window.confirm(`Delete ${listing.make} ${listing.model}?`)) return;
    try { await deleteListing(listing.id); toast.success("Listing deleted."); await load(); setSelected(null); }
    catch { toast.error("Listing could not be deleted."); }
  };
  const actionFor = (listing: InventoryListing) => {
    const status = resolvedStatus(listing);
    if (listing.attention) return { label: "Fix issue", style: "amber", run: () => setSelected(listing) };
    if (status === "draft") return { label: "Continue listing", style: "green", run: () => setSelected(listing) };
    if (status === "pending") return { label: "View review", style: "amber", run: () => setSelected(listing) };
    if (status === "reserved") return { label: "View deal", style: "outline", run: () => setSelected(listing) };
    if (["sold", "rented"].includes(status)) return { label: "View summary", style: "outline", run: () => setSelected(listing) };
    if (status === "paused" || status === "suspended") return { label: "Resume listing", style: "green", run: () => void updateStatus(listing, "active") };
    return { label: "Manage listing", style: "green", run: () => setSelected(listing) };
  };

  const Attention = () => {
    const items = listings.filter((listing) => listing.attention);
    return <section className="mt-5 rounded-2xl border border-amber-200 bg-[#FFF9E8] p-4 sm:p-5"><h2 className="flex items-center gap-2 text-lg font-black"><AlertTriangle className="text-amber-500" size={20} />Needs your attention</h2>{items.length ? <div className="mt-3 space-y-2">{items.map((listing) => <div key={listing.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-100 bg-white/70 p-3"><div className="flex items-center gap-3"><ImagePlus className="text-amber-600" size={20} /><div><p className="text-sm font-bold">{listing.attention}</p><p className="text-xs text-slate-500">Add photos to complete the listing and send it for review.</p></div></div><button onClick={() => setSelected(listing)} className="rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-900">Add photos</button></div>)}</div> : <p className="mt-2 text-sm text-slate-600">You’re all caught up. New listing issues will show here.</p>}</section>;
  };

  return <DashboardShell role="seller"><div className="mx-auto max-w-[1440px]">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-slate-500">Seller studio <span className="mx-2">/</span><span className="font-bold text-slate-800">Inventory</span></p><h1 className="mt-2 text-4xl font-black tracking-tight">Inventory</h1><p className="mt-2 text-slate-600">Manage listings, fix issues, and keep every vehicle moving.</p>{demoMode && <span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">Demo inventory · changes stay in this browser</span>}</div><div className="flex flex-wrap gap-2"><button className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><SlidersHorizontal className="mr-2 inline" size={16}/>Import</button><button onClick={() => { const csv = ["stock,year,make,model,status,price,location", ...listings.map((item) => [item.stockNumber, item.year, item.make, item.model, resolvedStatus(item), item.price, item.location.city].join(","))].join("\n"); const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); anchor.download = "easyride-inventory.csv"; anchor.click(); URL.revokeObjectURL(anchor.href); }} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold">Export</button><button className="rounded-xl border border-slate-200 bg-white p-3" aria-label="Inventory settings"><Settings2 size={18}/></button><Link href="/dashboard/seller/add-vehicle" className="rounded-xl bg-[#063F2C] px-5 py-3 font-bold text-white"><Plus className="mr-2 inline" size={18}/>Add vehicle</Link></div></div>

    <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Total vehicles", counts.total, "all", "Car"], ["Live listings", counts.live, "live", "Circle"], ["Needs attention", counts.attention, "attention", "Alert"], ["Reserved / sold", counts.done, "reserved", "Tag"],
    ].map(([label, value, target, icon]) => <button key={String(label)} onClick={() => setTab(target as InventoryTab)} className={`flex items-center gap-4 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 ${tab === target ? "border-emerald-600 ring-1 ring-emerald-100" : "border-slate-200"}`}><span className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-800">{icon === "Alert" ? <AlertTriangle/> : icon === "Tag" ? <Tag/> : icon === "Circle" ? <Check/> : <CarFront/>}</span><span><span className="block text-sm text-slate-500">{label}</span><strong className="text-2xl font-black">{value}</strong></span></button>)}
    </div>

    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]"><div className="min-w-0"><Attention />
      <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Your inventory</p><h2 className="mt-1 text-xl font-black">{filtered.length} vehicles</h2></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Make, model, stock, VIN" className="h-10 w-56 rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-emerald-700"/></label><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="all">All statuses</option>{["draft", "pending", "active", "reserved", "sold", "paused", "archived"].map((value) => <option key={value} value={value}>{value === "pending" ? "In review" : value}</option>)}</select><select value={makeFilter} onChange={(event) => setMakeFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="all">All makes</option>{[...new Set(listings.map((item) => item.make))].map((make) => <option key={make}>{make}</option>)}</select><select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="h-10 rounded-lg border border-slate-200 px-3 text-sm"><option value="all">All locations</option>{[...new Set(listings.map((item) => item.location.city))].map((city) => <option key={city}>{city}</option>)}</select><label className="flex h-10 items-center gap-1 rounded-lg border border-slate-200 px-2 text-sm"><ArrowDownUp size={15}/><select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent"><option value="updated">Last updated</option><option value="newest">Newest</option><option value="performance">Performance</option><option value="price-asc">Price low</option><option value="price-desc">Price high</option></select></label></div></div>
        <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-200">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${tab === item.id ? "border-emerald-700 text-emerald-800" : "border-transparent text-slate-500 hover:text-slate-900"}`}>{item.label}<span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs">{item.id === "all" ? listings.length : filteredCount(listings, item.id, resolvedStatus)}</span></button>)}<button onClick={() => setTab("attention")} className={`shrink-0 border-b-2 px-3 py-3 text-sm font-bold ${tab === "attention" ? "border-amber-500 text-amber-700" : "border-transparent text-slate-500"}`}>Needs attention {counts.attention}</button><div className="ml-auto flex shrink-0 items-center gap-1 pb-1"><button onClick={() => setView("cards")} className={`rounded-md px-2 py-1 text-xs font-bold ${view === "cards" ? "bg-emerald-50 text-emerald-800" : "text-slate-500"}`}>Cards</button><button onClick={() => setView("table")} className={`rounded-md px-2 py-1 text-xs font-bold ${view === "table" ? "bg-emerald-50 text-emerald-800" : "text-slate-500"}`}>Table</button></div></div>
        {loading ? <div className="flex min-h-52 items-center justify-center"><Loader2 className="animate-spin text-emerald-800"/></div> : filtered.length ? <div className={view === "cards" ? "divide-y divide-slate-100" : "mt-4 overflow-x-auto"}>{view === "cards" ? filtered.map((item) => <InventoryRow key={item.id} item={item} status={resolvedStatus(item)} action={actionFor(item)} onOpen={() => setSelected(item)} onMore={() => setSelected(item)}/>) : <table className="w-full min-w-[800px] text-left text-sm"><thead><tr className="text-slate-500"><th className="p-3">Vehicle</th><th className="p-3">Stock</th><th className="p-3">Status</th><th className="p-3">Price</th><th className="p-3">Location</th><th className="p-3">Performance</th><th/></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t"><td className="p-3 font-bold">{item.year} {item.make} {item.model}</td><td className="p-3">{item.stockNumber}</td><td className="p-3 capitalize">{resolvedStatus(item)}</td><td className="p-3">{item.currency} {item.price.toLocaleString()}</td><td className="p-3">{item.location.city}</td><td className="p-3">{item.views} views · {item.favoritesCount} saves</td><td className="p-3"><button onClick={() => setSelected(item)} className="font-bold text-emerald-800">Manage</button></td></tr>)}</tbody></table>}</div> : <div className="py-12 text-center text-slate-500">No vehicles match this filter.</div>}
      </section>
    </div>
    <aside className="space-y-4"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-black">Seller performance</h2><p className="mt-1 text-xs text-slate-500">Across your inventory</p>{[[Eye,"Views",listings.reduce((sum,item)=>sum+item.views,0)],[Heart,"Saves",listings.reduce((sum,item)=>sum+item.favoritesCount,0)],[MessageCircle,"Enquiries",listings.reduce((sum,item)=>sum+item.enquiries,0)],[Tag,"Offers",listings.reduce((sum,item)=>sum+item.offers,0)]].map(([Icon,label,value])=>{const MetricIcon=Icon as typeof Eye;return <div key={String(label)} className="mt-5 flex items-center justify-between"><span className="flex items-center gap-2 text-sm text-slate-600"><MetricIcon size={17}/>{label as string}</span><b>{Number(value).toLocaleString()}</b></div>})}</section><section className="rounded-2xl bg-[#063F2C] p-5 text-white"><p className="text-xs font-bold uppercase tracking-widest text-emerald-200">Keep your inventory moving</p><h2 className="mt-2 text-xl font-black">Find more buyers. Close more deals.</h2><p className="mt-2 text-sm text-white/75">Review buyer leads, follow up on offers, and keep listings performing.</p><Link href="/dashboard/seller/leads" className="mt-5 block rounded-xl bg-white px-4 py-3 text-center text-sm font-bold text-[#063F2C]">View buyer leads</Link><Link href="/dashboard/seller/analytics" className="mt-2 block rounded-xl border border-white/40 px-4 py-3 text-center text-sm font-bold">Review pricing</Link></section></aside></div>

    {selected && <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/40" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-800">Listing details</p><h2 className="mt-1 text-2xl font-black">{selected.year} {selected.make} {selected.model}</h2></div><button onClick={() => setSelected(null)} aria-label="Close details" className="rounded-lg border p-2"><X size={19}/></button></div><div className="relative mt-5 h-56 overflow-hidden rounded-2xl bg-slate-100"><Image src={selected.coverImage} alt={`${selected.make} ${selected.model}`} fill className="object-cover" sizes="(max-width: 640px) 100vw, 500px"/></div><div className="mt-4 flex items-center justify-between"><span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-bold capitalize text-emerald-800">{resolvedStatus(selected)}</span><strong className="text-xl">{selected.currency} {selected.price.toLocaleString()}</strong></div><p className="mt-1 text-sm text-slate-500">Stock #{selected.stockNumber} · {selected.location.city}, {selected.location.country}</p><div className="mt-5 grid grid-cols-2 gap-3">{[[Eye,"Views",selected.views],[Heart,"Saves",selected.favoritesCount],[MessageCircle,"Enquiries",selected.enquiries],[Tag,"Offers",selected.offers]].map(([Icon,label,value])=>{const ItemIcon=Icon as typeof Eye;return <div key={String(label)} className="rounded-xl bg-slate-50 p-3"><p className="flex items-center gap-2 text-xs text-slate-500"><ItemIcon size={15}/>{label as string}</p><b className="mt-1 block text-lg">{Number(value).toLocaleString()}</b></div>})}</div><section className="mt-5 rounded-xl border p-4"><h3 className="font-black">Listing quality</h3><div className="mt-3 h-2 rounded-full bg-slate-100"><div className="h-2 w-3/4 rounded-full bg-emerald-700"/></div><p className="mt-2 text-sm text-slate-500">75% complete · Add more photos for a stronger listing.</p></section>{selected.attention && <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-semibold text-amber-900"><AlertTriangle size={16} className="mr-2 inline"/>{selected.attention}</div>}<div className="mt-6 grid grid-cols-2 gap-2"><Link href={`/vehicle/${selected.id}`} className="rounded-xl border px-4 py-3 text-center text-sm font-bold">Preview</Link><Link href="/dashboard/seller/add-vehicle" className="rounded-xl bg-[#063F2C] px-4 py-3 text-center text-sm font-bold text-white">Edit listing</Link><Link href="/dashboard/seller/leads" className="rounded-xl border px-4 py-3 text-center text-sm font-bold">Message leads</Link>{resolvedStatus(selected)==="active"?<button onClick={()=>void updateStatus(selected,"suspended")} className="rounded-xl border px-4 py-3 text-sm font-bold">Pause listing</button>:<button onClick={()=>void updateStatus(selected,"active")} className="rounded-xl border px-4 py-3 text-sm font-bold">Resume listing</button>}<button onClick={()=>void remove(selected)} className="col-span-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700">Delete listing</button></div><section className="mt-6 border-t pt-5"><h3 className="font-black">Activity history</h3><p className="mt-3 text-sm text-slate-500">Listing created · {new Date(selected.createdAt ?? Date.now()).toLocaleDateString()}</p><p className="mt-2 text-sm text-slate-500">Last updated · {new Date(selected.updatedAt ?? Date.now()).toLocaleDateString()}</p></section></aside></div>}
  </div></DashboardShell>;
}

function filteredCount(listings: InventoryListing[], tab: InventoryTab, getStatus: (listing: InventoryListing) => string) {
  return listings.filter((item) => tab === "draft" ? getStatus(item) === "draft" : tab === "review" ? getStatus(item) === "pending" : tab === "live" ? getStatus(item) === "active" : getStatus(item) === tab).length;
}

function InventoryRow({ item, status, action, onOpen, onMore }: { item: InventoryListing; status: string; action: { label: string; style: string; run: () => void }; onOpen: () => void; onMore: () => void }) {
  return <article className="grid gap-3 py-4 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center"><button onClick={onOpen} className="relative h-28 overflow-hidden rounded-xl bg-slate-100 text-left"><Image src={item.coverImage} alt={`${item.make} ${item.model}`} fill className="object-cover" sizes="150px"/></button><button onClick={onOpen} className="min-w-0 text-left"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-base font-black">{item.year} {item.make} {item.model}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold capitalize ${item.attention ? "bg-amber-100 text-amber-900" : status === "active" ? "bg-emerald-100 text-emerald-900" : status === "pending" ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700"}`}>{item.attention ? "Needs attention" : status === "pending" ? "In review" : status}</span></div><p className="mt-1 text-xs text-slate-500">Stock #{item.stockNumber} <span className="mx-2">·</span>{item.location.city}, {item.location.country}</p><p className="mt-1 font-black">{item.currency} {item.price.toLocaleString()}</p><p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500"><span>{item.mileage.toLocaleString()} km</span><span><Fuel className="mr-1 inline" size={13}/>{item.fuelType}</span><span>{item.bodyType ?? "Vehicle"}</span><span>{item.transmission}</span></p><p className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500"><span><Eye className="mr-1 inline" size={14}/>{item.views} views</span><span><Heart className="mr-1 inline" size={14}/>{item.favoritesCount} saves</span><span><MessageCircle className="mr-1 inline" size={14}/>{item.enquiries} enquiries</span><span><Tag className="mr-1 inline" size={14}/>{item.offers} offers</span></p></button><div className="flex items-center gap-2 sm:flex-col sm:items-stretch"><button onClick={action.run} className={`rounded-lg px-4 py-2.5 text-sm font-bold ${action.style === "green" ? "bg-[#063F2C] text-white" : action.style === "amber" ? "bg-amber-300 text-slate-900" : "border border-emerald-700 text-emerald-800"}`}>{action.label}</button><button onClick={onMore} aria-label={`More actions for ${item.make} ${item.model}`} className="rounded-lg border border-slate-200 p-2"><MoreVertical size={18}/></button></div></article>;
}
