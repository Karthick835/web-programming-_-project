import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import GameModal from './components/GameModal';
import ExperimentInspector from './components/ExperimentInspector';
import CookieBanner from './components/CookieBanner';
import WelcomeBackToast from './components/WelcomeBackToast';
import ClaimPilotModal from './components/ClaimPilotModal';

import HomePage from './pages/HomePage';
import GamesPage from './pages/GamesPage';
import DevlogsPage from './pages/DevlogsPage';
import DevlogPage from './pages/DevlogPage';
import PilotPage from './pages/PilotPage';
import RestorePage from './pages/RestorePage';
import AboutPage from './pages/AboutPage';
import TeamPage from './pages/TeamPage';
import CareersPage from './pages/CareersPage';
import ContactPage from './pages/ContactPage';
import NotFoundPage from './pages/NotFoundPage';

import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import SteamFunnelPage from './pages/admin/SteamFunnelPage';
import AdminVisitors from './pages/admin/AdminVisitors';
import AdminExperiments from './pages/admin/AdminExperiments';
import AdminGames from './pages/admin/AdminGames';
import AdminDevlogs from './pages/admin/AdminDevlogs';
import AdminTeam from './pages/admin/AdminTeam';
import AdminJobs from './pages/admin/AdminJobs';
import AdminMessages from './pages/admin/AdminMessages';
import AdminApplications from './pages/admin/AdminApplications';

import { useAuth } from './context/AuthContext';
import { contentAPI, abAPI, pilotAPI } from './services/api';
import { getVisitorId, trackEvent, initGlobalTracking, identifyVisitor } from './services/tracker';

const VALID_PAGES = ['home', 'games', 'devlogs', 'pilot', 'restore', 'about', 'team', 'careers', 'contact', 'admin'];

function parseRoute(pathname) {
  const clean = pathname.replace(/^\/+|\/+$/g, '');
  if (!clean || clean === '') return { page: 'home', slug: null };
  const lower = clean.toLowerCase();
  if (lower.startsWith('admin')) return { page: 'admin', slug: null };
  if (lower === 'devlogs') return { page: 'devlogs', slug: null };
  if (lower.startsWith('devlog/')) {
    const slug = clean.substring('devlog/'.length);
    return { page: 'devlog', slug };
  }
  if (lower === 'pilot') return { page: 'pilot', slug: null };
  if (lower === 'restore') return { page: 'restore', slug: null };
  if (VALID_PAGES.includes(lower)) return { page: lower, slug: null };
  return { page: '404', slug: null };
}

function pageToPath(page, slug = null) {
  if (page === 'home') return '/';
  if (page === 'devlog' && slug) return `/devlog/${slug}`;
  return `/${page}`;
}

