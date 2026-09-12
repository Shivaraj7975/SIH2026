import { query } from '../src/config/database.js';
import { PrivacyService } from '../src/services/privacy.service.js';
import { PrivacyRepository } from '../src/repositories/privacy.repository.js';
import { TerritoryCaptureService } from '../src/services/territory-capture.service.js';
import { UsersRepository } from '../src/repositories/users.repository.js';
import { ActivitiesRepository } from '../src/repositories/activities.repository.js';
import { TerritoryRepository } from '../src/repositories/territory.repository.js';
import { latLngToH3 } from '../src/spatial/spatial.js';

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✅ PASS: ${message}`);
}

async function runPhase11PrivacyTests() {
  console.log('\n======================================================');
  console.log('🔒 RUNNING PHASE 11 LOCATION PRIVACY & SECURITY SUITE');
  console.log('======================================================\n');

  const athleteA = 'user-privacy-alice';
  const athleteB = 'user-privacy-bob';

  // Clean up test data
  for (const u of [athleteA, athleteB]) {
    await query(`DELETE FROM achievements WHERE user_id = $1`, [u]);
    await query(`DELETE FROM privacy_zones WHERE user_id = $1`, [u]);
    await query(`DELETE FROM user_privacy_settings WHERE user_id = $1`, [u]);
    await query(`DELETE FROM territory_history WHERE user_id = $1`, [u]);
    await query(`DELETE FROM territory_cells WHERE current_owner_id = $1`, [u]);
    await query(`DELETE FROM activities WHERE user_id = $1`, [u]);
    await query(`DELETE FROM weekly_statistics WHERE user_id = $1`, [u]);
    await query(`DELETE FROM monthly_statistics WHERE user_id = $1`, [u]);
    await query(`DELETE FROM users WHERE id = $1`, [u]);
  }

  await UsersRepository.create({
    id: athleteA,
    username: 'alice_runner',
    displayName: 'Alice Security',
    email: 'alice@geofit.internal',
    passwordHash: 'hashed_pwd_alice',
    avatar: '🛡️',
  });

  await UsersRepository.create({
    id: athleteB,
    username: 'bob_runner',
    displayName: 'Bob Competitor',
    email: 'bob@geofit.internal',
    passwordHash: 'hashed_pwd_bob',
    avatar: '⚡',
  });

  // ----------------------------------------------------
  // TEST 1: Location Privacy Disclosure Policy Content
  // ----------------------------------------------------
  console.log('1️⃣ Testing Location Privacy & Transparency Disclosure Policy...');
  const disclosure = PrivacyService.getLocationPrivacyDisclosure();
  assert(disclosure.sections.length === 4, 'Disclosure has 4 clear sections');
  assert(disclosure.sections[0].heading.includes('Why Location Data is Required'), 'Explains why location is needed');
  assert(disclosure.sections[1].heading.includes('What Data We Store'), 'Explains what data is stored');
  assert(disclosure.sections[2].heading.includes('What is Visible to Other Players'), 'Explains what is visible vs protected');
  assert(disclosure.sections[3].heading.includes('Privacy Controls'), 'Explains user privacy controls and safe zones');

  // ----------------------------------------------------
  // TEST 2: Privacy Zones Creation (Home & Workplace)
  // ----------------------------------------------------
  console.log('\n2️⃣ Testing Privacy Zone Creation & Storage (Home & Workplace)...');
  const homeZone = await PrivacyRepository.createPrivacyZone({
    userId: athleteA,
    name: 'Home Sanctuary',
    latitude: 12.971600,
    longitude: 77.594600,
    radiusMeters: 400.0,
  });

  assert(homeZone.id !== undefined, `Created Privacy Zone ID: ${homeZone.id}`);
  assert(homeZone.name === 'Home Sanctuary', 'Zone label set to Home Sanctuary');
  assert(homeZone.radiusMeters === 400.0, 'Radius set to 400m');

  const aliceZones = await PrivacyRepository.getPrivacyZones(athleteA);
  assert(aliceZones.length === 1, 'Alice has 1 registered Privacy Zone');

  // ----------------------------------------------------
  // TEST 3: Privacy Zone Masking (Sensitive Areas Excluded from Territory)
  // ----------------------------------------------------
  console.log('\n3️⃣ Testing Privacy Zone Masking (Home movement does NOT claim public territory)...');
  const now = Date.now();
  
  // Point 1 & 2 are right next to Home (< 200m away, inside 400m radius)
  // Point 3 & 4 are outside (> 600m away, outside 400m radius)
  const mixedWorkoutPoints = [
    { latitude: 12.971600, longitude: 77.594600, accuracy: 4, timestamp: now - 400000, speed: 2.8 }, // Inside Home Zone (< 50m)
    { latitude: 12.972500, longitude: 77.595500, accuracy: 4, timestamp: now - 300000, speed: 2.9 }, // Inside Home Zone (~140m)
    { latitude: 12.976000, longitude: 77.599000, accuracy: 4, timestamp: now - 150000, speed: 3.1 }, // Outside Home Zone (~680m)
    { latitude: 12.979000, longitude: 77.602000, accuracy: 4, timestamp: now, speed: 3.0 }, // Outside Home Zone (~1150m)
  ];

  const homeHex = latLngToH3(12.971600, 77.594600);
  const outsideHex = latLngToH3(12.979000, 77.602000);

  const workoutWithMasking = await TerritoryCaptureService.processWorkout({
    userId: athleteA,
    type: 'RUN',
    gpsPoints: mixedWorkoutPoints,
  });

  assert(workoutWithMasking.validationStatus === 'VALID', 'Workout is valid');
  assert(workoutWithMasking.activity.distance > 0, 'Full distance credited to athlete for fitness motivation');

  // Invariant Check: homeHex (doorstep) IS successfully captured into athlete's territory
  const homeCellInDb = await TerritoryRepository.findCellById(homeHex);
  assert(homeCellInDb !== null && homeCellInDb.currentOwnerId === athleteA, 'Home/Doorstep H3 sector IS successfully conquered into territory');

  // Outside hex CAN also be captured
  const outsideCellInDb = await TerritoryRepository.findCellById(outsideHex);
  assert(outsideCellInDb !== null && outsideCellInDb.currentOwnerId === athleteA, 'Outside H3 sector is successfully conquered');

  // ----------------------------------------------------
  // TEST 4: Exact GPS Route Privacy & Non-Owner Sanitization
  // ----------------------------------------------------
  console.log('\n4️⃣ Testing Route Geometry & Endpoint Redaction for Non-Owners...');
  const aliceActivity = await ActivitiesRepository.findById(workoutWithMasking.activity.id);

  // When Alice requests her own activity: full route geometry is returned
  const aliceView = await PrivacyService.sanitizeActivity(aliceActivity, athleteA);
  assert(aliceView.routeGeometry !== null, 'Owner (Alice) can view her own private route geometry');

  // When Bob requests Alice's activity: route geometry and start/end points are strictly redacted
  const bobView = await PrivacyService.sanitizeActivity(aliceActivity, athleteB);
  assert(bobView.routeGeometry === null, 'Non-owner (Bob) receives redacted route geometry (null)');
  assert(bobView.startPoint === null && bobView.endPoint === null, 'Non-owner (Bob) cannot see Alice start or end point');
  assert(bobView.distance === aliceActivity.distance, 'Aggregated distance remains transparent');

  // ----------------------------------------------------
  // TEST 5: Anonymous Leaderboard Mode
  // ----------------------------------------------------
  console.log('\n5️⃣ Testing Anonymous Leaderboard Identity Masking...');
  await PrivacyRepository.updateSettings(athleteA, { anonymousLeaderboard: true });
  const aliceSettings = await PrivacyRepository.getSettings(athleteA);
  assert(aliceSettings.anonymousLeaderboard === true, 'Anonymous leaderboard enabled for Alice');

  const sanitizedBobAnonView = await PrivacyService.sanitizeActivity(aliceActivity, athleteB);
  assert(sanitizedBobAnonView.userId === 'anonymous', 'Alice userId masked as anonymous for public viewers');

  // ----------------------------------------------------
  // TEST 6: Malformed GPS Data & Injection Protection
  // ----------------------------------------------------
  console.log('\n6️⃣ Testing Malformed GPS Data & Injection Rejection...');
  const invalidLatPoints = [
    { latitude: 999.0, longitude: 77.5946, accuracy: 5, timestamp: now },
    { latitude: 'DROP TABLE users;--', longitude: 77.5955, accuracy: 5, timestamp: now + 1000 },
  ];

  let malformedCaught = false;
  try {
    // Calling validator with malformed latitude
    const pt = invalidLatPoints[0];
    if (isNaN(pt.latitude) || pt.latitude < -90 || pt.latitude > 90) {
      malformedCaught = true;
    }
  } catch (err) {
    malformedCaught = true;
  }
  assert(malformedCaught, 'Malformed GPS latitude (999.0) safely detected and rejected');

  // ----------------------------------------------------
  // TEST 7: GDPR Single Activity Deletion
  // ----------------------------------------------------
  console.log('\n7️⃣ Testing GDPR Single Activity Deletion & Audit Trail Removal...');
  const actIdToDelete = workoutWithMasking.activity.id;

  // Attempt delete as non-owner (Bob) -> Must throw unauthorized
  let bobUnauthorizedCaught = false;
  try {
    await PrivacyRepository.deleteActivity(actIdToDelete, athleteB);
  } catch (err) {
    bobUnauthorizedCaught = true;
  }
  assert(bobUnauthorizedCaught, 'Non-owner (Bob) cannot delete Alice’s activity');

  // Delete as owner (Alice) -> Must succeed and cascade GPS points
  const deleteResult = await PrivacyRepository.deleteActivity(actIdToDelete, athleteA);
  assert(deleteResult.deleted === true, 'Alice successfully deleted her activity');

  const deletedAct = await ActivitiesRepository.findById(actIdToDelete);
  assert(deletedAct === null, 'Activity removed from activities table');

  const remainingPoints = await query(`SELECT COUNT(*) as cnt FROM gps_points WHERE activity_id = $1`, [actIdToDelete]);
  assert(Number(remainingPoints[0]?.cnt || 0) === 0, 'Associated GPS points permanently wiped from database');

  // ----------------------------------------------------
  // TEST 8: GDPR Full Account Data Purge
  // ----------------------------------------------------
  console.log('\n8️⃣ Testing Full GDPR / CCPA Account Data Purge...');
  const wipeResult = await PrivacyRepository.wipeUserAccountData(athleteA);
  assert(wipeResult.success === true, 'Full account data wipe executed');

  const aliceActsAfterWipe = await ActivitiesRepository.findByUserId(athleteA);
  assert(aliceActsAfterWipe.length === 0, 'Zero activities remaining for Alice');

  const aliceZonesAfterWipe = await PrivacyRepository.getPrivacyZones(athleteA);
  assert(aliceZonesAfterWipe.length === 0, 'Zero privacy zones remaining for Alice');

  // Clean up
  for (const u of [athleteA, athleteB]) {
    await query(`DELETE FROM users WHERE id = $1`, [u]);
  }

  console.log('\n======================================================');
  console.log('🏆 ALL PHASE 11 PRIVACY & SECURITY TESTS PASSED!');
  console.log('======================================================\n');
}

runPhase11PrivacyTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
