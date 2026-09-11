const API_BASE = '/api';

export async function apiRequest(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const defaultHeaders = {
    'Content-Type': 'application/json',
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    credentials: 'include', // Forward geofit_token cookie
  };

  if (config.body && typeof config.body === 'object') {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! status: ${response.status}`);
  }

  return data;
}

export const api = {
  get: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'GET' }),
  post: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'POST', body }),
  put: (endpoint, body, options) => apiRequest(endpoint, { ...options, method: 'PUT', body }),
  delete: (endpoint, options) => apiRequest(endpoint, { ...options, method: 'DELETE' }),

  // Domain specific endpoints
  getTerritory: (cellId) => apiRequest(cellId ? `/territory/${cellId}` : '/territory'),
  getChallenges: (userId) => apiRequest(`/challenges?userId=${userId || ''}`),
  getActivities: (userId) => apiRequest(`/activity?userId=${userId || ''}`),
  getActivityById: (id) => apiRequest(`/activity/${id}`),
  submitActivity: (payload) => apiRequest('/activity', { method: 'POST', body: payload }),
  getLeaderboard: (timeframe = 'weekly', sector = 'distance') => apiRequest(`/leaderboard?timeframe=${timeframe}&sector=${sector}`),
  getGamificationStats: (userId) => apiRequest(`/gamification/stats?userId=${userId || ''}`),
  getWeeklySummary: (userId, date) => apiRequest(`/gamification/weekly-summary?userId=${userId || ''}&date=${date || ''}`),
  getMonthlySummary: (userId, date) => apiRequest(`/gamification/monthly-summary?userId=${userId || ''}&date=${date || ''}`),
  getAchievements: (userId) => apiRequest(`/gamification/achievements?userId=${userId || ''}`),
  
  // Hackathon Demo Mode Endpoints
  getDemoState: () => apiRequest('/demo/state'),
  resetDemo: () => apiRequest('/demo/reset', { method: 'POST' }),
  runDemoStep: (stepNumber) => apiRequest(`/demo/step/${stepNumber}`, { method: 'POST' }),
  runDemoFullPlayback: () => apiRequest('/demo/full-playback', { method: 'POST' }),
  getDemoScenarios: () => apiRequest('/demo/state'),
  runScenario: (type, targetUserId) => apiRequest('/demo', { method: 'POST', body: { type, targetUserId } }),

  // Privacy, Safe Zones, and GDPR Compliance
  getPrivacySettings: (userId) => apiRequest(`/privacy/settings?userId=${userId || ''}`),
  updatePrivacySettings: (payload) => apiRequest('/privacy/settings', { method: 'PUT', body: payload }),
  getPrivacyZones: (userId) => apiRequest(`/privacy/zones?userId=${userId || ''}`),
  addPrivacyZone: (payload) => apiRequest('/privacy/zones', { method: 'POST', body: payload }),
  deletePrivacyZone: (zoneId, userId) => apiRequest(`/privacy/zones/${zoneId}?userId=${userId || ''}`, { method: 'DELETE' }),
  getPrivacyDisclosure: () => apiRequest('/privacy/disclosure'),
  deleteActivity: (activityId, userId) => apiRequest(`/activity/${activityId}?userId=${userId || ''}`, { method: 'DELETE' }),
  wipeAccountData: (userId) => apiRequest('/privacy/account-data', { method: 'DELETE', body: { userId } }),
};
