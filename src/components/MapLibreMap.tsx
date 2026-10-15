import React, { useEffect, useRef } from 'react';
import * as maplibregl from 'maplibre-gl';
// The map's own stylesheet, matching the installed version. Loaded only on pages with a map.
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre 6 looks for its background worker next to its own file, which breaks once the app is bundled.
// Importing it with ?url makes the build ship the file and tells MapLibre exactly where it is.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

import { Listing } from '../types/listing';
import { formatCAD } from '../lib/commissionCalc';

export interface MapLibreMapProps {
  listings: Listing[];
  selectedListingId?: string;
  onSelectListing?: (id: string) => void;
  approximateMode?: boolean; // Single listing approximate radius
  singleListing?: Listing;
  heightClass?: string;
}

maplibregl.setWorkerUrl(mapWorkerUrl);

// Optional: a hosted map-tile provider (recommended for launch). Example: https://api.maptiler.com/maps/streets-v2/256/{z}/{x}/{y}.png?key=YOUR_KEY
const customTileUrl = String(import.meta.env.VITE_MAP_TILE_URL ?? '').trim();

export const MapLibreMap: React.FC<MapLibreMapProps> = ({
  listings,
  selectedListingId,
  onSelectListing,
  approximateMode = false,
  singleListing,
  heightClass = 'h-[500px]'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const fittedKeyRef = useRef<string>('');

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Default view: the single home, or all of Canada until the homes are fitted below
    const defaultCenter: [number, number] = singleListing
      ? [singleListing.lng, singleListing.lat]
      : [-96, 56];
    const defaultZoom = singleListing ? 13 : 2.6;

    // Free OpenStreetMap Raster Tile Style for MapLibre (no paid API key required)
    const osmStyle: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        'osm-tiles': {
          type: 'raster',
          tiles: customTileUrl
            ? [customTileUrl]
            : [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
          tileSize: 256,
          attribution: String(import.meta.env.VITE_MAP_ATTRIBUTION ?? '') || '&copy; OpenStreetMap contributors'
        }
      },
      layers: [
        {
          id: 'osm-tiles-layer',
          type: 'raster',
          source: 'osm-tiles',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: osmStyle,
      center: defaultCenter,
      zoom: defaultZoom
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when listings or selection change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (approximateMode && singleListing) {
      // Single listing approximate radius marker
      const el = document.createElement('div');
      el.className = 'flex flex-col items-center cursor-default';
      el.innerHTML = `
        <div class="relative flex items-center justify-center">
          <div class="w-20 h-20 rounded-full bg-emerald-600/20 border-2 border-emerald-600 animate-pulse"></div>
          <div class="absolute w-4 h-4 rounded-full bg-emerald-700 border-2 border-white shadow-md"></div>
        </div>
        <div class="mt-1 bg-white/95 backdrop-blur-sm text-slate-800 text-[11px] font-semibold px-2 py-0.5 rounded shadow-sm border border-slate-200">
          Approximate Location
        </div>
      `;

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([singleListing.lng, singleListing.lat])
        .addTo(map);

      markersRef.current.push(marker);

      map.flyTo({
        center: [singleListing.lng, singleListing.lat],
        zoom: 13.5
      });
      return;
    }

    // Multiple listings markers
    listings.forEach((item) => {
      const isSelected = item.id === selectedListingId;

      const el = document.createElement('button');
      el.type = 'button';
      el.className = `px-2.5 py-1 rounded-full text-xs font-bold shadow-md transition-all duration-150 transform hover:scale-110 cursor-pointer border ${
        isSelected
          ? 'bg-slate-900 text-white border-white scale-110 ring-2 ring-emerald-500'
          : 'bg-white text-slate-900 border-slate-300 hover:bg-emerald-50 hover:text-emerald-900'
      }`;

      // Show formatted price
      const shortPrice = item.price >= 1000000 
        ? `$${(item.price / 1000000).toFixed(2)}M` 
        : `$${Math.round(item.price / 1000)}k`;

      el.innerText = item.offersCashback ? `🎁 ${shortPrice}` : shortPrice;

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (onSelectListing) {
          onSelectListing(item.id);
        }
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([item.lng, item.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    // Zoom to the homes being shown, only when that set changes (not on every selection)
    const setKey = listings.map((l) => l.id).sort().join(',');
    if (setKey !== fittedKeyRef.current) {
      fittedKeyRef.current = setKey;
      const points = listings.filter((l) => Number.isFinite(l.lat) && Number.isFinite(l.lng));
      if (points.length === 1) {
        map.jumpTo({ center: [points[0].lng, points[0].lat], zoom: 11 });
      } else if (points.length > 1) {
        const bounds = new maplibregl.LngLatBounds();
        points.forEach((p) => bounds.extend([p.lng, p.lat]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 12, duration: 0 });
      }
    }
  }, [listings, selectedListingId, approximateMode, singleListing, onSelectListing]);

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden border border-slate-200 shadow-sm ${heightClass}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
      
      {approximateMode ? (
        <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-600 flex items-center justify-between">
          <span>
            📍 <strong>Privacy & Safety:</strong> Neighborhood center is shown. Precise address is unlocked upon seller viewing confirmation.
          </span>
        </div>
      ) : singleListing ? (
        <div className="absolute bottom-3 left-3 right-3 bg-emerald-950/90 backdrop-blur-md text-emerald-100 px-3.5 py-2 rounded-xl border border-emerald-700/60 shadow-sm text-xs flex items-center justify-between">
          <span>
            ✓ <strong>Confirmed Viewing:</strong> Exact property coordinates and street pin unlocked.
          </span>
        </div>
      ) : null}
    </div>
  );
};