export default function App() {
  const initialRoute = parseRoute(window.location.pathname);
  const [activePage, setActivePage] = useState(initialRoute.page);
  const [activeSlug, setActiveSlug] = useState(initialRoute.slug);
  const [adminActiveTab, setAdminActiveTab] = useState('analytics');
  const [scanlinesEnabled, setScanlinesEnabled] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);
  const [visitInfo, setVisitInfo] = useState(null);

  // Pilot Pass state
  const [claimedPilot, setClaimedPilot] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [wishlist, setWishlist] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pf_wishlist') || '[]');
    } catch {
      return [];
    }
  });

  // Content state loaded from backend
  const [games, setGames] = useState([]);
  const [team, setTeam] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loadingContent, setLoadingContent] = useState(true);

  // A/B Test state
  const [activeExperiment, setActiveExperiment] = useState(null);
  const [currentVariant, setCurrentVariant] = useState('A');
  const [abConfig, setAbConfig] = useState(null);

  const { user } = useAuth();

  // Navigation handler with browser history pushState
  const navigateTo = (page, slug = null, replace = false) => {
    setActivePage(page);
    setActiveSlug(slug);
    const path = pageToPath(page, slug);
    if (window.location.pathname !== path) {
      if (replace) {
        window.history.replaceState({}, '', path);
      } else {
        window.history.pushState({}, '', path);
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Browser back / forward buttons handler
  useEffect(() => {
    const handlePopState = () => {
      const { page, slug } = parseRoute(window.location.pathname);
      setActivePage(page);
      setActiveSlug(slug);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 1. Initial Content Fetching
  const loadAllContent = async () => {
    try {
      const [gamesRes, teamRes, jobsRes] = await Promise.all([
        contentAPI.getGames(),
        contentAPI.getTeam(),
        contentAPI.getJobs({ activeOnly: 'false' })
      ]);
      setGames(gamesRes.data.games || []);
      setTeam(teamRes.data.team || []);
      setJobs(jobsRes.data.jobs || []);
    } catch (err) {
      console.error('Failed to load portfolio content:', err);
    } finally {
      setLoadingContent(false);
    }
  };

  // 2. Load Pilot Profile
  const loadPilotProfile = async () => {
    const visitorId = getVisitorId();
    try {
      const res = await pilotAPI.getMe(visitorId);
      if (res.data?.claimed && res.data.profile) {
        setClaimedPilot(res.data.profile);
        if (Array.isArray(res.data.profile.wishlist)) {
          setWishlist(res.data.profile.wishlist);
          localStorage.setItem('pf_wishlist', JSON.stringify(res.data.profile.wishlist));
        }
        if (res.data.profile.preferences?.scanlines !== undefined) {
          setScanlinesEnabled(Boolean(res.data.profile.preferences.scanlines));
        }
      } else {
        setClaimedPilot(null);
      }
    } catch (_) {}
  };

  // Wishlist toggle handler
  const handleToggleWishlist = async (gameId) => {
    const next = wishlist.includes(gameId)
      ? wishlist.filter(id => id !== gameId)
      : [...wishlist, gameId];
    setWishlist(next);
    localStorage.setItem('pf_wishlist', JSON.stringify(next));

    const visitorId = getVisitorId();
    if (claimedPilot) {
      try {
        await pilotAPI.updatePreferences({ visitor_id: visitorId, wishlist: next });
      } catch (_) {}
    }
    if (!wishlist.includes(gameId)) {
      trackEvent('wishlist_add', window.location.pathname, {
        game_id: gameId
      });
    }
    trackEvent('click', window.location.pathname, {
      action: wishlist.includes(gameId) ? 'remove_wishlist' : 'add_wishlist',
      game_id: gameId
    });
  };

  // 3. A/B Testing Assignment
  const loadABAssignment = async () => {
    const visitorId = getVisitorId();
    try {
      const res = await abAPI.getAssignment('hero_cta_text', visitorId);
      if (res.data) {
        setActiveExperiment(res.data.experiment);
        setCurrentVariant(res.data.variant || 'A');
        if (res.data.config) {
          setAbConfig(res.data.config);
        }
      }
    } catch (err) {
      console.warn('A/B engine unreachable, engaging default fallback:', err);
      setCurrentVariant('A');
      setAbConfig({
        ctaText: 'PLAY OUR GAMES',
        heroSubtitle: 'Crafting transcendent pixel-art masterpieces and adrenaline-fueled indie experiences.',
        badgeText: '🔥 NEW RELEASE: CYBERVANGUARD 2099',
        accentColor: 'cyan'
      });
    }
  };

  // Run on mount
  useEffect(() => {
    loadAllContent();
    loadPilotProfile();
    initGlobalTracking();

    const doIdentify = async () => {
      const info = await identifyVisitor(window.location.pathname);
      if (info) {
        setVisitInfo(info);
      }
      loadABAssignment();
    };

    doIdentify();
  }, []);

  // Track page navigation changes
  useEffect(() => {
    const path = pageToPath(activePage, activeSlug);
    trackEvent('page_view', path, { page: activePage, slug: activeSlug });
  }, [activePage, activeSlug]);

  // Handle forcing variant from developer HUD
  const handleForceVariant = async (variant) => {
    setCurrentVariant(variant);
    const visitorId = getVisitorId();
    try {
      const res = await abAPI.getAssignment('hero_cta_text', visitorId, variant);
      if (res.data?.config) {
        setAbConfig(res.data.config);
      }
    } catch (_) {
      if (variant === 'A') {
        setAbConfig({
          ctaText: 'PLAY OUR GAMES',
          heroSubtitle: 'Crafting transcendent pixel-art masterpieces and adrenaline-fueled indie experiences.',
          badgeText: '🔥 NEW RELEASE: CYBERVANGUARD 2099',
          accentColor: 'cyan'
        });
      } else {
        setAbConfig({
          ctaText: 'EXPLORE THE STUDIO',
          heroSubtitle: 'Where retro arcade passion meets next-generation indie gaming innovation.',
          badgeText: '🚀 DISCOVER OUR WORLDS',
          accentColor: 'magenta'
        });
      }
    }
  };

  // Handle conversion trigger
  const handleABConversion = async (goalEvent = 'cta_click_games') => {
    try {
      const visitorId = getVisitorId();
      await abAPI.convert('hero_cta_text', visitorId, goalEvent);
    } catch (err) {
      console.error('Conversion log error:', err);
    }
  };

  // Handle Admin view rendering
  if (activePage === 'admin') {
    if (!user) {
      return (
        <div className={`min-h-screen ${scanlinesEnabled ? 'scanlines' : ''}`}>
          <Navbar
            activePage={activePage}
            setActivePage={(p) => navigateTo(p)}
            scanlinesEnabled={scanlinesEnabled}
            setScanlinesEnabled={setScanlinesEnabled}
            pilotCallsign={claimedPilot?.callsign}
            onOpenClaimPilot={() => setClaimModalOpen(true)}
          />
          <main className="max-w-7xl mx-auto px-4 py-8">
            <AdminLogin
              onLoginSuccess={() => navigateTo('admin')}
              onCancel={() => navigateTo('home')}
            />
          </main>
          <Footer
            setActivePage={(p) => navigateTo(p)}
            onOpenClaimPilot={() => setClaimModalOpen(true)}
          />
        </div>
      );
    }

    return (
      <div className={`min-h-screen ${scanlinesEnabled ? 'scanlines' : ''}`}>
        <AdminLayout
          activeTab={adminActiveTab}
          setActiveTab={setAdminActiveTab}
          onExitAdmin={() => navigateTo('home')}
        >
          {adminActiveTab === 'analytics' && <AdminDashboard />}
          {adminActiveTab === 'steam' && <SteamFunnelPage />}
          {adminActiveTab === 'visitors' && <AdminVisitors />}
          {adminActiveTab === 'experiments' && <AdminExperiments />}
          {adminActiveTab === 'games' && <AdminGames games={games} onReload={loadAllContent} />}
          {adminActiveTab === 'devlogs' && <AdminDevlogs games={games} />}
          {adminActiveTab === 'team' && <AdminTeam team={team} onReload={loadAllContent} />}
          {adminActiveTab === 'jobs' && <AdminJobs jobs={jobs} onReload={loadAllContent} />}
          {adminActiveTab === 'messages' && <AdminMessages />}
          {adminActiveTab === 'applications' && <AdminApplications />}
        </AdminLayout>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col justify-between ${scanlinesEnabled ? 'scanlines' : ''}`}>
      {/* 1. Sticky Navigation */}
      <Navbar
        activePage={activePage}
        setActivePage={(p) => navigateTo(p)}
        scanlinesEnabled={scanlinesEnabled}
        setScanlinesEnabled={setScanlinesEnabled}
        pilotCallsign={claimedPilot?.callsign}
        onOpenClaimPilot={() => setClaimModalOpen(true)}
      />

      {/* 2. Welcome Back Banner for Returning Visitors */}
      <WelcomeBackToast
        visitInfo={visitInfo}
        isPilotClaimed={Boolean(claimedPilot)}
        onClaimPilot={() => setClaimModalOpen(true)}
      />

      {/* 3. Main Viewport */}
      <main className="flex-1">
        {activePage === 'home' && (
          <HomePage
            games={games}
            onSelectGame={(g) => setSelectedGame(g)}
            setActivePage={(p) => navigateTo(p)}
            abConfig={abConfig}
            currentVariant={currentVariant}
            onABConversion={handleABConversion}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
            onSelectDevlog={(slug) => navigateTo('devlog', slug)}
          />
        )}

        {activePage === 'games' && (
          <GamesPage
            games={games}
            onSelectGame={(g) => setSelectedGame(g)}
            wishlist={wishlist}
            onToggleWishlist={handleToggleWishlist}
          />
        )}

        {activePage === 'devlogs' && (
          <DevlogsPage
            onNavigate={(page, slug) => navigateTo(page, slug)}
          />
        )}

        {activePage === 'devlog' && (
          <DevlogPage
            slug={activeSlug}
            onNavigate={(page, slug) => navigateTo(page, slug)}
          />
        )}

        {activePage === 'pilot' && (
          <PilotPage
            onNavigate={(p) => navigateTo(p)}
            games={games}
            scanlinesEnabled={scanlinesEnabled}
            setScanlinesEnabled={setScanlinesEnabled}
            onSelectGame={(g) => setSelectedGame(g)}
          />
        )}

        {activePage === 'restore' && (
          <RestorePage
            onNavigate={(p) => navigateTo(p)}
            onProfileRestored={() => loadPilotProfile()}
          />
        )}

        {activePage === 'about' && (
          <AboutPage setActivePage={(p) => navigateTo(p)} />
        )}

        {activePage === 'team' && (
          <TeamPage team={team} />
        )}

        {activePage === 'careers' && (
          <CareersPage jobs={jobs.filter(j => j.is_active)} />
        )}

        {activePage === 'contact' && (
          <ContactPage />
        )}

        {activePage === '404' && (
          <NotFoundPage onNavigateHome={() => navigateTo('home')} />
        )}
      </main>

      {/* 4. Global Footer */}
      <Footer
        setActivePage={(p) => navigateTo(p)}
        onOpenClaimPilot={() => setClaimModalOpen(true)}
      />

      {/* 5. Dossier Game Modal */}
      {selectedGame && (
        <GameModal
          game={selectedGame}
          onClose={() => setSelectedGame(null)}
          isWishlisted={wishlist.includes(selectedGame.id)}
          onToggleWishlist={handleToggleWishlist}
          onNavigateDevlog={(slug) => navigateTo('devlog', slug)}
        />
      )}

      {/* 6. Claim Pilot Pass Modal */}
      <ClaimPilotModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        onSuccess={() => {
          loadPilotProfile();
          navigateTo('pilot');
        }}
        initialPreferences={{ scanlines: scanlinesEnabled }}
        initialWishlist={wishlist}
      />

      {/* 7. Cookie & Privacy Notice */}
      <CookieBanner />

      {/* 8. Floating Developer / Live Testing HUD */}
      <ExperimentInspector
        activeExperiment={activeExperiment}
        currentVariant={currentVariant}
        onForceVariant={handleForceVariant}
        onReloadExperiment={loadABAssignment}
        isAdmin={Boolean(user)}
        visitInfo={visitInfo}
        claimedPilot={claimedPilot}
      />
    </div>
  );
}
