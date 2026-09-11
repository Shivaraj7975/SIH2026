import * as h3 from 'h3-js';
import { getDatabase, initDatabase, query } from '../src/config/database.js';

initDatabase();

async function cleanLegacyCells() {
  const cells = await query('SELECT h3_cell_id FROM territory_cells');
  let deletedCount = 0;

  for (const row of cells) {
    try {
      const res = h3.getResolution(row.h3_cell_id);
      if (res !== 11) {
        await query('DELETE FROM territory_cells WHERE h3_cell_id = $1', [row.h3_cell_id]);
        await query('DELETE FROM territory_history WHERE h3_cell_id = $1', [row.h3_cell_id]);
        deletedCount++;
      }
    } catch (e) {
      await query('DELETE FROM territory_cells WHERE h3_cell_id = $1', [row.h3_cell_id]);
      deletedCount++;
    }
  }

  console.log(`🧹 Cleaned ${deletedCount} legacy oversized cells from database. Remaining cells are 100% road-width Res 11.`);
  process.exit(0);
}

cleanLegacyCells().catch((err) => {
  console.error('Error cleaning legacy cells:', err);
  process.exit(1);
});
