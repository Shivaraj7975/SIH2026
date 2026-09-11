import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { sounds } from '../lib/audio.js';
import { h3ToGeoJsonFeature } from '../lib/spatial.js';

export function useRealtimeTerritory({ activeUser, onCellCaptured, onTerritoryLost } = {}) {
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [lastEvent, setLastEvent] = useState(null);
  const [recentFlashes, setRecentFlashes] = useState(new Set()); // Set of h3CellIds currently flashing
  const socketRef = useRef(null);

  useEffect(() => {
    // Determine backend socket endpoint (defaults to port 5000 in dev or current origin)
    const backendUrl = import.meta.env.VITE_WS_URL || 'http://localhost:5000';

    // Connect to backend Socket.IO
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      timeout: 10000,
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('📡 Connected to Realtime Territory Grid Socket');
      setConnectionStatus('connected');
      socket.emit('grid:subscribe', { region: 'global' });
    });

    socket.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from Realtime Territory Socket');
      setConnectionStatus('disconnected');
    });

    socket.on('connect_error', () => {
      setConnectionStatus('disconnected');
    });

    // Real-time territory capture event handler
    socket.on('territory:captured', (payload) => {
      console.log('⚡ Realtime Territory Event received:', payload);
      setLastEvent(payload);

      const capturedCells = payload.cells || [];
      const isMine = payload.athlete?.id === activeUser?.id;
      const stolenFromMe = capturedCells.some((c) => c.previousOwnerId === activeUser?.id && !isMine);

      // Audio & Animation cues
      if (isMine) {
        sounds.play('territoryClaim');
      } else if (stolenFromMe) {
        sounds.play('territoryLost');
        if (onTerritoryLost) {
          onTerritoryLost(payload);
        }
      } else {
        sounds.play('pointCollect');
      }

      // Add to animated flash set for 3 seconds
      const newFlashIds = new Set(capturedCells.map((c) => c.h3CellId));
      setRecentFlashes((prev) => new Set([...prev, ...newFlashIds]));

      setTimeout(() => {
        setRecentFlashes((prev) => {
          const next = new Set(prev);
          newFlashIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 3500);

      if (onCellCaptured) {
        onCellCaptured(payload);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeUser?.id, onCellCaptured, onTerritoryLost]);

  /**
   * Apply targeted delta patch to existing GeoJSON FeatureCollection
   * (Modifies ONLY affected cells without reloading or re-centering the map!)
   */
  const patchTerritoryGeoJson = useCallback((prevGeoJson, capturePayload) => {
    if (!prevGeoJson || !prevGeoJson.features || !capturePayload?.cells) {
      return prevGeoJson;
    }

    const updatedMap = new Map(capturePayload.cells.map((c) => [c.h3CellId, c]));
    const newFeatures = [];
    const matchedCellIds = new Set();

    for (const feature of prevGeoJson.features) {
      const cellId = feature.properties?.h3_cell_id || feature.properties?.id;
      if (updatedMap.has(cellId)) {
        const update = updatedMap.get(cellId);
        matchedCellIds.add(cellId);

        // Targeted property modification (Requirement 4)
        newFeatures.push({
          ...feature,
          properties: {
            ...feature.properties,
            owner_id: update.currentOwnerId,
            owner_name: update.currentOwnerName,
            owner_avatar: update.currentOwnerAvatar,
            owner_color: update.color || '#00f2fe',
            color: update.color || '#00f2fe',
            is_unclaimed: false,
            last_captured_at: update.lastCapturedAt,
            just_captured: true,
          },
        });
      } else {
        newFeatures.push(feature);
      }
    }

    // If new cells were encountered that didn't exist in the current viewport feature list:
    for (const cell of capturePayload.cells) {
      if (!matchedCellIds.has(cell.h3CellId)) {
        try {
          const feat = h3ToGeoJsonFeature(cell.h3CellId, {
            h3_cell_id: cell.h3CellId,
            owner_id: cell.currentOwnerId,
            owner_name: cell.currentOwnerName,
            owner_avatar: cell.currentOwnerAvatar,
            owner_color: cell.color || '#00f2fe',
            color: cell.color || '#00f2fe',
            is_unclaimed: false,
            last_captured_at: cell.lastCapturedAt,
            just_captured: true,
          });
          if (feat) newFeatures.push(feat);
        } catch (e) {}
      }
    }

    return {
      type: 'FeatureCollection',
      features: newFeatures,
    };
  }, []);

  return {
    connectionStatus,
    lastEvent,
    recentFlashes,
    patchTerritoryGeoJson,
  };
}
