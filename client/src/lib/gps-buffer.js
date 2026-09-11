const BUFFER_STORAGE_KEY = 'geofit_active_workout_buffer';

export const GpsBuffer = {
  saveActivitySnapshot({ activityId, userId, type, startedAt, points, status = 'ACTIVE' }) {
    if (typeof window === 'undefined') return;
    try {
      const data = {
        activityId,
        userId,
        type,
        startedAt,
        points: points || [],
        status,
        lastUpdatedAt: Date.now(),
      };
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to buffer GPS workout to storage:', err);
    }
  },

  appendPoint(point) {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(BUFFER_STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      data.points = data.points || [];
      data.points.push(point);
      data.lastUpdatedAt = Date.now();
      localStorage.setItem(BUFFER_STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Failed to append GPS point to buffer:', err);
    }
  },

  getBufferedActivity() {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(BUFFER_STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (Date.now() - (data.lastUpdatedAt || 0) > 24 * 3600 * 1000) {
        this.clearBuffer();
        return null;
      }
      return data;
    } catch (err) {
      return null;
    }
  },

  clearBuffer() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(BUFFER_STORAGE_KEY);
    } catch (err) {}
  },
};
