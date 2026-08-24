"use client";

import type { Vehicle } from "@/Types/vehicle";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useEffect, useRef, useState } from "react";

type ClustererMap = NonNullable<
  ConstructorParameters<typeof MarkerClusterer>[0]["map"]
>;
type ClustererMarker = NonNullable<
  ConstructorParameters<typeof MarkerClusterer>[0]["markers"]
>[number];

interface GoogleMapInstance {
  fitBounds: (bounds: unknown) => void;
}

interface GoogleInfoWindowInstance {
  setContent: (content: string) => void;
  open: (options: { anchor: GoogleMarkerInstance; map: GoogleMapInstance }) => void;
}

interface GoogleMarkerInstance {
  addListener: (event: string, handler: () => void) => void;
}

interface GoogleMapsApi {
  maps: {
    Map: new (
      element: HTMLElement,
      options: Record<string, unknown>,
    ) => GoogleMapInstance;
    InfoWindow: new () => GoogleInfoWindowInstance;
    Marker: new (options: Record<string, unknown>) => GoogleMarkerInstance;
    LatLngBounds: new () => {
      extend: (point: { lat: number; lng: number }) => void;
    };
  };
}

interface MarketplaceMapProps {
  vehicles: Vehicle[];
  onVehicleSelect?: (vehicle: Vehicle) => void;
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as Window & { google?: { maps?: unknown } }).google?.maps) {
      resolve();
      return;
    }

    const existing = document.querySelector(
      'script[data-easy-ride-map="true"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.dataset.easyRideMap = "true";
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function MarketplaceMap({
  vehicles,
  onVehicleSelect,
}: MarketplaceMapProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || !mapElement.current) {
      setError("Google Maps API key is unavailable.");
      return;
    }

    let cancelled = false;
    let clusterer: MarkerClusterer | null = null;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapElement.current) return;

        const googleMaps = (window as unknown as { google: GoogleMapsApi })
          .google;

        const validVehicles = vehicles.filter(
          (vehicle) =>
            Number.isFinite(vehicle.location.latitude) &&
            Number.isFinite(vehicle.location.longitude),
        );

        const map = new googleMaps.maps.Map(mapElement.current, {
          center: { lat: -17.8252, lng: 31.0335 },
          zoom: 7,
          mapTypeControl: false,
          streetViewControl: false,
        });

        const informationWindow = new googleMaps.maps.InfoWindow();
        const markers = validVehicles.map((vehicle) => {
          const marker = new googleMaps.maps.Marker({
            position: {
              lat: vehicle.location.latitude,
              lng: vehicle.location.longitude,
            },
            title: `${vehicle.make} ${vehicle.model} - ${vehicle.currency} ${vehicle.price.toLocaleString()}`,
          });

          marker.addListener("click", () => {
            informationWindow.setContent(`
              <div style="width:220px;font-family:Arial,sans-serif">
                <img src="${vehicle.coverImage}" alt="${vehicle.make} ${vehicle.model}" style="width:100%;height:110px;object-fit:cover;border-radius:10px" />
                <h3 style="margin:10px 0 4px;font-size:16px">${vehicle.make} ${vehicle.model} ${vehicle.year}</h3>
                <strong style="color:#0B5D3B">${vehicle.currency} ${vehicle.price.toLocaleString()}</strong>
                <p style="margin:5px 0;color:#6B7280;font-size:12px">${vehicle.location.city}</p>
              </div>
            `);
            informationWindow.open({ anchor: marker, map });
            onVehicleSelect?.(vehicle);
          });

          return marker;
        });

        clusterer = new MarkerClusterer({
          map: map as unknown as ClustererMap,
          markers: markers as unknown as ClustererMarker[],
        });

        if (validVehicles.length > 0) {
          const bounds = new googleMaps.maps.LatLngBounds();
          validVehicles.forEach((vehicle) => {
            bounds.extend({
              lat: vehicle.location.latitude,
              lng: vehicle.location.longitude,
            });
          });
          map.fitBounds(bounds);
        }
      })
      .catch(() => {
        setError("Google Maps failed to load.");
      });

    return () => {
      cancelled = true;
      clusterer?.clearMarkers();
    };
  }, [vehicles, onVehicleSelect]);

  return (
    <div>
      <div
        ref={mapElement}
        className="h-[620px] overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-gray-100"
      />

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
