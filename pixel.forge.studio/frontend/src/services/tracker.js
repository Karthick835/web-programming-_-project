import { analyticsAPI, visitorAPI } from './api';

const VISITOR_KEY = 'pf_visitor_id';
const SESSION_KEY = 'pf_session_id';
const LAST_ACTIVITY_KEY = 'pf_last_activity';
const CONSENT_KEY = 'pf_privacy_consent';

const MATCHED_BY_KEY = 'pf_matched_by';

// Check and handle ?dev=1 and ?dev=0 URL params
export function checkDevUrlParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('dev') === '1') {
      localStorage.setItem('pf_dev_mode', 'true');
      params.delete('dev');
      const newQuery = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState({}, '', window.location.pathname + newQuery + window.location.hash);
      return true;
    } else if (params.get('dev') === '0') {
      localStorage.removeItem('pf_dev_mode');
      params.delete('dev');
      const newQuery = params.toString() ? `?${params.toString()}` : '';
      window.history.replaceState({}, '', window.location.pathname + newQuery + window.location.hash);
      return false;
    }
  } catch (_) {}
  return localStorage.getItem('pf_dev_mode') === 'true';
}

// Cookie helpers (1-2 year expiry, SameSite=Lax)
function setCookie(name, value, days = 365) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (_) {}
}

function getCookie(name) {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch (_) {
    return null;
  }
}

function eraseCookie(name) {
  try {
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
  } catch (_) {}
}

// Generate simple string hash
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// Lightweight, privacy-friendly client-side soft fingerprint
export function getSoftFingerprint() {
  try {
    const parts = [
      navigator.userAgent || '',
      navigator.language || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      `${window.screen?.width || 0}x${window.screen?.height || 0}`,
      navigator.platform || ''
    ];
    return 'fp_' + simpleHash(parts.join('|'));
  } catch (_) {
    return 'fp_unknown';
  }
}

// Check Do Not Track or explicit opt-out
export function isTrackingAllowed() {
  const consent = localStorage.getItem(CONSENT_KEY);
  if (consent === 'declined') return false;
  if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return false;
  return true;
}

// Get or create persistent visitor ID with multi-layer sync (cookie + localStorage)
export function getVisitorIdWithSource() {
  if (!isTrackingAllowed()) {
    return { visitorId: 'vis_anonymous_dnt', matchedBy: 'new' };
  }

  let localId = null;
  let cookieId = null;
  const recoveredMatch = localStorage.getItem(MATCHED_BY_KEY);

  try { localId = localStorage.getItem(VISITOR_KEY); } catch (_) {}
  cookieId = getCookie(VISITOR_KEY);

  // Restore across layers if one is wiped
  if (localId && !cookieId) {
    setCookie(VISITOR_KEY, localId, 365);
    return {
      visitorId: localId,
      matchedBy: recoveredMatch === 'recovery_code' ? 'recovery_code' : 'localStorage'
    };
  }
  if (!localId && cookieId) {
    try { localStorage.setItem(VISITOR_KEY, cookieId); } catch (_) {}
    return {
      visitorId: cookieId,
      matchedBy: recoveredMatch === 'recovery_code' ? 'recovery_code' : 'cookie'
    };
  }
  if (localId && cookieId) {
    return {
      visitorId: localId,
      matchedBy: recoveredMatch === 'recovery_code' ? 'recovery_code' : 'cookie'
    };
  }

  // Generate brand new ID
  const newId = 'vis_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  try { localStorage.setItem(VISITOR_KEY, newId); } catch (_) {}
  setCookie(VISITOR_KEY, newId, 365);
  return { visitorId: newId, matchedBy: 'new' };
}

export function getVisitorId() {
  return getVisitorIdWithSource().visitorId;
}

// Set canonical visitor ID from restored Pilot Pass profile
export function setCanonicalVisitorId(canonicalId) {
  if (!canonicalId) return;
  try {
    localStorage.setItem(VISITOR_KEY, canonicalId);
    localStorage.setItem(MATCHED_BY_KEY, 'recovery_code');
  } catch (_) {}
  setCookie(VISITOR_KEY, canonicalId, 365);
}

// Hard reset of test identity (clears cookie, localStorage, and session)
export function resetVisitorIdentity() {
  try { localStorage.removeItem(VISITOR_KEY); } catch (_) {}
  try { localStorage.removeItem(MATCHED_BY_KEY); } catch (_) {}
  try { sessionStorage.removeItem(SESSION_KEY); } catch (_) {}
  try { sessionStorage.removeItem(LAST_ACTIVITY_KEY); } catch (_) {}
  eraseCookie(VISITOR_KEY);

  const newId = 'vis_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  try { localStorage.setItem(VISITOR_KEY, newId); } catch (_) {}
  setCookie(VISITOR_KEY, newId, 365);
  return newId;
}

