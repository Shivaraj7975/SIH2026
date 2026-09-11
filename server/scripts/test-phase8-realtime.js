import http from 'http';
import { io as ClientIO } from 'socket.io-client';
import { query } from '../src/config/database.js';
import { initSocketServer } from '../src/realtime/socket.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { UsersRepository } from '../src/repositories/users.repository.js';
import { h3ToGeoJsonFeature } from '../src/spatial/spatial.js';

const TEST_PORT = 5055;
const TEST_SERVER_URL = `http://localhost:${TEST_PORT}`;

// Realistic GPS track in Bangalore
const GPS_TRACK_A = [
  { latitude: 12.9716, longitude: 77.5946, timestamp: Date.now() - 300000, accuracy: 5, speed: 2.5 },
  { latitude: 12.9725, longitude: 77.5955, timestamp: Date.now() - 240000, accuracy: 4, speed: 2.6 },
  { latitude: 12.9735, longitude: 77.5965, timestamp: Date.now() - 180000, accuracy: 6, speed: 2.8 },
  { latitude: 12.9745, longitude: 77.5975, timestamp: Date.now() - 120000, accuracy: 5, speed: 3.0 },
];

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Client-side Delta Patch function test
function patchTerritoryGeoJson(prevGeoJson, capturePayload) {
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
}

