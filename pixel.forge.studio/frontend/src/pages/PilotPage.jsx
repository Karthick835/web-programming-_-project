import React, { useState, useEffect } from 'react';
import {
  Shield,
  Key,
  Smartphone,
  Laptop,
  Heart,
  Trash2,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowRight,
  ExternalLink,
  Copy,
  Download,
  Check,
  Tv
} from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import Modal from '../components/ui/Modal';
import { pilotAPI } from '../services/api';
import { getVisitorId, trackEvent } from '../services/tracker';

export default function PilotPage({
  onNavigate,
  games = [],
  scanlinesEnabled,
  setScanlinesEnabled,
  onSelectGame
}) {
  const [pilotData, setPilotData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState('');

  // Generate new code modal
  const [rollModalOpen, setRollModalOpen] = useState(false);
  const [currentCodeInput, setCurrentCodeInput] = useState('');
  const [rollLoading, setRollLoading] = useState(false);
  const [newRollCode, setNewRollCode] = useState('');
  const [rollSavedChecked, setRollSavedChecked] = useState(false);
  const [rollCopied, setRollCopied] = useState(false);
  const [rollError, setRollError] = useState('');

  // Delete profile modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteCodeInput, setDeleteCodeInput] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const fetchPilot = async () => {
    setLoading(true);
    const visitorId = getVisitorId();
    try {
      const res = await pilotAPI.getMe(visitorId);
      if (res.data.claimed && res.data.profile) {
        setPilotData(res.data.profile);
      } else {
        setPilotData(null);
      }
    } catch (err) {
      console.error('Failed to load pilot pass:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPilot();
  }, []);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleUnlinkDevice = async (deviceId) => {
    if (!window.confirm('Unlink this device from your Pilot Pass?')) return;
    const visitorId = getVisitorId();
    try {
      await pilotAPI.unlinkDevice(deviceId, visitorId);
      showToast('Device successfully unlinked.');
      fetchPilot();
    } catch {
      alert('Failed to unlink device.');
    }
  };

  const handleTogglePreference = async (key, val) => {
    if (key === 'scanlines') {
      setScanlinesEnabled(val);
    }
    const visitorId = getVisitorId();
    const updatedPrefs = { ...(pilotData?.preferences || {}), [key]: val };
    try {
      await pilotAPI.updatePreferences({
        visitor_id: visitorId,
        preferences: updatedPrefs
      });
      setPilotData(prev => prev ? ({ ...prev, preferences: updatedPrefs }) : prev);
      showToast(`Preference updated.`);
    } catch {
      alert('Failed to save preference.');
    }
  };

  const handleRemoveWishlist = async (gameId) => {
    const visitorId = getVisitorId();
    const nextWishlist = (pilotData?.wishlist || []).filter(id => id !== gameId);
    try {
      await pilotAPI.updatePreferences({
        visitor_id: visitorId,
        wishlist: nextWishlist
      });
      setPilotData(prev => prev ? ({ ...prev, wishlist: nextWishlist }) : prev);
      showToast('Removed from wishlist.');
    } catch {
      alert('Failed to update wishlist.');
    }
  };

  const handleRollCode = async (e) => {
    e.preventDefault();
    setRollError('');
    setRollLoading(true);
    const visitorId = getVisitorId();
    try {
      const res = await pilotAPI.generateNewCode({
        callsign: pilotData.callsign,
        current_recovery_code: currentCodeInput.trim().toUpperCase(),
        visitor_id: visitorId
      });
      setNewRollCode(res.data.newRecoveryCode);
    } catch (err) {
      setRollError(err?.response?.data?.error || 'Verification failed. Please check current recovery code.');
    } finally {
      setRollLoading(false);
    }
  };

  const handleFinishRoll = () => {
    if (!rollSavedChecked) return;
    setRollModalOpen(false);
    setCurrentCodeInput('');
    setNewRollCode('');
    setRollSavedChecked(false);
    showToast('New recovery key activated. Old key has been invalidated.');
  };

  const handleDeleteProfile = async (e) => {
    e.preventDefault();
    if (deleteConfirmText.trim().toUpperCase() !== pilotData.callsign) {
      setDeleteError(`Please type "${pilotData.callsign}" to confirm deletion.`);
      return;
    }
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await pilotAPI.deleteProfile({
        callsign: pilotData.callsign,
        recovery_code: deleteCodeInput.trim().toUpperCase()
      });
      setDeleteModalOpen(false);
      alert('Your Pilot Profile and linked data have been permanently removed.');
      onNavigate('home');
      window.location.reload();
    } catch (err) {
      setDeleteError(err?.response?.data?.error || 'Failed to delete profile. Please check your recovery code.');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container py-24 text-center">
        <p className="font-mono text-xs text-cyan-400 animate-pulse">Scanning Pilot Pass telemetry...</p>
      </div>
    );
  }

  if (!pilotData) {
    return (
      <div className="page-container py-16 text-center space-y-6 max-w-lg mx-auto">
        <div className="p-4 rounded-full bg-cyan-950/60 border border-cyan-500/40 w-16 h-16 mx-auto flex items-center justify-center">
          <Shield className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">NO ACTIVE PILOT PROFILE</h2>
        <p className="text-xs text-slate-300 leading-relaxed">
          Your browser is browsing anonymously. You can claim your Pilot Profile to preserve your data and wishlist, or restore an existing one.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => onNavigate('home')}
            className="w-full sm:w-auto cyber-btn cyber-btn-cyan text-xs py-3 px-6"
          >
            RETURN HOME
          </button>
          <button
            onClick={() => onNavigate('restore')}
            className="w-full sm:w-auto cyber-btn cyber-btn-outline text-xs py-3 px-6"
          >
            RESTORE MY PROFILE
          </button>
        </div>
      </div>
    );
  }

  const wishlistedGames = games.filter(g => (pilotData.wishlist || []).includes(g.id));

  return (
    <div className="page-container py-12 md:py-16 space-y-12">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-6 z-50 bg-[#07080f] border border-cyan-400 text-cyan-300 px-4 py-3 rounded-lg shadow-[0_0_20px_#00f0ff]/30 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Profile Card */}
      <div className="cyber-card p-6 sm:p-8 hud-corner space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-cyan-950/80 border-2 border-cyan-400 flex items-center justify-center text-cyan-300 font-pixel text-xl shadow-[0_0_15px_#00f0ff]/30">
              {pilotData.callsign.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-wide">
                  PILOT: {pilotData.callsign}
                </span>
                <span className="pixel-badge badge-cyan text-[10px]">
                  VERIFIED PASS
                </span>
              </div>
              <div className="text-xs font-mono text-slate-400 mt-1">
                {pilotData.email ? `Linked Email: ${pilotData.email}` : 'No email linked (Restorable via Recovery Key only)'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setRollModalOpen(true)}
              className="cyber-btn cyber-btn-outline text-xs py-2 px-3.5 flex items-center gap-2"
            >
              <Key className="w-3.5 h-3.5 text-cyan-400" />
              GENERATE NEW CODE
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="p-2 rounded bg-red-950/40 hover:bg-red-900 border border-red-500/40 text-red-400 text-xs font-mono transition-colors"
              title="Delete Profile and Data"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Total Visits</span>
            <span className="text-xl font-bold font-mono text-cyan-300">{pilotData.total_visits}</span>
          </div>
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Linked Devices</span>
            <span className="text-xl font-bold font-mono text-pink-400">{pilotData.devices?.length || 1}</span>
          </div>
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Wishlist Titles</span>
            <span className="text-xl font-bold font-mono text-emerald-400">{pilotData.wishlist?.length || 0}</span>
          </div>
          <div className="p-3.5 bg-slate-900/60 rounded border border-slate-800">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">First Identified</span>
            <span className="text-xs font-mono text-slate-300 truncate block mt-1">
              {new Date(pilotData.first_seen).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Honesty Notice */}
        <div className="p-3.5 bg-[#07080f] border border-slate-800 rounded text-xs text-slate-400 leading-relaxed font-sans">
          <span className="text-cyan-400 font-mono font-bold">IDENTITY DISCLOSURE: </span>
          Your browser remembers you automatically via local storage and first-party cookies. Your recovery code lets you restore your profile on a new device or after clearing browser data. Keep it private.
        </div>
      </div>

      {/* Main Grid: Wishlist & Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left (2 cols): Wishlist */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-pixel text-xs text-pink-400 uppercase tracking-wider flex items-center gap-2">
              <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
              YOUR WISHLIST ({wishlistedGames.length})
            </h3>
            <button
              onClick={() => onNavigate('games')}
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              Browse Games <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {wishlistedGames.length === 0 ? (
            <div className="p-8 text-center bg-slate-900/40 rounded-lg border border-slate-800 space-y-3">
              <p className="text-xs text-slate-400">
                You haven't added any game titles to your wishlist yet.
              </p>
              <button
                onClick={() => onNavigate('games')}
                className="cyber-btn cyber-btn-cyan text-xs py-2 px-4"
              >
                EXPLORE GAMES PORTFOLIO
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {wishlistedGames.map(game => (
                <div
                  key={game.id}
                  className="p-4 bg-slate-900/60 rounded-lg border border-slate-800 flex items-center gap-3.5 justify-between group hover:border-slate-700 transition-all"
                >
                  <div
                    onClick={() => onSelectGame && onSelectGame(game)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    {game.banner_img ? (
                      <img src={game.banner_img} alt={game.title} className="w-14 h-10 rounded object-cover border border-slate-800 flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-10 rounded bg-slate-800 flex items-center justify-center text-[10px] text-slate-500 flex-shrink-0 font-mono">GAME</div>
                    )}
                    <div className="min-w-0">
                      <h4 className="font-heading font-bold text-sm text-white truncate group-hover:text-cyan-300 transition-colors">
                        {game.title}
                      </h4>
                      <p className="text-[11px] font-mono text-cyan-400">{game.genre}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleRemoveWishlist(game.id)}
                      className="p-2 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove from Wishlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right (1 col): Linked Devices & Preferences */}
        <div className="space-y-6">
          
          {/* Preferences */}
          <div className="cyber-card p-5 space-y-4">
            <h4 className="font-pixel text-xs text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              DISPLAY PREFERENCES
            </h4>
            <div className="flex items-center justify-between p-3 bg-slate-900/60 rounded border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Tv className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-xs font-bold text-white font-mono">CRT Scanlines Effect</div>
                  <div className="text-[11px] text-slate-500">Retro phosphor monitor emulation</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={Boolean(scanlinesEnabled)}
                onChange={(e) => handleTogglePreference('scanlines', e.target.checked)}
                className="w-4 h-4 rounded text-cyan-400 bg-slate-950 border-slate-700"
              />
            </div>
          </div>

          {/* Linked Hardware */}
          <div className="cyber-card p-5 space-y-4">
            <h4 className="font-pixel text-xs text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <Laptop className="w-4 h-4" />
              LINKED HARDWARE ({pilotData.devices?.length || 1})
            </h4>

            <div className="space-y-2.5">
              {(pilotData.devices || []).map((dev, idx) => (
                <div
                  key={dev.id || idx}
                  className="p-3 bg-slate-900/60 rounded border border-slate-800 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] text-slate-300 truncate font-semibold">
                      {dev.device_info || 'Browser Instance'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      Last used: {new Date(dev.last_used || dev.linked_at).toLocaleDateString()}
                    </div>
                  </div>

                  {(pilotData.devices || []).length > 1 && (
                    <button
                      onClick={() => handleUnlinkDevice(dev.id)}
                      className="text-[10px] font-mono text-red-400 hover:underline flex-shrink-0"
                    >
                      Unlink
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Locked A/B Variants */}
          {pilotData.assignedVariants && Object.keys(pilotData.assignedVariants).length > 0 && (
            <div className="cyber-card p-5 space-y-3">
              <h4 className="font-pixel text-xs text-yellow-400 uppercase tracking-wider">
                SYNCHRONIZED A/B EXPERIMENTS
              </h4>
              <div className="space-y-1.5 text-xs font-mono">
                {Object.entries(pilotData.assignedVariants).map(([key, variant]) => (
                  <div key={key} className="flex justify-between p-2 bg-slate-900/60 rounded">
                    <span className="text-slate-400">{key}:</span>
                    <span className="text-cyan-300 font-bold">Variant {variant}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Roll New Code Modal */}
      <Modal
        isOpen={rollModalOpen}
        onClose={() => {
          if (newRollCode && !rollSavedChecked) return;
          setRollModalOpen(false);
          setNewRollCode('');
          setCurrentCodeInput('');
        }}
        title={newRollCode ? 'SAVE YOUR NEW RECOVERY CODE' : 'ROLL NEW RECOVERY CODE'}
        size="md"
      >
        {!newRollCode ? (
          <form onSubmit={handleRollCode} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Generating a new code will immediately invalidate your previous recovery code. To authorize, enter your current recovery code:
            </p>

            {rollError && (
              <div className="p-3 bg-red-950/60 border border-red-500/40 rounded text-xs text-red-300">
                {rollError}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-mono text-cyan-400 block">
                CURRENT RECOVERY CODE
              </label>
              <input
                type="text"
                required
                placeholder="PF-XXXX-XXXX-XXXX-XXXX"
                value={currentCodeInput}
                onChange={(e) => setCurrentCodeInput(e.target.value.toUpperCase())}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              disabled={rollLoading || !currentCodeInput.trim()}
              className="w-full cyber-btn cyber-btn-cyan py-3 text-xs"
            >
              {rollLoading ? 'GENERATING...' : 'INVALIDATE OLD & ROLL NEW KEY'}
            </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-black border-2 border-cyan-400 rounded-lg flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-cyan-300 select-all">{newRollCode}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(newRollCode);
                    setRollCopied(true);
                    setTimeout(() => setRollCopied(false), 2000);
                  }}
                  className="p-1.5 rounded bg-slate-800 text-cyan-400"
                >
                  {rollCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded border border-slate-800">
              <label className="flex items-start gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rollSavedChecked}
                  onChange={(e) => setRollSavedChecked(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-cyan-400 bg-slate-950"
                />
                <span className="text-xs text-slate-300">
                  I have saved my new recovery code and understand the previous code is now permanently revoked.
                </span>
              </label>
            </div>

            <button
              type="button"
              disabled={!rollSavedChecked}
              onClick={handleFinishRoll}
              className={`w-full py-3 text-xs font-bold font-mono rounded ${
                rollSavedChecked ? 'cyber-btn cyber-btn-cyan' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              CONFIRM & CLOSE
            </button>
          </div>
        )}
      </Modal>

      {/* Delete Profile Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="PERMANENTLY DELETE PILOT PROFILE"
        size="md"
      >
        <form onSubmit={handleDeleteProfile} className="space-y-4">
          <div className="p-3.5 bg-red-950/60 border border-red-500/40 rounded-lg text-xs text-red-200 space-y-1.5">
            <div className="font-bold font-mono text-red-300">DANGER ZONE: IRREVERSIBLE ACTION</div>
            <p>
              Deleting your profile will permanently erase your callsign, wishlist, device records, and locked configurations.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 bg-red-950/80 border border-red-500/60 rounded text-xs text-red-300">
              {deleteError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 block">
              ENTER YOUR RECOVERY CODE *
            </label>
            <input
              type="text"
              required
              placeholder="PF-XXXX-XXXX-XXXX-XXXX"
              value={deleteCodeInput}
              onChange={(e) => setDeleteCodeInput(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-400"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 block">
              TYPE YOUR CALLSIGN "<span className="text-red-400 font-bold">{pilotData.callsign}</span>" TO CONFIRM *
            </label>
            <input
              type="text"
              required
              placeholder={pilotData.callsign}
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-red-400"
            />
          </div>

          <button
            type="submit"
            disabled={deleteLoading || !deleteCodeInput.trim() || deleteConfirmText !== pilotData.callsign}
            className="w-full bg-red-600 hover:bg-red-500 text-white font-mono font-bold py-3 text-xs rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {deleteLoading ? 'DELETING PROFILE...' : 'PERMANENTLY DELETE PILOT PASS'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
