"use client";

import { firebaseReady, storage } from "@/lib/firebase";
import type { ListingStatus, ListingType, Vehicle } from "@/Types/vehicle";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { vehicles as seedVehicles } from "@/Data/vehicles";

const MAX_VEHICLE_IMAGES = 10;

function nowIso() {
  return new Date().toISOString();
}

export interface ListingPage {
  listings: Vehicle[];
  lastDocument: MongoListingCursor | null;
  hasMore: boolean;
}

interface MongoListingCursor {
  source: "mongo";
  offset: number;
}

export interface ListingPageFilters {
  listingType?: ListingType | "all";
  location?: string;
  make?: string;
  model?: string;
  bodyType?: string;
  transmission?: string;
  fuelType?: string;
  condition?: string;
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  mileageMax?: number;
}

function normalizeListing(listing: Vehicle): Vehicle {
  return {
    ...listing,
    id: String(listing.id),
    images: listing.images?.length ? listing.images : [listing.coverImage],
    coverImage: listing.coverImage || listing.images?.[0] || "",
    views: listing.views ?? 0,
    favoritesCount: listing.favoritesCount ?? 0,
    createdAt: listing.createdAt ?? nowIso(),
    updatedAt: listing.updatedAt ?? nowIso(),
  };
}

type MongoListing = Record<string, any>;
function toMongoPayload(listing: Omit<Vehicle, "id" | "status" | "views" | "favoritesCount" | "createdAt" | "updatedAt">) {
  const isRent = listing.listingType === "rent";
  return { listing_type: isRent ? "rent" : "sale", make: listing.make, model: listing.model, year: listing.year, mileage_km: listing.mileage, condition: String(listing.condition).toLowerCase().includes("new") ? "new" : "used", fuel_type: listing.fuelType, transmission: listing.transmission, body_type: listing.bodyType, exterior_color: listing.color, sale_price: isRent ? undefined : listing.price, rent_day_price: isRent ? listing.price : undefined, currency: listing.currency, city: listing.location.city, country_code: listing.location.country, address_label: listing.location.address, latitude: listing.location.latitude, longitude: listing.location.longitude, description: listing.description, images: listing.images };
}
function mapMongoListing(row: MongoListing): Vehicle {
  const images = (row.images ?? []).sort((a: any,b: any)=>a.display_order-b.display_order).map((i:any)=>i.storage_path).filter(Boolean);
  const price = row.listing_type === "rent" ? row.rent_day_price : row.sale_price;
  return normalizeListing({ id:String(row.id),ownerId:row.owner_id,ownerName:row.owner_name||"Easy Ride seller",ownerPhone:row.owner_phone||"",ownerEmail:"",listingType:row.listing_type==="sale_and_rent"?"buy":row.listing_type,status:row.status==="pending_review"?"pending":row.status,make:row.make,model:row.model,year:row.year,price:Number(price||row.price||0),currency:row.currency||"USD",transmission:row.transmission||"Manual",fuelType:row.fuel_type||"Petrol",mileage:row.mileage_km||0,condition:(row.condition||"used") as Vehicle["condition"],bodyType:row.body_type,color:row.exterior_color,description:row.description||"",location:{address:row.address_label||"",city:row.city||"",country:row.country_code||"",latitude:row.latitude||0,longitude:row.longitude||0},images,coverImage:images[0]||"",sellerType:row.dealer_id?"Dealer":"Private Seller",verified:Boolean(row.dealer_id),featured:Boolean(row.featured),views:row.views||0,favoritesCount:row.favorites_count||0,createdAt:row.created_at,updatedAt:row.updated_at});
}
async function fetchMongoListings(filters:ListingPageFilters,offset=0){const p=new URLSearchParams({page:String(Math.floor(offset/20)+1),pageSize:"20"});if(filters.listingType&&filters.listingType!=="all")p.set("mode",filters.listingType);for(const [key,value] of [["city",filters.location],["make",filters.make],["model",filters.model]] as const)if(value&&value!=="all")p.set(key,value);const response=await fetch(`/api/vehicles?${p}`,{cache:"no-store"});if(!response.ok)throw new Error("Could not load vehicle listings.");const result=await response.json();return{listings:(result.data as MongoListing[]).map(mapMongoListing),hasMore:result.page*result.pageSize<result.total};}

export async function getActiveListings(): Promise<Vehicle[]> {
  const result = await fetchMongoListings({});
  return result.listings;
}

export async function getActiveListingPage(
  filters: ListingPageFilters = {},
  lastDocument?: MongoListingCursor | null,
): Promise<ListingPage> {
  const offset=lastDocument?.offset??0;
  const result=await fetchMongoListings(filters,offset);
  return {
    listings:result.listings,
    lastDocument:result.listings.length?{source:"mongo",offset:offset+result.listings.length}:null,
    hasMore:result.hasMore,
  };
}

