"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { vehicles as demoVehicles } from "@/Data/vehicles";
import { getUserFavoriteListings, removeFavorite } from "@/services/favoriteService";
import type { Vehicle } from "@/Types/vehicle";
import { ArrowDown, ArrowRight, Bell, Check, Heart, Loader2, MapPin, Search, SlidersHorizontal, Tag, X, Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type SavedSearch = { id: string; name: string; criteria: Record<string, unknown>; alert_email?: boolean; created_at?: string };
type FavoriteTab = "vehicles" | "searches" | "matches";
const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const control = "h-11 rounded-xl border border-[#E1E9E4] bg-white px-3 text-sm text-[#24362F] outline-none focus:border-[#0B7652]";
const primary = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#07543D] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#063F2C]";

export default function FavoritesPage() { return <RequireAuth><FavoritesContent /></RequireAuth>; }

function FavoritesContent() {
  const { profile } = useAuth();
  const isSeller = profile?.role === "seller" || profile?.role === "dealer";
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FavoriteTab>("vehicles");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const load = useCallback(async () => {
    if (!profile) { if (demoMode) setVehicles(demoVehicles.slice(0, 4)); setLoading(false); return; }
    if (demoMode) { setVehicles(demoVehicles.slice(0, 4)); setLoading(false); return; }
    try {
      const saved = await getUserFavoriteListings(profile.id);
      setVehicles(saved.length || !demoMode ? saved : demoVehicles.slice(0, 4));
    } catch {
      if (demoMode) setVehicles(demoVehicles.slice(0, 4));
      else toast.error("Saved vehicles could not be loaded.");
    } finally { setLoading(false); }
  }, [profile]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => vehicles.filter((vehicle) => {
    const text = `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.location.city}`.toLowerCase();
    return (!query || text.includes(query.toLowerCase())) && (filter === "all" || (filter === "rent" ? vehicle.listingType === "rent" : vehicle.listingType === "buy"));
  }).sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : (b.createdAt ?? "").localeCompare(a.createdAt ?? "")), [vehicles, query, filter, sort]);
  const matches = useMemo(() => demoMode ? demoVehicles.filter((vehicle) => !vehicles.some((saved) => saved.id === vehicle.id)).slice(0, 4) : [], [vehicles]);
  const compared = vehicles.filter((vehicle) => selected.includes(vehicle.id));
  const toggleCompare = (id: string) => setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length < 3 ? [...items, id] : (toast.error("Compare up to three vehicles."), items));
  const remove = async (vehicle: Vehicle) => {
    if (!profile) return;
    try { setRemoving(vehicle.id); if (!vehicle.id.startsWith("seed-")) await removeFavorite(profile.id, vehicle.id); setVehicles((items) => items.filter((item) => item.id !== vehicle.id)); setSelected((items) => items.filter((item) => item !== vehicle.id)); toast.success("Removed from favorites."); }
    catch { toast.error("Could not remove this favorite."); } finally { setRemoving(null); }
  };
  const loadSavedSearches = async () => {
    if (demoMode) {
      try { const raw = localStorage.getItem(`easy-ride:demo-saved-searches:${profile?.id ?? "guest"}`); const items = raw ? JSON.parse(raw) as SavedSearch[] : []; setSavedSearches(items.length ? items : [{ id: "demo-search-suv", name: "SUV under $40,000", criteria: { bodyType: "SUV", maxPrice: 40000 } }, { id: "demo-search-ev", name: "Electric vehicles in Harare", criteria: { fuel: "Electric", location: "Harare" } }]); } catch { setSavedSearches([]); }
      return;
    }
    try { const response = await fetch("/api/saved-searches"); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Saved searches could not be loaded."); setSavedSearches(result.data ?? []); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Saved searches could not be loaded."); }
  };
  const createSavedSearch = async () => {
    const name = window.prompt("Name this search:", query.trim() || "My vehicle search"); if (!name?.trim()) return;
    if (demoMode) { const next = [{ id: `demo-search-${Date.now()}`, name: name.trim(), criteria: { query: query.trim(), listingType: filter }, alert_email: true }, ...savedSearches]; setSavedSearches(next); localStorage.setItem(`easy-ride:demo-saved-searches:${profile?.id ?? "guest"}`, JSON.stringify(next)); setActiveTab("searches"); toast.success("Search alert saved."); return; }
    try { const response = await fetch("/api/saved-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), criteria: { query: query.trim(), listingType: filter }, alert_email: true }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Search could not be saved."); setSavedSearches((items) => [result.data, ...items]); setActiveTab("searches"); toast.success("Search saved."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Search could not be saved."); }
  };
  const deleteSearch = async (id: string) => {
    if (demoMode) { const next = savedSearches.filter((item) => item.id !== id); setSavedSearches(next); localStorage.setItem(`easy-ride:demo-saved-searches:${profile?.id ?? "guest"}`, JSON.stringify(next)); return; }
    try { const response = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Saved search could not be removed."); setSavedSearches((items) => items.filter((item) => item.id !== id)); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Saved search could not be removed."); }
  };

  return <DashboardShell role="personal"><section className="space-y-6 pb-24">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-semibold text-[#718179]">{isSeller ? "Seller studio" : "Home"} <span className="mx-2">/</span> Favorites</p><h1 className="mt-2 text-4xl font-black tracking-tight">Favorites</h1><p className="mt-1 text-[#73827B]">Keep the vehicles and searches worth coming back to.</p></div><div className="flex flex-wrap gap-2"><button onClick={() => compared.length ? toast.success(`${compared.length} vehicles ready to compare.`) : toast("Select vehicles to compare.")} className={primary}><ArrowRight size={17}/>Compare selected</button><button onClick={() => void createSavedSearch()} className={`${control} inline-flex items-center gap-2 font-bold`}><Search size={17}/>Create saved search</button></div></header>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary icon={Heart} label="Saved vehicles" value={demoMode ? 12 : vehicles.length} tone="green"/><Summary icon={Tag} label="Price drops" value={demoMode ? 3 : 0} tone="amber"/><Summary icon={Search} label="Saved searches" value={demoMode ? Math.max(5, savedSearches.length) : savedSearches.length} tone="blue"/><Summary icon={Bell} label="New matches" value={demoMode ? 8 : matches.length} tone="blue"/></div>

    <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_330px]"><main className="min-w-0 rounded-2xl border border-[#E4EBE7] bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-wrap gap-5 border-b border-[#E7EDE9] text-sm font-bold"><Tab active={activeTab === "vehicles"} onClick={() => setActiveTab("vehicles")}>Saved vehicles</Tab><Tab active={activeTab === "searches"} onClick={() => { setActiveTab("searches"); void loadSavedSearches(); }}>Saved searches</Tab><Tab active={activeTab === "matches"} onClick={() => setActiveTab("matches")}>New matches</Tab></div>
      {activeTab === "vehicles" && <><div className="mt-4 flex flex-col gap-3 xl:flex-row"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 text-[#718179]" size={18}/><input className={`${control} w-full pl-10`} placeholder="Search your favorites" value={query} onChange={(event) => setQuery(event.target.value)}/></div><div className="flex flex-wrap gap-2"><button onClick={() => setFilter("all")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === "all" ? "border-[#D5EEE3] bg-[#EFF9F4] text-[#07543D]" : "border-[#E4EBE7] text-[#718179]"}`}>All vehicles</button><button onClick={() => setFilter("buy")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === "buy" ? "border-[#D5EEE3] bg-[#EFF9F4] text-[#07543D]" : "border-[#E4EBE7] text-[#718179]"}`}>Price dropped</button><button onClick={() => setFilter("rent")} className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === "rent" ? "border-[#D5EEE3] bg-[#EFF9F4] text-[#07543D]" : "border-[#E4EBE7] text-[#718179]"}`}>New match</button><label className="relative ml-auto"><SlidersHorizontal className="pointer-events-none absolute left-3 top-3 text-[#718179]" size={16}/><select aria-label="Sort favorites" className={`${control} pl-9`} value={sort} onChange={(event) => setSort(event.target.value)}><option value="recent">Recently saved</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div></div>
      <p className="mb-3 mt-5 text-sm text-[#718179]">{loading ? "Loading saved vehicles…" : `${filtered.length} vehicles`}</p>{loading ? <div className="flex min-h-64 items-center justify-center"><Loader2 className="animate-spin text-[#07543D]"/></div> : filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((vehicle,index)=><VehicleCard key={vehicle.id} vehicle={vehicle} index={index} selected={selected.includes(vehicle.id)} removing={removing===vehicle.id} onCompare={()=>toggleCompare(vehicle.id)} onRemove={()=>void remove(vehicle)}/>)}</div> : <div className="rounded-xl bg-[#F6F9F7] p-10 text-center"><Heart className="mx-auto text-[#718179]"/><h2 className="mt-3 font-bold">No saved vehicles yet</h2><Link href="/marketplace" className={`${primary} mt-4`}>Browse vehicles</Link></div>}</>}
      {activeTab === "matches" && <div className="mt-5"><h2 className="text-xl font-black">New vehicles you may like</h2><p className="mt-1 text-sm text-[#718179]">Fresh listings that match your saved searches.</p><div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{matches.map((vehicle,index)=><VehicleCard key={vehicle.id} vehicle={vehicle} index={index} selected={selected.includes(vehicle.id)} removing={false} onCompare={()=>toggleCompare(vehicle.id)} onRemove={()=>setVehicles((items)=>[vehicle,...items])} match/>)}</div>{!matches.length&&<p className="mt-5 rounded-xl bg-[#F6F9F7] p-8 text-center text-sm text-[#718179]">Save a search to get new vehicle matches here.</p>}</div>}
      {activeTab === "searches" && <div className="mt-5"><h2 className="text-xl font-black">Saved search alerts</h2><p className="mt-1 text-sm text-[#718179]">We’ll notify you when new vehicles match your searches.</p>{savedSearches.length ? <div className="mt-3 divide-y divide-[#EEF2EF]">{savedSearches.map((item,index)=><article key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-[#718179]">{index===0?"5 new matches":"2 price drops"}</p></div><div className="flex gap-2"><Link href={`/marketplace?q=${encodeURIComponent(String(item.criteria?.query??item.name))}`} className={primary}>View matches</Link><button onClick={()=>void deleteSearch(item.id)} className={`${control} text-red-600`}>Remove</button></div></article>)}</div> : <button onClick={()=>void createSavedSearch()} className={`${primary} mt-4`}>Create your first saved search</button>}</div>}
    </main>

    <aside className="space-y-4"><section className="rounded-2xl border border-[#DCEFE5] bg-[#F1FAF5] p-5"><h2 className="text-xl font-black">Saved search alerts</h2><p className="mt-1 text-sm leading-5 text-[#718179]">We’ll notify you when new vehicles match your saved searches.</p>{(savedSearches.length ? savedSearches.slice(0,2) : demoMode ? [{id:"suv",name:"SUV under $40,000"},{id:"ev",name:"Electric vehicles near Harare"}] : []).map((item,index)=><button key={item.id} onClick={()=>{setActiveTab("searches");void loadSavedSearches();}} className="mt-3 flex w-full items-center gap-3 rounded-xl border border-[#E6ECE8] bg-white p-3 text-left"><span className={`rounded-xl p-3 ${index===0?"bg-emerald-50 text-emerald-600":"bg-amber-50 text-amber-600"}`}>{index===0?<Search size={20}/>:<Zap size={20}/>}</span><span className="min-w-0 flex-1"><b className="block truncate text-sm">{item.name}</b><small className="text-[#08784D]">{index===0?"5 new matches":"2 price drops"}</small></span><ArrowRight size={16}/></button>)}<button onClick={()=>{setActiveTab("searches");void loadSavedSearches();}} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#07543D]">View all saved searches <ArrowRight size={15}/></button></section>
      <section className="relative min-h-[430px] overflow-hidden rounded-2xl bg-[#063F2C] p-5 text-white"><div className="absolute inset-0 opacity-35"><Image src={demoVehicles[5].coverImage} alt="" fill className="object-cover"/></div><div className="relative flex min-h-[390px] flex-col"><p className="text-xs font-bold uppercase tracking-[.18em] text-emerald-200">Stay ahead of the market</p><h2 className="mt-4 text-2xl font-black leading-tight">Save the vehicles you like and we’ll surface price drops and new matches.</h2><ul className="mt-5 space-y-3 text-sm"><li className="flex items-center gap-3"><Tag size={17}/>Get notified of price drops</li><li className="flex items-center gap-3"><Bell size={17}/>See new matches instantly</li><li className="flex items-center gap-3"><ArrowDown size={17}/>Make faster, smarter decisions</li></ul><button onClick={()=>{setActiveTab("searches");void loadSavedSearches();}} className="mt-auto rounded-xl bg-[#FFD34F] px-4 py-3 font-black text-[#17372A]">Manage alerts</button></div></section></aside></div>

    {compared.length>0&&<div className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 rounded-2xl bg-[#064432] p-4 text-white shadow-2xl"><div className="flex items-center gap-3"><div className="flex -space-x-2">{compared.map((vehicle)=><span key={vehicle.id} className="relative h-12 w-16 overflow-hidden rounded-lg border-2 border-white"><Image src={vehicle.coverImage} alt="" fill sizes="64px" className="object-cover"/></span>)}</div><div><b>{compared.length} vehicles selected</b><p className="text-xs text-white/70">Compare specs, features, and pricing side by side.</p></div></div><button onClick={()=>toast.success(`Comparing ${compared.map((vehicle)=>vehicle.make+" "+vehicle.model).join(" and ")}`)} className="rounded-xl bg-white px-5 py-3 font-bold text-[#07543D]">Compare vehicles</button><button onClick={()=>setSelected([])} aria-label="Clear comparison" className="rounded-lg p-2"><X/></button></div>}
  </section></DashboardShell>;
}

function Tab({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){return <button onClick={onClick} className={`border-b-2 px-2 py-3 ${active?"border-[#07543D] text-[#07543D]":"border-transparent text-[#718179]"}`}>{children}</button>}
function Summary({icon:Icon,label,value,tone}:{icon:typeof Heart;label:string;value:number;tone:"green"|"amber"|"blue"}){const colors={green:"bg-emerald-50 text-emerald-600",amber:"bg-amber-50 text-amber-600",blue:"bg-blue-50 text-blue-600"};return <div className="flex items-center gap-4 rounded-2xl border border-[#E5ECE8] bg-white p-4"><span className={`rounded-xl p-3 ${colors[tone]}`}><Icon size={22}/></span><div><p className="text-sm text-[#718179]">{label}</p><p className="text-2xl font-black">{value}</p></div></div>}
function VehicleCard({vehicle,index,selected,removing,onCompare,onRemove,match=false}:{vehicle:Vehicle;index:number;selected:boolean;removing:boolean;onCompare:()=>void;onRemove:()=>void;match?:boolean}){const badges=["Price dropped","New match","Great value","Popular"];const badgeColors=["bg-emerald-50 text-emerald-700","bg-emerald-50 text-emerald-700","bg-amber-50 text-amber-700","bg-rose-50 text-rose-700"];return <article className="overflow-hidden rounded-2xl border border-[#E5ECE8] bg-white shadow-sm"><div className="relative aspect-[16/10] bg-[#EDF3EF]"><Image src={vehicle.coverImage} alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover"/><button onClick={onCompare} aria-label="Select vehicle to compare" className={`absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-md ${selected?"bg-[#07543D] text-white":"bg-white/95 text-[#607168]"}`}>{selected?<Check size={16}/>:null}</button><button onClick={onRemove} disabled={removing} aria-label={match?"Save vehicle":"Remove from favorites"} className="absolute right-3 top-3 rounded-full bg-white p-2 text-rose-500 shadow"><Heart size={17} fill="currentColor"/></button></div><div className="p-4"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${badgeColors[index%4]}`}>{badges[index%4]}</span><h3 className="mt-2 font-black">{vehicle.year} {vehicle.make} {vehicle.model}</h3><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#718179]"><span>{vehicle.mileage.toLocaleString()} km</span><span><MapPin size={13} className="mr-1 inline"/>{vehicle.location.city}</span></div><p className="mt-1 text-xs text-[#718179]">{vehicle.fuelType} · {vehicle.transmission}</p><p className="mt-3 text-2xl font-black">{vehicle.currency} {vehicle.price.toLocaleString()} {vehicle.listingType==="rent"&&<small className="text-xs font-medium text-[#718179]">/ day</small>}</p><div className="mt-3 grid grid-cols-2 gap-2"><Link href={`/vehicle/${vehicle.id}`} className={`${primary} px-2`}>View vehicle</Link><Link href={`/vehicle/${vehicle.id}`} className="inline-flex items-center justify-center rounded-xl border border-[#B7D8C8] px-2 text-sm font-bold text-[#07543D]">Make an offer</Link></div></div></article>}