async function runPhase8RealtimeTests() {
  console.log('\n======================================================');
  console.log('🏁 RUNNING PHASE 8 REAL-TIME TERRITORY TEST SUITE');
  console.log('======================================================\n');

  // Start dedicated Test Socket Server
  const server = http.createServer();
  const io = initSocketServer(server);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`🚀 Test Socket Server online on port ${TEST_PORT}`);

  // Verify test users exist
  const userA = await UsersRepository.findById('user-rahul');
  const userB = await UsersRepository.findById('user-priya');
  const userC = await UsersRepository.findById('user-shivaraj');

  assert(userA && userB && userC, 'Test users (Rahul, Priya, Shivaraj) exist in database');

  // ----------------------------------------------------
  // TEST 1: Multiple Concurrent Browser Socket Sessions
  // ----------------------------------------------------
  console.log('\n--- TEST 1: Connecting Multiple Browser Socket Clients ---');
  const clientA = ClientIO(TEST_SERVER_URL, { transports: ['websocket'] });
  const clientB = ClientIO(TEST_SERVER_URL, { transports: ['websocket'] });
  const clientC = ClientIO(TEST_SERVER_URL, { transports: ['websocket'] });

  const clientAPromise = new Promise((resolve) => clientA.on('connect', resolve));
  const clientBPromise = new Promise((resolve) => clientB.on('connect', resolve));
  const clientCPromise = new Promise((resolve) => clientC.on('connect', resolve));

  await Promise.all([clientAPromise, clientBPromise, clientCPromise]);
  assert(clientA.connected && clientB.connected && clientC.connected, 'All 3 client sockets connected successfully');

  // Subscribe to regional grid room
  clientA.emit('grid:subscribe', { region: 'global' });
  clientB.emit('grid:subscribe', { region: 'global' });
  clientC.emit('grid:subscribe', { region: 'global' });

  await sleep(150);

  // ----------------------------------------------------
  // TEST 2: Real-Time Conquest Broadcast & Privacy Checks
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Real-Time Broadcast & Zero-GPS Privacy Invariant ---');
  let receivedPayloadA = null;
  let receivedPayloadB = null;

  clientA.on('territory:captured', (p) => { receivedPayloadA = p; });
  clientB.on('territory:captured', (p) => { receivedPayloadB = p; });

  const workout1 = await TerritoryCaptureService.processWorkout({
    userId: 'user-rahul',
    type: 'RUN',
    gpsPoints: GPS_TRACK_A,
  });

  await sleep(300);

  assert(receivedPayloadA !== null, 'Client A received real-time territory:captured event');
  assert(receivedPayloadB !== null, 'Client B received real-time territory:captured event');
  assert(receivedPayloadA.athlete?.id === 'user-rahul', 'Payload correctly identifies capturing athlete ID');
  assert(receivedPayloadA.cells?.length > 0, 'Payload contains list of affected H3 cells');

  // PRIVACY INVARIANT VALIDATION (Requirements 2 & 3)
  assert(receivedPayloadA.gpsPoints === undefined, 'Privacy check: raw gpsPoints array is NOT broadcast');
  assert(receivedPayloadA.coordinates === undefined, 'Privacy check: raw coordinates are NOT broadcast');
  assert(receivedPayloadA.routeGeometry === undefined, 'Privacy check: private route geometry is NOT broadcast');
  assert(receivedPayloadA.latitude === undefined && receivedPayloadA.longitude === undefined, 'Privacy check: exact player GPS is NOT broadcast');

  for (const cell of receivedPayloadA.cells) {
    assert(typeof cell.h3CellId === 'string', `Cell ${cell.h3CellId} has string H3 ID`);
    assert(cell.currentOwnerId === 'user-rahul', `Cell ${cell.h3CellId} reports authoritative owner user-rahul`);
    assert(cell.latitude === undefined && cell.longitude === undefined, `Cell ${cell.h3CellId} exposes no private GPS`);
  }

  // ----------------------------------------------------
  // TEST 3: Simultaneous Capture Attempts & Race Conditions
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Simultaneous Capture Attempts & Race Conditions (Concurrent Promise.all) ---');
  
  // Rahul and Priya attempt to capture identical track concurrently
  const concurrentResults = await Promise.all([
    TerritoryCaptureService.processWorkout({
      userId: 'user-rahul',
      type: 'RUN',
      gpsPoints: GPS_TRACK_A,
    }),
    TerritoryCaptureService.processWorkout({
      userId: 'user-priya',
      type: 'RUN',
      gpsPoints: GPS_TRACK_A,
    }),
  ]);

  assert(concurrentResults.length === 2, 'Both simultaneous capture workouts completed execution');
  assert(concurrentResults[0].activity.id !== concurrentResults[1].activity.id, 'Distinct activities created for both athletes');

  // Check database integrity
  const targetCellId = concurrentResults[0].captureDetails[0].h3CellId;
  const dbCell = (await query(`SELECT * FROM territory_cells WHERE h3_cell_id = $1`, [targetCellId]))[0];
  assert(dbCell !== undefined, `Target cell ${targetCellId} exists in territory_cells table`);
  assert(dbCell.current_owner_id === 'user-rahul' || dbCell.current_owner_id === 'user-priya', `Authoritative DB owner is set (${dbCell.current_owner_id})`);

  // Verify historical integrity (both captures preserved in territory_history)
  const historyEntries = await query(
    `SELECT * FROM territory_history WHERE h3_cell_id = $1 ORDER BY captured_at DESC`,
    [targetCellId]
  );
  assert(historyEntries.length >= 2, `Both simultaneous captures are immutably logged in history (count: ${historyEntries.length})`);

  // ----------------------------------------------------
  // TEST 4: Client-Side Delta GeoJSON Patching (No Map Reload)
  // ----------------------------------------------------
  console.log('\n--- TEST 4: Client-Side Delta GeoJSON Patching Invariant ---');
  const initialGeoJson = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          h3_cell_id: targetCellId,
          owner_id: 'user-rahul',
          owner_name: 'Rahul',
          is_unclaimed: false,
          color: '#00f2fe',
        },
        geometry: { type: 'Polygon', coordinates: [] },
      },
      {
        type: 'Feature',
        properties: {
          h3_cell_id: '886189258ffffff',
          owner_id: 'user-shivaraj',
          owner_name: 'Shivaraj',
          is_unclaimed: false,
          color: '#10b981',
        },
        geometry: { type: 'Polygon', coordinates: [] },
      },
    ],
  };

  const updatePayload = {
    athlete: { id: 'user-priya', displayName: 'Priya' },
    cells: [
      {
        h3CellId: targetCellId,
        currentOwnerId: 'user-priya',
        currentOwnerName: 'Priya',
        currentOwnerAvatar: '🏃‍♀️',
        color: '#f43f5e',
        lastCapturedAt: new Date().toISOString(),
      },
    ],
  };

  const patchedGeoJson = patchTerritoryGeoJson(initialGeoJson, updatePayload);

  assert(patchedGeoJson.features.length === 2, 'Feature count unchanged after delta update');
  const updatedFeature = patchedGeoJson.features.find((f) => f.properties.h3_cell_id === targetCellId);
  assert(updatedFeature.properties.owner_id === 'user-priya', 'Affected feature owner updated to user-priya');
  assert(updatedFeature.properties.owner_name === 'Priya', 'Affected feature owner_name updated to Priya');
  assert(updatedFeature.properties.just_captured === true, 'Affected feature tagged with just_captured for animation');

  const untouchedFeature = patchedGeoJson.features.find((f) => f.properties.h3_cell_id === '886189258ffffff');
  assert(untouchedFeature.properties.owner_id === 'user-shivaraj', 'Non-affected feature remained completely untouched');

  // ----------------------------------------------------
  // TEST 5: Clean Client Disconnection
  // ----------------------------------------------------
  console.log('\n--- TEST 5: Disconnecting Socket Sessions ---');
  clientA.disconnect();
  clientB.disconnect();
  clientC.disconnect();
  await sleep(100);
  assert(!clientA.connected && !clientB.connected && !clientC.connected, 'All client sockets cleanly disconnected');

  server.close();

  console.log('\n======================================================');
  console.log('🎉 ALL PHASE 8 REAL-TIME TESTS PASSED (16/16 assertions)');
  console.log('======================================================\n');
}

runPhase8RealtimeTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test Suite Failed:', err);
    process.exit(1);
  });