function matchesListingFilters(listing: Vehicle, filters: ListingPageFilters) {
  return (
    (!filters.listingType || filters.listingType === "all" || listing.listingType === filters.listingType)
    && (!filters.location || filters.location === "all" || listing.location.city.toLowerCase() === filters.location.toLowerCase())
    && (!filters.make || filters.make === "all" || listing.make.toLowerCase() === filters.make.toLowerCase())
    && (!filters.model || filters.model === "all" || listing.model.toLowerCase() === filters.model.toLowerCase())
    && (!filters.bodyType || filters.bodyType === "all" || listing.bodyType?.toLowerCase() === filters.bodyType.toLowerCase())
    && (!filters.transmission || filters.transmission === "all" || listing.transmission === filters.transmission)
    && (!filters.fuelType || filters.fuelType === "all" || listing.fuelType === filters.fuelType)
    && (!filters.condition || filters.condition === "all" || listing.condition === filters.condition)
    && (filters.priceMin === undefined || listing.price >= filters.priceMin)
    && (filters.priceMax === undefined || listing.price <= filters.priceMax)
    && (filters.yearMin === undefined || listing.year >= filters.yearMin)
    && (filters.yearMax === undefined || listing.year <= filters.yearMax)
    && (filters.mileageMax === undefined || listing.mileage <= filters.mileageMax)
  );
}

export async function getPendingListings(): Promise<Vehicle[]> {
  const response=await fetch("/api/admin/vehicles?status=pending_review&pageSize=50",{cache:"no-store"});if(!response.ok)throw new Error("Unable to load moderation queue.");const result=await response.json();return result.data.map(mapMongoListing);
}

export async function getMyListings(ownerId: string): Promise<Vehicle[]> {
  const response=await fetch("/api/my/vehicles?pageSize=48",{cache:"no-store"});if(!response.ok)throw new Error("Unable to load your listings.");const result=await response.json();return result.data.map(mapMongoListing);
}

export async function getListingById(id: string): Promise<Vehicle | null> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    const sample = seedVehicles.find((listing) => listing.id === id);
    if (sample) return sample;
  }
  const response=await fetch(`/api/vehicles/${encodeURIComponent(id)}`,{cache:"no-store"});if(response.status===404)return null;if(!response.ok)throw new Error("Could not load vehicle.");const result=await response.json();return mapMongoListing(result.data);
}

export async function createListing(
  listing: Omit<Vehicle, "id" | "status" | "views" | "favoritesCount" | "createdAt" | "updatedAt">
): Promise<Vehicle> {
  const body=toMongoPayload(listing);const response=await fetch("/api/vehicles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw new Error(result.error||"Listing could not be created.");return normalizeListing({...listing,id:result.data.id,status:"pending",views:0,favoritesCount:0,createdAt:nowIso(),updatedAt:nowIso()});
}

export async function saveListingDraft(
  listing: Omit<Vehicle, "id" | "status" | "views" | "favoritesCount" | "createdAt" | "updatedAt">,
  draftId?: string,
): Promise<Vehicle> {
  const existing = draftId ? await getListingById(draftId) : null;
  const now = nowIso();
  const draft = normalizeListing({
    ...existing,
    ...listing,
    id: existing?.id ?? draftId ?? crypto.randomUUID(),
    status: "draft",
    views: existing?.views ?? 0,
    favoritesCount: existing?.favoritesCount ?? 0,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });

  if(existing){const response=await fetch(`/api/vehicles/${draft.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(toMongoPayload(listing))});const result=await response.json();if(!response.ok)throw new Error(result.error||"Draft could not be updated.");return draft;}
  const response=await fetch("/api/vehicles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(toMongoPayload(listing))});const result=await response.json();if(!response.ok)throw new Error(result.error||"Draft could not be saved.");return {...draft,id:result.data.id};
}

export async function updateListingStatus(
  listingId: string,
  status: ListingStatus,
  rejectionReason?: string
) {
  const statusMap:Record<string,string>={pending:"pending_review",active:"active",draft:"draft",rejected:"rejected",sold:"sold",rented:"rented",suspended:"paused"};const response=await fetch(`/api/vehicles/${listingId}/status`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:statusMap[status]??"pending_review"})});if(!response.ok)throw new Error("Unable to update listing status.");
}

export async function deleteListing(listingId: string) {
  const response=await fetch(`/api/vehicles/${listingId}`,{method:"DELETE"});if(!response.ok)throw new Error("Unable to delete listing.");
}

export async function uploadVehicleImages(userId: string, files: File[]) {
  if (!files.length) return [];

  const activeStorage = storage;

  if (!firebaseReady || !activeStorage) {
    const result = await Promise.all(
      files.slice(0, MAX_VEHICLE_IMAGES).map(async (file) => {
        const source = await createImagePreview(file);
        return source;
      })
    );

    return result.slice(0, MAX_VEHICLE_IMAGES);
  }

  const urls = await Promise.all(
    files.slice(0, MAX_VEHICLE_IMAGES).map(async (file) => {
      const fileName = `${Date.now()}-${file.name}`;
      const optimizedFile = await optimizeImage(file);
      const storageRef = ref(
        activeStorage,
        `vehicle-images/${userId}/${fileName}`
      );
      await uploadBytes(storageRef, optimizedFile, {
        cacheControl: "public,max-age=31536000,immutable",
        contentType: "image/jpeg",
      });
      return getDownloadURL(storageRef);
    })
  );

  return urls;
}

async function createImagePreview(file: File) {
  const optimizedFile = await optimizeImage(file);
  return await readBlobAsDataUrl(optimizedFile);
}

async function optimizeImage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  const maxDimension = 1280;
  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return file;
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const optimized = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.78);
  });

  return optimized ?? file;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Image upload failed."));
    reader.readAsDataURL(blob);
  });
}
