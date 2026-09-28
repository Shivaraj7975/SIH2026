/**
 * Client-side Running Datasets: Standardized GPS telemetry and coordinates
 * for rapid on-road & garden testing without any city branding.
 */

export const RUNNING_RAW_DATA = {
  // 1. Curved On-Road Loop: Paved road circuit (~180m, Quick Loop Test)
  curve: {
    id: 'curve',
    name: 'Curved On-Road Loop (~180m)',
    type: 'CURVE',
    description: 'Smooth curved circuit along paved roadway, completely road-aligned with zero house overlap',
    coords: [
      [77.59320, 12.97300],
      [77.59295, 12.97318],
      [77.59280, 12.97340],
      [77.59285, 12.97365],
      [77.59310, 12.97375],
      [77.59340, 12.97360],
      [77.59350, 12.97335],
      [77.59340, 12.97310],
      [77.59320, 12.97300],
    ],
    telemetry: [
      { latitude: 12.97300, longitude: 77.59320, accuracy: 3.2, speed: 3.5, elevation: 920 },
      { latitude: 12.97318, longitude: 77.59295, accuracy: 3.1, speed: 3.6, elevation: 920 },
      { latitude: 12.97340, longitude: 77.59280, accuracy: 3.0, speed: 3.5, elevation: 921 },
      { latitude: 12.97365, longitude: 77.59285, accuracy: 3.2, speed: 3.4, elevation: 921 },
      { latitude: 12.97375, longitude: 77.59310, accuracy: 3.1, speed: 3.5, elevation: 921 },
      { latitude: 12.97360, longitude: 77.59340, accuracy: 3.3, speed: 3.6, elevation: 920 },
      { latitude: 12.97335, longitude: 77.59350, accuracy: 3.2, speed: 3.5, elevation: 920 },
      { latitude: 12.97310, longitude: 77.59340, accuracy: 3.1, speed: 3.4, elevation: 920 },
      { latitude: 12.97300, longitude: 77.59320, accuracy: 3.2, speed: 3.5, elevation: 920 },
    ],
  },

  // 2. Garden Crescent Loop: Paved botanical garden pathway (~190m)
  garden_crescent: {
    id: 'garden_crescent',
    name: 'Garden Crescent Loop (~190m)',
    type: 'CURVE',
    description: 'Curved pedestrian loop along paved garden avenues and shaded paths',
    coords: [
      [77.59400, 12.97400],
      [77.59380, 12.97425],
      [77.59355, 12.97440],
      [77.59330, 12.97430],
      [77.59320, 12.97405],
      [77.59340, 12.97380],
      [77.59375, 12.97375],
      [77.59400, 12.97400],
    ],
    telemetry: [
      { latitude: 12.97400, longitude: 77.59400, accuracy: 3.0, speed: 3.4, elevation: 919 },
      { latitude: 12.97425, longitude: 77.59380, accuracy: 3.2, speed: 3.5, elevation: 920 },
      { latitude: 12.97440, longitude: 77.59355, accuracy: 3.1, speed: 3.6, elevation: 920 },
      { latitude: 12.97430, longitude: 77.59330, accuracy: 3.0, speed: 3.4, elevation: 920 },
      { latitude: 12.97405, longitude: 77.59320, accuracy: 3.3, speed: 3.5, elevation: 919 },
      { latitude: 12.97380, longitude: 77.59340, accuracy: 3.1, speed: 3.6, elevation: 919 },
      { latitude: 12.97375, longitude: 77.59375, accuracy: 3.2, speed: 3.4, elevation: 919 },
      { latitude: 12.97400, longitude: 77.59400, accuracy: 3.0, speed: 3.4, elevation: 919 },
    ],
  },

  // 3. Boulevard Rotary Curve: Paved roundabout & circular road segment (~175m)
  boulevard_rotary: {
    id: 'boulevard_rotary',
    name: 'Boulevard Rotary Curve (~175m)',
    type: 'CURVE',
    description: 'Tight continuous road curve along a circular traffic boulevard',
    coords: [
      [77.59250, 12.97220],
      [77.59230, 12.97240],
      [77.59215, 12.97265],
      [77.59220, 12.97290],
      [77.59245, 12.97300],
      [77.59270, 12.97285],
      [77.59280, 12.97255],
      [77.59270, 12.97230],
      [77.59250, 12.97220],
    ],
    telemetry: [
      { latitude: 12.97220, longitude: 77.59250, accuracy: 3.1, speed: 3.5, elevation: 920 },
      { latitude: 12.97240, longitude: 77.59230, accuracy: 3.2, speed: 3.6, elevation: 920 },
      { latitude: 12.97265, longitude: 77.59215, accuracy: 3.0, speed: 3.5, elevation: 921 },
      { latitude: 12.97290, longitude: 77.59220, accuracy: 3.1, speed: 3.4, elevation: 921 },
      { latitude: 12.97300, longitude: 77.59245, accuracy: 3.3, speed: 3.6, elevation: 921 },
      { latitude: 12.97285, longitude: 77.59270, accuracy: 3.2, speed: 3.5, elevation: 921 },
      { latitude: 12.97255, longitude: 77.59280, accuracy: 3.0, speed: 3.4, elevation: 920 },
      { latitude: 12.97230, longitude: 77.59270, accuracy: 3.2, speed: 3.5, elevation: 920 },
      { latitude: 12.97220, longitude: 77.59250, accuracy: 3.1, speed: 3.5, elevation: 920 },
    ],
  },
};
