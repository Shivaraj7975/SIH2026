import { query } from '../src/config/database.js';

async function resetTerritory() {
  console.log('🔄 Clearing all territory hexes and conquest history...');
  await query('DELETE FROM territory_history');
  await query('DELETE FROM territory_cells');
  console.log('✅ All territory hexes have been completely cleared from the database!');
  process.exit(0);
}

resetTerritory().catch((err) => {
  console.error('❌ Error resetting territory:', err);
  process.exit(1);
});
