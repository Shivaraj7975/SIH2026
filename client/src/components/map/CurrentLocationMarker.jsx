import { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';

export default function CurrentLocationMarker({
  map,
  userLocation,
  activeUser,
  followUser = false,
}) {
  const markerRef = useRef(null);
  const accuracyRingRef = useRef(null);
  const headingConeRef = useRef(null);
  const coreDotRef = useRef(null);

  // Initialize and tear down marker with map lifecycle
  useEffect(() => {
    if (!map) return;

    const brandColor = '#7C3AED';

    const el = document.createElement('div');
    el.className = 'relative flex items-center justify-center w-12 h-12 pointer-events-none';
    el.setAttribute('aria-label', 'Your Current Location');

    // Soft accuracy ring (rgba(124,58,237,.15))
    const accuracyRing = document.createElement('div');
    accuracyRing.className = 'absolute rounded-full pointer-events-none transition-all duration-300';
    accuracyRing.style.width = '48px';
    accuracyRing.style.height = '48px';
    accuracyRing.style.backgroundColor = 'rgba(124, 58, 237, 0.15)';
    accuracyRing.style.border = '1px solid rgba(124, 58, 237, 0.3)';
    accuracyRingRef.current = accuracyRing;

    // Heading cone when moving
    const headingCone = document.createElement('div');
    headingCone.className = 'absolute -top-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[10px] border-b-[#7C3AED] transition-transform duration-200';
    headingCone.style.transformOrigin = '50% 100%';
    headingCone.style.display = 'none';
    headingConeRef.current = headingCone;

    // 16px circle, brand violet, white 3px border
    const core = document.createElement('div');
    core.className = 'relative w-4 h-4 rounded-full bg-[#7C3AED] border-[3px] border-white shadow-md transition-transform transform';
    coreDotRef.current = core;

    el.appendChild(accuracyRing);
    el.appendChild(headingCone);
    el.appendChild(core);

    const marker = new maplibregl.Marker({ element: el });
    markerRef.current = marker;

    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
      accuracyRingRef.current = null;
      headingConeRef.current = null;
      coreDotRef.current = null;
    };
  }, [map]);

  // Move marker smoothly whenever userLocation updates
  useEffect(() => {
    if (!map || !markerRef.current || !userLocation) return;

    const rawLat = userLocation.latitude ?? userLocation.lat;
    const rawLng = userLocation.longitude ?? userLocation.lng;
    const heading = userLocation.heading ?? userLocation.bearing;
    const lat = Number(rawLat);
    const lng = Number(rawLng);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return;
    }

    // Attach to map if not attached
    const el = markerRef.current.getElement();
    if (!el.parentNode) {
      markerRef.current.setLngLat([lng, lat]).addTo(map);
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    // Update heading cone
    if (headingConeRef.current) {
      if (heading !== null && heading !== undefined && !isNaN(heading)) {
        headingConeRef.current.style.display = 'block';
        headingConeRef.current.style.transform = `rotate(${heading}deg) translateY(-8px)`;
      } else {
        headingConeRef.current.style.display = 'none';
      }
    }

    if (followUser) {
      map.easeTo({
        center: [lng, lat],
        duration: 350,
      });
    }
  }, [map, userLocation, followUser]);

  return null;
}