// Get or rotate session ID (30-min inactivity timeout)
export function getSessionId() {
  const now = Date.now();
  let lastActivity = 0;
  try { lastActivity = parseInt(sessionStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10); } catch (_) {}

  let sid = null;
  try { sid = sessionStorage.getItem(SESSION_KEY); } catch (_) {}

  // If inactive for > 30 mins or no session yet, generate new session
  if (!sid || (lastActivity > 0 && now - lastActivity > 30 * 60 * 1000)) {
    sid = 'ses_' + Math.random().toString(36).substring(2, 10);
    try { sessionStorage.setItem(SESSION_KEY, sid); } catch (_) {}
  }

  try { sessionStorage.setItem(LAST_ACTIVITY_KEY, now.toString()); } catch (_) {}
  return sid;
}

// Identify visitor on backend & sync profile
export async function identifyVisitor(pageUrl = window.location.pathname) {
  if (!isTrackingAllowed()) {
    return { isReturning: false, visitCount: 1, status: 'dnt_anonymous', assignedVariants: {}, matchedBy: 'new' };
  }

  const { visitorId, matchedBy } = getVisitorIdWithSource();
  const sessionId = getSessionId();

  // Deduplicate per session
  const cacheKey = `pf_identified_ses_${sessionId}`;
  try {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (_) {}

  const softFingerprint = getSoftFingerprint();

  const payload = {
    visitor_id: visitorId,
    session_id: sessionId,
    matched_by: matchedBy,
    soft_fingerprint: softFingerprint,
    page_url: pageUrl,
    referrer: document.referrer || 'Direct',
    device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    browser: getBrowserName(),
    os: getOSName(),
    do_not_track: !isTrackingAllowed()
  };

  try {
    const res = await visitorAPI.identify(payload);
    try {
      sessionStorage.setItem(cacheKey, JSON.stringify(res.data));
    } catch (_) {}
    return res.data;
  } catch (err) {
    console.debug('Visitor identify error:', err);
    return {
      visitorId,
      sessionId,
      isReturning: false,
      visitCount: 1,
      matchedBy: matchedBy || 'new',
      status: 'new',
      assignedVariants: {}
    };
  }
}

// Track a custom event
export async function trackEvent(eventType, pageUrl = window.location.pathname, metadata = {}) {
  if (!isTrackingAllowed()) return;

  const visitorId = getVisitorId();
  const sessionId = getSessionId();

  const eventPayload = {
    visitor_id: visitorId,
    session_id: sessionId,
    event_type: eventType,
    page_url: pageUrl,
    referrer: document.referrer || 'Direct',
    device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
    screen_res: `${window.innerWidth}x${window.innerHeight}`,
    browser: getBrowserName(),
    metadata,
    is_forced: metadata.is_forced ? 1 : 0,
    is_simulated: metadata.is_simulated ? 1 : 0
  };

  try {
    await analyticsAPI.sendEvents([eventPayload]);
  } catch (err) {
    console.debug('Analytics beacon error:', err);
  }
}

function getBrowserName() {
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return 'Edge';
  if (/chrome|crios/i.test(ua)) return 'Chrome';
  if (/firefox|fxios/i.test(ua)) return 'Firefox';
  if (/safari/i.test(ua)) return 'Safari';
  return 'Other';
}

function getOSName() {
  const ua = navigator.userAgent;
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Other';
}

// Global click & scroll depth listener initializer
export function initGlobalTracking() {
  let scrollTracked = { 25: false, 50: false, 75: false, 100: false };

  const handleScroll = () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (totalHeight <= 0) return;
    const scrollPercent = (window.scrollY / totalHeight) * 100;

    [25, 50, 75, 100].forEach((threshold) => {
      if (scrollPercent >= threshold && !scrollTracked[threshold]) {
        scrollTracked[threshold] = true;
        trackEvent('scroll_depth', window.location.pathname, { depth: `${threshold}%` });
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  // Dwell heartbeat ping every 25s
  const interval = setInterval(() => {
    trackEvent('heartbeat', window.location.pathname, { dwell: '25s' });
  }, 25000);

  return () => {
    window.removeEventListener('scroll', handleScroll);
    clearInterval(interval);
  };
}
