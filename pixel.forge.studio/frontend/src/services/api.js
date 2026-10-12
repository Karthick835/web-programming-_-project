import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5555/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pf_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: automatically remove expired token on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && (
      error.response?.data?.error?.includes('expired') ||
      error.response?.data?.error?.includes('Session expired')
    )) {
      localStorage.removeItem('pf_token');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getProfile: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
  changePassword: (currentPassword, newPassword) =>
    api.put('/auth/change-password', { currentPassword, newPassword })
};

export const contentAPI = {
  // Games
  getGames: (params) => api.get('/content/games', { params }),
  getGame: (idOrSlug) => api.get(`/content/games/${idOrSlug}`),
  createGame: (data) => api.post('/content/games', data),
  updateGame: (id, data) => api.put(`/content/games/${id}`, data),
  deleteGame: (id) => api.delete(`/content/games/${id}`),
  uploadImage: (formData) => api.post('/content/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),

  // Team
  getTeam: () => api.get('/content/team'),
  createTeamMember: (data) => api.post('/content/team', data),
  updateTeamMember: (id, data) => api.put(`/content/team/${id}`, data),
  deleteTeamMember: (id) => api.delete(`/content/team/${id}`),

  // Jobs
  getJobs: (params) => api.get('/content/jobs', { params }),
  createJob: (data) => api.post('/content/jobs', data),
  updateJob: (id, data) => api.put(`/content/jobs/${id}`, data),
  deleteJob: (id) => api.delete(`/content/jobs/${id}`),

  // Messages
  sendMessage: (data) => api.post('/content/messages', data),
  getMessages: (params) => api.get('/content/messages', { params }),
  updateMessageStatus: (id, status) => api.put(`/content/messages/${id}/status`, { status }),
  deleteMessage: (id) => api.delete(`/content/messages/${id}`),
  loadSampleMessages: () => api.post('/content/messages/sample'),
  clearSampleMessages: () => api.delete('/content/messages/sample'),

  // Applications
  submitApplication: (data) => api.post('/content/applications', data),
  getApplications: () => api.get('/content/applications'),
  updateApplicationStatus: (id, status) => api.put(`/content/applications/${id}/status`, { status }),

  // Devlogs
  getDevlogs: (params) => api.get('/content/devlogs', { params }),
  getDevlogsAdmin: (params) => api.get('/content/devlogs/admin', { params }),
  getDevlog: (slug) => api.get(`/content/devlogs/${slug}`),
  createDevlog: (data) => api.post('/content/devlogs', data),
  updateDevlog: (id, data) => api.put(`/content/devlogs/${id}`, data),
  deleteDevlog: (id) => api.delete(`/content/devlogs/${id}`)
};

export const visitorAPI = {
  identify: (data) => api.post('/visitor/identify', data),
  getProfiles: (params) => api.get('/visitor/profiles', { params }),
  getProfileTimeline: (id) => api.get(`/visitor/profiles/${id}`)
};

export const analyticsAPI = {
  sendEvents: (events) => api.post('/analytics/events', { events }),
  getOverview: (includeSimulated = false) => api.get('/analytics/overview', { params: { include_simulated: includeSimulated } }),
  getTimeline: (days = 7, includeSimulated = false) => api.get('/analytics/timeline', { params: { days, include_simulated: includeSimulated } }),
  getPages: (includeSimulated = false) => api.get('/analytics/pages', { params: { include_simulated: includeSimulated } }),
  getDevices: (includeSimulated = false) => api.get('/analytics/devices', { params: { include_simulated: includeSimulated } }),
  getFunnel: (includeSimulated = false) => api.get('/analytics/funnel', { params: { include_simulated: includeSimulated } }),
  getRealtimeStream: (includeSimulated = false) => api.get('/analytics/realtime-stream', { params: { include_simulated: includeSimulated } }),
  simulateTraffic: (count = 25) => api.post('/analytics/simulate', { count }),
  clearSimulatedTraffic: () => api.delete('/analytics/simulated'),

  // Feature 1: Steam Tracking funnel & per-game stats
  getSteamFunnel: (includeSimulated = false) =>
    api.get('/analytics/funnel/steam', { params: { include_simulated: includeSimulated } }),
  getGamesSteamStats: (includeSimulated = false) =>
    api.get('/analytics/games/steam', { params: { include_simulated: includeSimulated } }),
  simulateSteamTraffic: () => api.post('/analytics/simulate/steam'),
  getClicksPerStore: (includeSimulated = false) => api.get('/analytics/clicks-per-store', { params: { include_simulated: includeSimulated } })
};

export const abAPI = {
  getAssignment: (expKey, visitorId, force = null) => api.get(`/ab/assignment/${expKey}`, { params: { visitorId, force } }),
  convert: (expKey, visitorId, goalEvent, isForced = false) => api.post('/ab/convert', { expKey, visitorId, goalEvent, is_forced: isForced }),
  getExperiments: (includeSimulated = false) => api.get('/ab/experiments', { params: { include_simulated: includeSimulated } }),
  createExperiment: (data) => api.post('/ab/experiments', data),
  updateStatus: (id, status, winnerVariant) => api.put(`/ab/experiments/${id}/status`, { status, winner_variant: winnerVariant }),
  deleteExperiment: (id) => api.delete(`/ab/experiments/${id}`),

  // Feature 2: Public variant assignment (no auth needed)
  getPublicAssignment: (expKey, visitorId) =>
    api.get(`/ab/assign/${expKey}`, { params: { visitorId } }),
  simulateGameCardTraffic: () => api.post('/ab/simulate/game-card')
};

export const pilotAPI = {
  claim: (data) => api.post('/pilot/claim', data),
  restore: (data) => api.post('/pilot/restore', data),
  sendMagicLink: (email) => api.post('/pilot/magic-link', { email }),
  restoreToken: (data) => api.post('/pilot/restore-token', data),
  getMe: (visitorId) => api.get('/pilot/me', { params: { visitor_id: visitorId } }),
  generateNewCode: (data) => api.post('/pilot/generate-new-code', data),
  unlinkDevice: (deviceId, visitorId) => api.delete(`/pilot/devices/${deviceId}`, { params: { visitor_id: visitorId } }),
  updatePreferences: (data) => api.put('/pilot/preferences', data),
  deleteProfile: (data) => api.delete('/pilot/me', { data })
};

export default api;
