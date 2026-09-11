import { Router } from 'express';
import * as h3 from 'h3-js';
import { TerritoryRepository } from '../repositories/territory.repository.js';
import { H3_DEFAULT_RESOLUTION, h3ToGeoJsonFeature, getUserColor } from '../spatial/spatial.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const cells = await TerritoryRepository.findAllCurrentCells();

    const features = [];
    for (const cell of cells) {
      try {
        const resLevel = h3.getResolution(cell.h3CellId);
        if (resLevel !== H3_DEFAULT_RESOLUTION) {
          continue; // Discard older oversized legacy hexagons
        }
      } catch (e) {
        continue;
      }

      const feat = h3ToGeoJsonFeature(cell.h3CellId, {
        owner_id: cell.currentOwnerId,
        owner_name: cell.ownerDisplayName,
        owner_avatar: cell.ownerAvatar,
        owner_color: getUserColor(cell.currentOwnerId),
        last_captured: cell.lastCapturedAt,
        updated_at: cell.currentOwnerUpdatedAt,
      });
      if (feat) features.push(feat);
    }

    const geojson = {
      type: 'FeatureCollection',
      features,
    };

    res.json({
      success: true,
      data: geojson,
      cellCount: features.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:cellId', async (req, res, next) => {
  try {
    const { cellId } = req.params;
    const cell = await TerritoryRepository.findCellById(cellId);
    if (!cell) {
      return res.status(404).json({ success: false, error: 'Cell not found' });
    }

    const history = await TerritoryRepository.findHistoryByCellId(cellId);

    res.json({
      success: true,
      cell,
      history,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
