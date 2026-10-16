"use client";

import DashboardShell from "@/Components/DashboardShell";
import RequireAuth from "@/Components/RequireAuth";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFavoriteListings, removeFavorite } from "@/services/favoriteService";
import type { Vehicle } from "@/Types/vehicle";
import { ArrowRight, BarChart3, Bell, Heart, Loader2, MapPin, Search, SlidersHorizontal, Tag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

const button = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#07543D] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#063F2C] disabled:cursor-wait disabled:opacity-50";
const control = "h-11 rounded-xl border border-[#E1E9E4] bg-white px-3 text-sm text-[#24362F] outline-none focus:border-[#0B7652]";
type SavedSearch = { id: string; name: string; criteria: Record<string, unknown>; alert_email?: boolean; created_at?: string };

export default function FavoritesPage() {
  return <RequireAuth><FavoritesContent /></RequireAuth>;
}

function FavoritesContent() {
  const { profile } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [listingType, setListingType] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"vehicles" | "searches">("vehicles");
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    try { setVehicles(await getUserFavoriteListings(profile.id)); }
    catch { toast.error("Saved vehicles could not be loaded."); }
    finally { setLoading(false); }
  }, [profile]);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return vehicles.filter((vehicle) =>
      (!query || `${vehicle.make} ${vehicle.model} ${vehicle.year} ${vehicle.location.city}`.toLowerCase().includes(query)) &&
      (listingType === "all" || vehicle.listingType === listingType),
    ).sort((a, b) => sort === "price-low" ? a.price - b.price : sort === "price-high" ? b.price - a.price : (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [vehicles, search, sort, listingType]);
  const toggleCompare = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 3 ? [...current, id] : (toast.error("Compare up to three vehicles."), current));
  const remove = async (vehicle: Vehicle) => {
    if (!profile) return;
    try { setRemoving(vehicle.id); await removeFavorite(profile.id, vehicle.id); setVehicles((items) => items.filter((item) => item.id !== vehicle.id)); setSelected((items) => items.filter((item) => item !== vehicle.id)); toast.success("Removed from favorites."); }
    catch { toast.error("Could not remove this favorite."); }
    finally { setRemoving(null); }
  };
  const compared = vehicles.filter((vehicle) => selected.includes(vehicle.id));
  const priceDrops = vehicles.filter((vehicle) => vehicle.priceLabel?.toLowerCase().includes("drop")).length;
  const loadSavedSearches = async () => {
    try { const response = await fetch("/api/saved-searches"); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Saved searches could not be loaded."); setSavedSearches(result.data ?? []); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Saved searches could not be loaded."); }
  };
  const createSavedSearch = async () => {
    const name = window.prompt("Name this search:", search.trim() || "My vehicle search");
    if (!name?.trim()) return;
    try { const response = await fetch("/api/saved-searches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), criteria: { query: search.trim(), listingType }, alert_email: true }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Search could not be saved."); setSavedSearches((items) => [result.data, ...items]); setActiveTab("searches"); toast.success("Search saved."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Search could not be saved."); }
  };
  const deleteSavedSearch = async (id: string) => {
    try { const response = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" }); const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Search could not be deleted."); setSavedSearches((items) => items.filter((item) => item.id !== id)); toast.success("Saved search removed."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Search could not be deleted."); }
  };

  return <DashboardShell role="personal"><section className="space-y-6">
    <header><p className="text-sm font-semibold text-[#718179]">Home <span className="mx-2">›</span> Favorites</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Your favorites</h1><p className="mt-2 text-[#73827B]">Keep track of vehicles you love and compare them when you’re ready.</p></header>
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="inline-flex rounded-xl border border-[#E4EBE7] bg-white p-1"><button onClick={()=>setActiveTab("vehicles")} className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab==="vehicles"?"bg-[#07543D] text-white":"text-[#687970]"}`}>Saved vehicles ({vehicles.length})</button><button onClick={()=>{setActiveTab("searches");void loadSavedSearches();}} className={`rounded-lg px-4 py-2 text-sm font-bold ${activeTab==="searches"?"bg-[#07543D] text-white":"text-[#687970]"}`}>Saved searches ({savedSearches.length})</button></div>{activeTab==="searches"&&<button onClick={()=>void createSavedSearch()} className={button}><Bell size={16}/>Create saved search</button>}</div>
    {activeTab==="vehicles"&&<><div className="grid gap-3 sm:grid-cols-3"><Metric icon={Heart} label="Saved vehicles" value={vehicles.length} detail="Vehicles you’ve saved"/><Metric icon={Tag} label="Price changes" value={priceDrops} detail="Saved listings with updates"/><Metric icon={BarChart3} label="Selected to compare" value={selected.length} detail="Choose up to three"/></div>
    <div className="flex flex-col gap-3 rounded-2xl border border-[#E5ECE8] bg-white p-4 xl:flex-row xl:items-center"><div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 text-[#718179]" size={18}/><input className={`${control} w-full pl-10`} placeholder="Search your favorites" value={search} onChange={(e)=>setSearch(e.target.value)}/></div><div className="flex items-center gap-2"><SlidersHorizontal size={17} className="text-[#07543D]"/><select aria-label="Filter listing type" className={control} value={listingType} onChange={(e)=>setListingType(e.target.value)}><option value="all">All vehicles</option><option value="buy">For sale</option><option value="rent">For rent</option></select><select aria-label="Sort favorites" className={control} value={sort} onChange={(e)=>setSort(e.target.value)}><option value="recent">Recently added</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></div></div>
    <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_310px]"><div>{loading ? <div className="flex min-h-72 items-center justify-center"><Loader2 className="animate-spin text-[#07543D]" size={32}/></div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed border-[#D8E3DC] bg-white p-12 text-center"><Heart className="mx-auto text-[#83928A]"/><h2 className="mt-4 text-xl font-bold">{vehicles.length ? "No matching favorites" : "No saved vehicles yet"}</h2><p className="mt-2 text-sm text-[#718179]">Save listings from the marketplace and they’ll show up here.</p><Link href="/marketplace" className={`${button} mt-5`}>Browse vehicles <ArrowRight size={17}/></Link></div> : <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map((vehicle)=><article key={vehicle.id} className="overflow-hidden rounded-2xl border border-[#E4EBE7] bg-white shadow-sm"><div className="relative aspect-[16/10] bg-[#EDF3EF]"><Image src={vehicle.coverImage} alt={`${vehicle.make} ${vehicle.model}`} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover"/><button type="button" onClick={()=>void remove(vehicle)} disabled={removing===vehicle.id} aria-label={`Remove ${vehicle.make} ${vehicle.model} from favorites`} className="absolute right-3 top-3 rounded-full bg-white p-2 text-rose-600 shadow"><X size={18}/></button><label className="absolute bottom-3 left-3 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-[#25362F]"><input type="checkbox" checked={selected.includes(vehicle.id)} onChange={()=>toggleCompare(vehicle.id)}/>Compare</label></div><div className="p-4"><h2 className="font-bold">{vehicle.make} {vehicle.model}</h2><p className="mt-1 text-sm text-[#718179]">{vehicle.year} · {vehicle.mileage.toLocaleString()} mi · {vehicle.listingType === "rent" ? "Rental" : "For sale"}</p><p className="mt-3 text-2xl font-black text-[#13251D]">{vehicle.currency} {vehicle.price.toLocaleString()}<span className="ml-1 text-xs font-medium text-[#718179]">{vehicle.listingType === "rent" ? `/${vehicle.priceLabel ?? "day"}` : ""}</span></p><p className="mt-2 flex items-center gap-1 text-sm text-[#718179]"><MapPin size={15}/>{vehicle.location.city}, {vehicle.location.country}</p><div className="mt-4 grid grid-cols-2 gap-2"><Link className={button} href={`/vehicle/${vehicle.id}`}>View details</Link><Link className={`${control} flex items-center justify-center font-semibold`} href={`/vehicle/${vehicle.id}`}>Make an offer</Link></div></div></article>)}</div>}</div>
      <aside className="h-fit rounded-2xl border border-[#E4EBE7] bg-white p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#E8F5EE] p-3 text-[#07543D]"><BarChart3 size={21}/></span><div><h2 className="font-bold">Compare favorites</h2><p className="text-xs text-[#718179]">Select up to 3 vehicles</p></div></div>{compared.length===0 ? <p className="mt-5 text-sm leading-6 text-[#718179]">Choose vehicles using the compare boxes to see their prices and details side by side.</p> : <div className="mt-4 space-y-3">{compared.map((vehicle)=><div key={vehicle.id} className="flex items-center gap-3 border-b border-[#EEF2EF] pb-3"><div className="relative h-14 w-20 overflow-hidden rounded-lg bg-[#EDF3EF]"><Image src={vehicle.coverImage} alt="" fill sizes="80px" className="object-cover"/></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{vehicle.make} {vehicle.model}</p><p className="text-xs text-[#718179]">{vehicle.currency} {vehicle.price.toLocaleString()}</p></div><button type="button" onClick={()=>toggleCompare(vehicle.id)} aria-label="Remove from comparison" className="text-[#718179]"><X size={16}/></button></div>)}</div>}<p className="mt-4 text-xs font-semibold text-[#718179]">{selected.length}/3 selected</p></aside>
    </div></>}
    {activeTab==="searches"&&<section className="rounded-2xl border border-[#E4EBE7] bg-white p-5"><h2 className="text-xl font-black">Your saved searches</h2><p className="mt-1 text-sm text-[#718179]">Get notified when matching vehicles are listed.</p>{savedSearches.length===0?<div className="mt-6 rounded-xl bg-[#F6F9F7] p-8 text-center"><Bell className="mx-auto text-[#07543D]"/><p className="mt-3 font-bold">No saved searches yet</p><p className="mt-1 text-sm text-[#718179]">Create one to keep track of new listings that match your criteria.</p><button onClick={()=>void createSavedSearch()} className={`${button} mt-4`}>Create a saved search <ArrowRight size={16}/></button></div>:<div className="mt-4 divide-y divide-[#EEF2EF]">{savedSearches.map((item)=><article key={item.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><h3 className="font-bold">{item.name}</h3><p className="mt-1 text-sm text-[#718179]">{Object.entries(item.criteria??{}).filter(([,value])=>Boolean(value)).map(([key,value])=>`${key}: ${String(value)}`).join(" · ")||"All vehicles"}</p><p className="mt-1 flex items-center gap-1 text-xs text-[#07543D]"><Bell size={13}/>Email alerts {item.alert_email===false?"off":"on"}</p></div><div className="flex gap-2"><Link href={`/marketplace?q=${encodeURIComponent(String(item.criteria?.query??""))}`} className={button}>View matches</Link><button onClick={()=>void deleteSavedSearch(item.id)} className={`${control} text-red-600`}>Remove</button></div></article>)}</div>}</section>}
  </section></DashboardShell>;
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Heart; label: string; value: number; detail: string }) { return <div className="flex items-center gap-4 rounded-2xl border border-[#E5ECE8] bg-white p-4"><span className="rounded-xl bg-[#EAF5EF] p-3 text-[#07543D]"><Icon size={21}/></span><div><p className="text-sm text-[#718179]">{label}</p><p className="text-2xl font-black">{value}</p><p className="text-xs text-[#718179]">{detail}</p></div></div>; }
