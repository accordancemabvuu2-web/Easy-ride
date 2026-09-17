"use client";

import type { Vehicle } from "@/Types/vehicle";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { useEffect, useRef, useState } from "react";

type GoogleMapInstance = NonNullable<ConstructorParameters<typeof MarkerClusterer>[0]["map"]>;
type GoogleMarkerInstance = NonNullable<
  NonNullable<ConstructorParameters<typeof MarkerClusterer>[0]["markers"]>[number]
>;
type GoogleBoundsInstance = {
  extend: (point: { lat: number; lng: number }) => void;
};

interface GoogleMapsApi {
  maps: {
    Map: new (
      element: HTMLElement,
      options: Record<string, unknown>,
    ) => GoogleMapInstance;
    InfoWindow: new () => {
      setContent: (content: string) => void;
      open: (options: { anchor: GoogleMarkerInstance; map: GoogleMapInstance }) => void;
    };
    Marker: new (options: {
      position: { lat: number; lng: number };
      title: string;
    }) => GoogleMarkerInstance;
    LatLngBounds: new () => GoogleBoundsInstance;
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

type GoogleWindow = Window & {
  gm_authFailure?: () => void;
};

export default function MarketplaceMap({
  vehicles,
  onVehicleSelect,
}: MarketplaceMapProps) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!apiKey || !mapElement.current) {
      setError("Google Maps key unavailable. Showing the OpenStreetMap fallback.");
      return;
    }

    let cancelled = false;
    let clusterer: MarkerClusterer | null = null;
    const googleWindow = window as GoogleWindow;
    const previousAuthFailure = googleWindow.gm_authFailure;

    const authFailureHandler = () => {
      previousAuthFailure?.();
      if (!cancelled) {
        setError("Google Maps billing or API restrictions blocked the map. Showing the OpenStreetMap fallback.");
      }
    };
    googleWindow.gm_authFailure = authFailureHandler;

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

        clusterer = new MarkerClusterer({ map, markers });

        if (validVehicles.length > 0) {
          const bounds = new googleMaps.maps.LatLngBounds();
          validVehicles.forEach((vehicle) => {
            bounds.extend({
              lat: vehicle.location.latitude,
              lng: vehicle.location.longitude,
            });
          });
          map.fitBounds(bounds as Parameters<GoogleMapInstance["fitBounds"]>[0]);
        }
      })
      .catch(() => {
        setError("Google Maps failed to load.");
      });

    return () => {
      cancelled = true;
      clusterer?.clearMarkers();
      if (googleWindow.gm_authFailure === authFailureHandler) {
        delete googleWindow.gm_authFailure;
      }
    };
  }, [apiKey, onVehicleSelect, vehicles]);

  const showFallback = !apiKey || Boolean(error);

  return (
    <div>
      {showFallback ? (
        <div className="overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-gray-100">
          <iframe
            title="Easy Ride vehicle map"
            src="https://www.openstreetmap.org/export/embed.html?bbox=30.7%2C-18.1%2C31.4%2C-17.5&layer=mapnik&marker=-17.8252%2C31.0335"
            className="h-[620px] w-full border-0"
            loading="lazy"
          />
        </div>
      ) : (
        <div
          ref={mapElement}
          className="h-[620px] overflow-hidden rounded-[28px] border border-[#E5E7EB] bg-gray-100"
        />
      )}

      {error && <p className="mt-3 text-sm text-gray-500">{error}</p>}
    </div>
  );
}
