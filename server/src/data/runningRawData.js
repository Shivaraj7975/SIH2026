/**
 * Server-side Running Raw Data: Standardized GPS telemetry and coordinates
 * for testing and demonstration:
 * 1. Curved Loops (Closed circuits & area enclosure)
 * 2. Straight Lines (Linear sprints & corridor buffer captures)
 * 3. Zig-Zag Routes (Urban agility & multi-angle directional shifts)
 */

export const RUNNING_RAW_DATA = {
  // 1. Curved Loop: Smooth circular track enclosing a park sector (~40m)
  curve: {
    id: 'curve',
    name: 'Curved Loop Run (~40m, Enclosed Area)',
    type: 'CURVE',
    description: 'Smooth continuous curve that encloses and captures territory',
    coords: [
      [77.59440, 12.97100],
      [77.59460, 12.97110],
      [77.59470, 12.97125],
      [77.59455, 12.97140],
      [77.59435, 12.97135],
      [77.59425, 12.97115],
      [77.59440, 12.97100],
    ],
    telemetry: [
      { latitude: 12.97100, longitude: 77.59440, accuracy: 4.5, speed: 3.2, elevation: 920 },
      { latitude: 12.97110, longitude: 77.59460, accuracy: 4.2, speed: 3.4, elevation: 920 },
      { latitude: 12.97125, longitude: 77.59470, accuracy: 4.0, speed: 3.3, elevation: 921 },
      { latitude: 12.97140, longitude: 77.59455, accuracy: 3.8, speed: 3.1, elevation: 921 },
      { latitude: 12.97135, longitude: 77.59435, accuracy: 4.1, speed: 3.2, elevation: 920 },
      { latitude: 12.97115, longitude: 77.59425, accuracy: 4.3, speed: 3.3, elevation: 920 },
      { latitude: 12.97100, longitude: 77.59440, accuracy: 4.5, speed: 3.2, elevation: 920 },
    ],
  },

  // 2. Straight Line: Pure linear forward movement along an urban avenue (~150m)
  straight_line: {
    id: 'straight_line',
    name: 'Straight Line Sprint (~150m, Corridor)',
    type: 'STRAIGHT',
    description: 'Direct straight-line sprint claiming a continuous buffer corridor',
    coords: [
      [77.59440, 12.97100],
      [77.59470, 12.97125],
      [77.59500, 12.97150],
      [77.59530, 12.97175],
      [77.59560, 12.97200],
      [77.59590, 12.97225],
    ],
    telemetry: [
      { latitude: 12.97100, longitude: 77.59440, accuracy: 3.5, speed: 3.8, elevation: 918 },
      { latitude: 12.97125, longitude: 77.59470, accuracy: 3.6, speed: 4.0, elevation: 918 },
      { latitude: 12.97150, longitude: 77.59500, accuracy: 3.5, speed: 4.2, elevation: 919 },
      { latitude: 12.97175, longitude: 77.59530, accuracy: 3.4, speed: 4.1, elevation: 919 },
      { latitude: 12.97200, longitude: 77.59560, accuracy: 3.5, speed: 4.3, elevation: 920 },
      { latitude: 12.97225, longitude: 77.59590, accuracy: 3.6, speed: 4.0, elevation: 920 },
    ],
  },

  // 3. Zig-Zag: Rapid alternating left/right cuts simulating street dodging and cornering (~160m)
  zigzag: {
    id: 'zigzag',
    name: 'Zig-Zag Urban Agility Route (~160m)',
    type: 'ZIGZAG',
    description: 'Sharp alternating left-right diagonal zig-zag course testing cornering cadence',
    coords: [
      [77.59440, 12.97100], // Origin
      [77.59475, 12.97125], // Cut North-East
      [77.59445, 12.97150], // Cut North-West
      [77.59480, 12.97175], // Cut North-East
      [77.59450, 12.97200], // Cut North-West
      [77.59485, 12.97225], // Cut North-East
      [77.59455, 12.97250], // Cut North-West
    ],
    telemetry: [
      { latitude: 12.97100, longitude: 77.59440, accuracy: 3.8, speed: 3.1, elevation: 919 },
      { latitude: 12.97125, longitude: 77.59475, accuracy: 3.9, speed: 3.3, elevation: 920 },
      { latitude: 12.97150, longitude: 77.59445, accuracy: 4.0, speed: 2.9, elevation: 920 },
      { latitude: 12.97175, longitude: 77.59480, accuracy: 3.7, speed: 3.4, elevation: 921 },
      { latitude: 12.97200, longitude: 77.59450, accuracy: 4.1, speed: 2.8, elevation: 921 },
      { latitude: 12.97225, longitude: 77.59485, accuracy: 3.8, speed: 3.2, elevation: 922 },
      { latitude: 12.97250, longitude: 77.59455, accuracy: 3.9, speed: 3.0, elevation: 922 },
    ],
  },

  // 4. Zig-Zag Loop: Alternating zig-zag track that returns to start to enclose multi-point territory
  zigzag_loop: {
    id: 'zigzag_loop',
    name: 'Zig-Zag Enclosed Circuit (~180m)',
    type: 'ZIGZAG',
    description: 'Zig-zag pattern returning to starting origin to enclose complex polygon territory',
    coords: [
      [77.59440, 12.97100],
      [77.59475, 12.97125],
      [77.59445, 12.97150],
      [77.59480, 12.97175],
      [77.59430, 12.97180],
      [77.59415, 12.97140],
      [77.59440, 12.97100],
    ],
    telemetry: [
      { latitude: 12.97100, longitude: 77.59440, accuracy: 3.8, speed: 3.2, elevation: 919 },
      { latitude: 12.97125, longitude: 77.59475, accuracy: 4.0, speed: 3.3, elevation: 920 },
      { latitude: 12.97150, longitude: 77.59445, accuracy: 3.9, speed: 3.0, elevation: 920 },
      { latitude: 12.97175, longitude: 77.59480, accuracy: 4.1, speed: 3.2, elevation: 921 },
      { latitude: 12.97180, longitude: 77.59430, accuracy: 3.7, speed: 3.1, elevation: 921 },
      { latitude: 12.97140, longitude: 77.59415, accuracy: 3.8, speed: 3.3, elevation: 920 },
      { latitude: 12.97100, longitude: 77.59440, accuracy: 3.8, speed: 3.2, elevation: 919 },
    ],
  },
};
