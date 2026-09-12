import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export default function CurrentLocationMarker({
  map,
  userLocation,
  activeUser,
  followUser = false,
}) {
  const markerRef = useRef(null);
  const coreRef = useRef(null);
  const pulseRef = useRef(null);

  // Initialize and tear down marker only with map lifecycle
  useEffect(() => {
    if (!map) return;

    const userColor = activeUser?.color || '#00f2fe';
    const userAvatar = activeUser?.avatar || '⚡';

    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center w-10 h-10 cursor-pointer';
    el.setAttribute('aria-label', 'Your Current Location');

    const pulse = document.createElement('div');
    pulse.className = 'player-marker-pulse';
    pulse.style.backgroundColor = `${userColor}55`;
    pulseRef.current = pulse;

    const core = document.createElement('div');
    core.className =
      'relative flex items-center justify-center w-7 h-7 rounded-full bg-slate-900 border-2 shadow-xl text-xs font-bold transition-transform transform hover:scale-110';
    core.style.borderColor = userColor;
    core.style.boxShadow = `0 0 12px ${userColor}88`;
    core.innerHTML = userAvatar;
    coreRef.current = core;

    el.appendChild(pulse);
    el.appendChild(core);

    const marker = new maplibregl.Marker({ element: el });
    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      pulseRef.current = null;
      coreRef.current = null;
    };
  }, [map]);

  // Update visual styling if user profile changes
  useEffect(() => {
    const userColor = activeUser?.color || '#00f2fe';
    const userAvatar = activeUser?.avatar || '⚡';
    if (pulseRef.current) {
      pulseRef.current.style.backgroundColor = `${userColor}55`;
    }
    if (coreRef.current) {
      coreRef.current.style.borderColor = userColor;
      coreRef.current.style.boxShadow = `0 0 12px ${userColor}88`;
      coreRef.current.innerHTML = userAvatar;
    }
  }, [activeUser]);

  // Move marker smoothly whenever userLocation updates without destroying DOM
  useEffect(() => {
    if (!map || !markerRef.current || !userLocation) return;

    const rawLat = userLocation.latitude ?? userLocation.lat;
    const rawLng = userLocation.longitude ?? userLocation.lng;
    const lat = Number(rawLat);
    const lng = Number(rawLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    // Ensure marker is attached to map
    const el = markerRef.current.getElement();
    if (!el.parentNode) {
      markerRef.current.setLngLat([lng, lat]).addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    if (followUser) {
      map.easeTo({
        center: [lng, lat],
        duration: 400,
      });
    }
  }, [map, userLocation, followUser]);

  return null;
}
