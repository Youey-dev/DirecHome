import React, { Suspense, lazy } from 'react';
import type { MapLibreMapProps } from './MapLibreMap';

// The map library is large, so it is only downloaded when a map is actually shown.
const Map = lazy(() => import('./MapLibreMap').then((m) => ({ default: m.MapLibreMap })));

export const MapLibreMap: React.FC<MapLibreMapProps> = (props) => (
  <Suspense
    fallback={
      <div className="flex h-full min-h-[200px] w-full items-center justify-center bg-slate-100 text-xs text-slate-500">
        Loading map…
      </div>
    }
  >
    <Map {...props} />
  </Suspense>
);
