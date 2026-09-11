import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export default function CurrentLocationMarker({
  map,
  userLocation,
  activeUser,
  followUser = false,
}) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map || !userLocation) return;

    const lat = userLocation.latitude;
    const lng = userLocation.longitude;

    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
      return;
    }

    const userColor = activeUser?.color || '#00f2fe';
    const userAvatar = activeUser?.avatar || '⚡';

    if (!markerRef.current) {
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center w-10 h-10 cursor-pointer';
      el.setAttribute('aria-label', 'Your Current Location');

      const pulse = document.createElement('div');
      pulse.className = 'player-marker-pulse';
      pulse.style.backgroundColor = `${userColor}55`;

      const core = document.createElement('div');
      core.className =
        'relative flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 border-2 shadow-xl text-xs font-bold transition-transform transform hover:scale-110';
      core.style.borderColor = userColor;
      core.style.boxShadow = `0 0 12px ${userColor}88`;
      core.innerHTML = userAvatar;

      el.appendChild(pulse);
      el.appendChild(core);

      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    if (followUser) {
      map.easeTo({
        center: [lng, lat],
        duration: 800,
      });
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, [map, userLocation, activeUser, followUser]);

  return null;
}
