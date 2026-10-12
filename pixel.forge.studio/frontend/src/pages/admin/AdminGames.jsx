import React, { useState } from 'react';
import {
  Plus, Edit, Trash2, Check, Upload, Link as LinkIcon,
  ArrowUp, ArrowDown, AlertTriangle, Eye, ShieldAlert,
  Gamepad2, Image as ImageIcon
} from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { contentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const STORE_PLATFORMS = [
  'Steam',
  'Epic Games Store',
  'GOG',
  'itch.io',
  'PlayStation Store',
  'Xbox',
  'Nintendo eShop',
  'App Store',
  'Google Play',
  'Official Website'
];

function validateClientStoreLink(link) {
  if (!link || !link.platform) return 'Store link platform is required.';
  if (!link.url || !link.url.trim()) return `Store URL is required for ${link.platform}.`;
  const trimmed = link.url.trim();

  if (!trimmed.startsWith('https://')) {
    return `URL for ${link.platform} must start with https://`;
  }
  if (/^(javascript|data):/i.test(trimmed)) {
    return `Forbidden URL protocol for ${link.platform}`;
  }

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    switch (link.platform) {
      case 'Steam':
        if (host !== 'store.steampowered.com') return 'Steam link must be on store.steampowered.com';
        break;
      case 'Epic Games Store':
        if (host !== 'store.epicgames.com' && !host.endsWith('.epicgames.com')) return 'Epic Games Store link must be on store.epicgames.com';
        break;
      case 'GOG':
        if (host !== 'gog.com' && !host.endsWith('.gog.com')) return 'GOG link must be on gog.com';
        break;
      case 'itch.io':
        if (host !== 'itch.io' && !host.endsWith('.itch.io')) return 'itch.io link must be on itch.io';
        break;
      case 'PlayStation Store':
        if (host !== 'store.playstation.com' && !host.endsWith('.playstation.com')) return 'PlayStation link must be on store.playstation.com';
        break;
      case 'Xbox':
        if (host !== 'xbox.com' && !host.endsWith('.xbox.com') && host !== 'microsoft.com' && !host.endsWith('.microsoft.com')) return 'Xbox link must be on xbox.com or microsoft.com';
        break;
      case 'Nintendo eShop':
        if (host !== 'nintendo.com' && !host.endsWith('.nintendo.com')) return 'Nintendo link must be on nintendo.com';
        break;
      case 'App Store':
        if (host !== 'apps.apple.com' && !host.endsWith('.apple.com')) return 'App Store link must be on apps.apple.com';
        break;
      case 'Google Play':
        if (host !== 'play.google.com') return 'Google Play link must be on play.google.com';
        break;
      case 'Official Website':
        break;
      default:
        return `Unsupported platform: ${link.platform}`;
    }
  } catch (_) {
    return `Invalid URL format for ${link.platform}`;
  }
  return null;
}

// Test image validity in browser
function testImageLoad(url) {
  return new Promise((resolve) => {
    if (!url) return resolve(false);
    if (url.startsWith('/uploads/') || url.startsWith('data:image/')) return resolve(true);
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
    setTimeout(() => resolve(false), 5000);
  });
}

export default function AdminGames({ games = [], onReload }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingShotIdx, setUploadingShotIdx] = useState(null);
  const { isAdmin } = useAuth();

  const blankForm = {
    title: '',
    genre: 'Action RPG',
    status: 'Released',
    tagline: '',
    description: '',
    release_date: '2026',
    rating: 4.8,
    engine: 'PixelForge Engine v4.2',
    platforms: 'Steam, PC',
    cover_image: '',
    cover_source: 'url',
    trailer_url: '',
    tags: 'Action, Pixel',
    featured: 0,
    store_links: [
      { platform: 'Steam', url: 'https://store.steampowered.com', isPrimary: true, label: 'View on Steam' }
    ],
    screenshots: [],
    create_launch_devlog: false
  };

  const [formData, setFormData] = useState(blankForm);

  const handleOpenAdd = () => {
    setEditingGame(null);
    setFormData(blankForm);
    setErrorMessage('');
    setModalOpen(true);
  };

  const handleOpenEdit = (game) => {
    setEditingGame(game);
    setErrorMessage('');

    const rawShots = Array.isArray(game.screenshots) ? game.screenshots : [];
    const normalizedShots = rawShots.map(s => {
      if (typeof s === 'string') return { source: 'url', value: s, alt: `${game.title} Screenshot` };
      return {
        source: s.source || (s.value?.startsWith('/uploads/') ? 'upload' : 'url'),
        value: s.value || '',
        alt: s.alt || `${game.title} Screenshot`
      };
    });

    let links = Array.isArray(game.store_links) ? game.store_links : [];
    if (links.length === 0 && game.play_url && game.play_url !== '#') {
      links = [{ platform: 'Steam', url: game.play_url, isPrimary: true, label: 'View on Steam' }];
    }

    const cover = game.cover_image || game.banner_img || '';

    setFormData({
      title: game.title || '',
      genre: game.genre || 'Action RPG',
      status: game.status || 'Released',
      tagline: game.tagline || '',
      description: game.description || '',
      release_date: game.release_date || '',
      rating: game.rating || 4.8,
      engine: game.engine || 'PixelForge Engine v4.2',
      platforms: (game.platforms || []).join(', '),
      cover_image: cover,
      cover_source: cover.startsWith('/uploads/') ? 'upload' : 'url',
      trailer_url: game.trailer_url || '',
      tags: (game.tags || []).join(', '),
      featured: game.featured ? 1 : 0,
      store_links: links.map((l, i) => ({
        platform: l.platform || 'Steam',
        url: l.url || '',
        isPrimary: l.isPrimary !== undefined ? l.isPrimary : i === 0,
        label: l.label || `View on ${l.platform || 'Steam'}`
      })),
      screenshots: normalizedShots,
      create_launch_devlog: false
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this game?')) return;
    try {
      await contentAPI.deleteGame(id);
      onReload();
    } catch {
      alert('Failed to delete game.');
    }
  };

  const handleCoverFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5 MB limit.');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Only JPG, PNG, and WebP files are supported.');
      return;
    }

    const fd = new FormData();
    fd.append('image', file);

    setUploadingCover(true);
    try {
      const res = await contentAPI.uploadImage(fd);
      if (res.data?.url) {
        setFormData(f => ({ ...f, cover_image: res.data.url, cover_source: 'upload' }));
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload cover image.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleScreenshotFileUpload = async (idx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5 MB limit.');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      alert('Only JPG, PNG, and WebP files are supported.');
      return;
    }

    const fd = new FormData();
    fd.append('image', file);

    setUploadingShotIdx(idx);
    try {
      const res = await contentAPI.uploadImage(fd);
      if (res.data?.url) {
        setFormData(f => {
          const next = [...f.screenshots];
          next[idx] = { ...next[idx], value: res.data.url, source: 'upload' };
          return { ...f, screenshots: next };
        });
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to upload screenshot.');
    } finally {
      setUploadingShotIdx(null);
    }
  };

  const handleAddStoreLink = () => {
    setFormData(f => ({
      ...f,
      store_links: [
        ...f.store_links,
        {
          platform: 'Steam',
          url: '',
          isPrimary: f.store_links.length === 0,
          label: 'View on Steam'
        }
      ]
    }));
  };

  const handleRemoveStoreLink = (idx) => {
    setFormData(f => {
      const next = f.store_links.filter((_, i) => i !== idx);
      if (next.length > 0 && !next.some(l => l.isPrimary)) {
        next[0].isPrimary = true;
      }
      return { ...f, store_links: next };
    });
  };

  const handleUpdateStoreLink = (idx, patch) => {
    setFormData(f => {
      const next = [...f.store_links];
      next[idx] = { ...next[idx], ...patch };
      if (patch.isPrimary) {
        next.forEach((l, i) => {
          if (i !== idx) l.isPrimary = false;
        });
      }
      if (patch.platform && (!next[idx].label || next[idx].label.startsWith('View on '))) {
        next[idx].label = `View on ${patch.platform}`;
      }
      return { ...f, store_links: next };
    });
  };

  const handleAddScreenshot = () => {
    setFormData(f => ({
      ...f,
      screenshots: [
        ...f.screenshots,
        { source: 'url', value: '', alt: `${f.title || 'Game'} Screenshot` }
      ]
    }));
  };

  const handleRemoveScreenshot = (idx) => {
    setFormData(f => ({
      ...f,
      screenshots: f.screenshots.filter((_, i) => i !== idx)
    }));
  };

  const handleMoveScreenshot = (idx, direction) => {
    setFormData(f => {
      const next = [...f.screenshots];
      const targetIdx = idx + direction;
      if (targetIdx < 0 || targetIdx >= next.length) return f;
      const temp = next[idx];
      next[idx] = next[targetIdx];
      next[targetIdx] = temp;
      return { ...f, screenshots: next };
    });
  };

  const handleUpdateScreenshot = (idx, patch) => {
    setFormData(f => {
      const next = [...f.screenshots];
      next[idx] = { ...next[idx], ...patch };
      return { ...f, screenshots: next };
    });
  };

  const isGoogleThumb = (url) => {
    return url && (url.includes('encrypted-tbn') || url.includes('gstatic.com'));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    if (!formData.title.trim() || !formData.genre.trim() || !formData.description.trim()) {
      setErrorMessage('Title, Genre, and Description are required.');
      setSubmitting(false);
      return;
    }

    if (formData.trailer_url && formData.trailer_url.trim()) {
      const trimmedTrailer = formData.trailer_url.trim();
      if (!trimmedTrailer.startsWith('https://')) {
        setErrorMessage('Trailer URL must start with https://');
        setSubmitting(false);
        return;
      }
      if (/^(javascript|data):/i.test(trimmedTrailer)) {
        setErrorMessage('Trailer URL contains forbidden protocol.');
        setSubmitting(false);
        return;
      }
    }

    for (const link of formData.store_links) {
      const linkErr = validateClientStoreLink(link);
      if (linkErr) {
        setErrorMessage(linkErr);
        setSubmitting(false);
        return;
      }
    }

    if (formData.cover_image && formData.cover_source === 'url') {
      const loads = await testImageLoad(formData.cover_image);
      if (!loads) {
        setErrorMessage("Cover image link doesn't work as an image. Try another link or upload the file.");
        setSubmitting(false);
        return;
      }
    }

    for (let i = 0; i < formData.screenshots.length; i++) {
      const shot = formData.screenshots[i];
      if (shot.value && shot.source === 'url') {
        const loads = await testImageLoad(shot.value);
        if (!loads) {
          setErrorMessage(`Screenshot #${i + 1} link doesn't work as an image. Try another link or upload the file.`);
          setSubmitting(false);
          return;
        }
      }
    }

    const payload = {
      ...formData,
      banner_img: formData.cover_image,
      platforms: typeof formData.platforms === 'string'
        ? formData.platforms.split(',').map(s => s.trim()).filter(Boolean)
        : formData.platforms,
      tags: typeof formData.tags === 'string'
        ? formData.tags.split(',').map(s => s.trim()).filter(Boolean)
        : formData.tags,
      featured: formData.featured ? 1 : 0
    };

    try {
      if (editingGame) {
        await contentAPI.updateGame(editingGame.id, payload);
      } else {
        await contentAPI.createGame(payload);
      }
      setModalOpen(false);
      onReload();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to save game record.');
    } finally {
      setSubmitting(false);
    }
  };

  const field = (label, el) => (
    <div>
      <label className="block text-slate-300 mb-1 font-mono text-xs">{label}</label>
      {el}
    </div>
  );

  const input = (props) => (
    <input
      {...props}
      className={`w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 focus:outline-none rounded px-3 py-2 text-slate-200 text-xs font-mono transition-colors ${props.className || ''}`}
    />
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-pixel text-xs text-cyan-400">CONTENT MANAGEMENT</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">GAMES PORTFOLIO MANAGER</h1>
        </div>
        <button onClick={handleOpenAdd} className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> ADD NEW TITLE
        </button>
      </div>

      {/* Table */}
      <div className="cyber-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Game</th>
                <th className="p-4">Genre</th>
                <th className="p-4">Status</th>
                <th className="p-4">Rating</th>
                <th className="p-4">Store Links</th>
                <th className="p-4">Featured</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {games.map((g) => {
                const cover = g.cover_image || g.banner_img;
                const links = Array.isArray(g.store_links) ? g.store_links : [];
                return (
                  <tr key={g.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {cover ? (
                          <img src={cover} alt={g.title} className="w-12 h-8 rounded object-cover border border-slate-700 bg-slate-950" />
                        ) : (
                          <div className="w-12 h-8 rounded border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500 text-[9px]">IMG</div>
                        )}
                        <div>
                          <div className="font-bold text-white font-sans">{g.title}</div>
                          <div className="text-[10px] text-slate-500">slug: {g.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-cyan-300">{g.genre}</td>
                    <td className="p-4"><span className="pixel-badge badge-cyan text-[9px]">{g.status}</span></td>
                    <td className="p-4 text-yellow-400">{g.rating} / 5.0</td>
                    <td className="p-4">
                      {links.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {links.map((l, idx) => (
                            <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded border ${l.isPrimary ? 'bg-cyan-950 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                              {l.platform}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[10px]">No store links</span>
                      )}
                    </td>
                    <td className="p-4">
                      {g.featured
                        ? <span className="text-emerald-400 font-bold">✓ Yes</span>
                        : <span className="text-slate-500">No</span>}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button onClick={() => handleOpenEdit(g)} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400" title="Edit Game">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(g.id)} className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-400" title="Delete Game">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingGame ? `Edit: ${editingGame?.title}` : 'Add New Game Title'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5 max-h-[80vh] overflow-y-auto pr-1">

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded flex items-start gap-2 text-red-300 text-xs font-mono">
              <ShieldAlert className="w-4 h-4 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Title *', input({ type: 'text', required: true, value: formData.title, onChange: e => setFormData({ ...formData, title: e.target.value }) }))}
            {field('Genre *', input({ type: 'text', required: true, value: formData.genre, onChange: e => setFormData({ ...formData, genre: e.target.value }) }))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {field('Status',
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs">
                <option>Released</option><option>In Beta</option><option>In Development</option><option>Concept Phase</option>
              </select>
            )}
            {field('Release Window', input({ type: 'text', value: formData.release_date, onChange: e => setFormData({ ...formData, release_date: e.target.value }) }))}
            {field('Rating (1–5)', input({ type: 'number', step: '0.1', min: '1', max: '5', value: formData.rating, onChange: e => setFormData({ ...formData, rating: parseFloat(e.target.value) || 1 }) }))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Engine', input({ type: 'text', value: formData.engine, onChange: e => setFormData({ ...formData, engine: e.target.value }) }))}
            {field('Trailer URL (YouTube https link)', input({ type: 'url', placeholder: 'https://www.youtube.com/watch?v=...', value: formData.trailer_url, onChange: e => setFormData({ ...formData, trailer_url: e.target.value }) }))}
          </div>

          {field('Tagline', input({ type: 'text', value: formData.tagline, onChange: e => setFormData({ ...formData, tagline: e.target.value }) }))}
          {field('Full Description *',
            <textarea rows={3} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs focus:border-cyan-400 focus:outline-none font-sans" />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Platforms (comma separated)', input({ type: 'text', value: formData.platforms, onChange: e => setFormData({ ...formData, platforms: e.target.value }) }))}
            {field('Tags (comma separated)', input({ type: 'text', value: formData.tags, onChange: e => setFormData({ ...formData, tags: e.target.value }) }))}
          </div>

          {/* Section 2: Cover Image (Upload or Paste URL) */}
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-slate-200 font-mono text-xs font-bold flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-cyan-400" /> COVER / BANNER IMAGE
              </label>
              <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, cover_source: 'upload' }))}
                  className={`px-2 py-0.5 rounded transition-colors ${formData.cover_source === 'upload' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
                >
                  Upload File
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(f => ({ ...f, cover_source: 'url' }))}
                  className={`px-2 py-0.5 rounded transition-colors ${formData.cover_source === 'url' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400'}`}
                >
                  Paste URL
                </button>
              </div>
            </div>

            {formData.cover_source === 'upload' ? (
              <div className="flex items-center gap-3">
                <label className="cyber-btn cyber-btn-cyan text-xs py-2 px-3 flex items-center gap-2 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  {uploadingCover ? 'UPLOADING...' : 'CHOOSE IMAGE (MAX 5MB)'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingCover}
                    onChange={handleCoverFileUpload}
                  />
                </label>
                <span className="text-[11px] font-mono text-slate-400 truncate max-w-xs">
                  {formData.cover_image || 'No file selected yet'}
                </span>
              </div>
            ) : (
              <div>
                {input({
                  type: 'url',
                  placeholder: 'https://...',
                  value: formData.cover_image,
                  onChange: e => setFormData({ ...formData, cover_image: e.target.value })
                })}
              </div>
            )}

            {/* Google Images thumbnail warning */}
            {isGoogleThumb(formData.cover_image) && (
              <div className="p-2 bg-yellow-950/60 border border-yellow-500/50 rounded flex items-center gap-2 text-[11px] text-yellow-300 font-mono">
                <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                <span>Notice: This looks like a Google Images thumbnail. Please use the original image URL or upload the file directly.</span>
              </div>
            )}

            {/* Live Preview */}
            {formData.cover_image && (
              <div className="flex items-center gap-3 pt-1">
                <img
                  src={formData.cover_image}
                  alt="Cover Preview"
                  className="w-32 h-20 object-cover rounded border border-slate-700 bg-slate-950"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                <div className="text-[11px] text-slate-400 font-mono">
                  Live preview active. Validated before saving.
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Store Links Manager */}
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-slate-200 font-mono text-xs font-bold flex items-center gap-2">
                  <Gamepad2 className="w-3.5 h-3.5 text-pink-400" /> STORE LINKS & PLATFORMS
                </label>
                <p className="text-[11px] text-slate-400 font-mono">
                  Configure direct store pages (Steam, Epic, PlayStation, etc.). Mark one as Primary.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddStoreLink}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 px-2.5 py-1.5 rounded border border-cyan-500/30 flex items-center gap-1 font-mono"
              >
                <Plus className="w-3 h-3" /> Add Store Link
              </button>
            </div>

            {formData.store_links.length === 0 ? (
              <p className="text-xs font-mono text-slate-500 py-2">
                No store links added yet. The public modal will display "Not available on any store yet".
              </p>
            ) : (
              <div className="space-y-2.5">
                {formData.store_links.map((link, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Primary toggle */}
                    <label className="flex items-center gap-1 text-[11px] font-mono text-slate-300 cursor-pointer flex-shrink-0">
                      <input
                        type="radio"
                        name="primaryStore"
                        checked={Boolean(link.isPrimary)}
                        onChange={() => handleUpdateStoreLink(idx, { isPrimary: true })}
                        className="w-3.5 h-3.5 text-cyan-400"
                      />
                      <span className={link.isPrimary ? 'text-cyan-400 font-bold' : ''}>Primary</span>
                    </label>

                    {/* Platform dropdown */}
                    <select
                      value={link.platform}
                      onChange={e => handleUpdateStoreLink(idx, { platform: e.target.value })}
                      className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono w-40 flex-shrink-0"
                    >
                      {STORE_PLATFORMS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>

                    {/* URL Input */}
                    <input
                      type="url"
                      placeholder="https://..."
                      value={link.url}
                      onChange={e => handleUpdateStoreLink(idx, { url: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                    />

                    {/* Label Input */}
                    <input
                      type="text"
                      placeholder="Button Label"
                      value={link.label || ''}
                      onChange={e => handleUpdateStoreLink(idx, { label: e.target.value })}
                      className="w-36 bg-slate-900 border border-slate-700 focus:border-cyan-400 focus:outline-none rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono flex-shrink-0"
                    />

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => handleRemoveStoreLink(idx)}
                      className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-400 flex-shrink-0"
                      title="Remove link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 4: Screenshots Management */}
          <div className="p-4 bg-slate-900/70 border border-slate-800 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-slate-200 font-mono text-xs font-bold flex items-center gap-2">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" /> SCREENSHOTS GALLERY ({formData.screenshots.length})
                </label>
                <p className="text-[11px] text-slate-400 font-mono">
                  Add, reorder, upload or paste screenshots with descriptive alt text.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddScreenshot}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-emerald-300 px-2.5 py-1.5 rounded border border-emerald-500/30 flex items-center gap-1 font-mono"
              >
                <Plus className="w-3 h-3" /> Add Screenshot
              </button>
            </div>

            {formData.screenshots.length === 0 ? (
              <p className="text-xs font-mono text-slate-500 py-2">
                No screenshots added. You can add image URLs or upload files directly.
              </p>
            ) : (
              <div className="space-y-3">
                {formData.screenshots.map((shot, idx) => (
                  <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono text-cyan-400 font-bold">Screenshot #{idx + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveScreenshot(idx, -1)}
                          className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === formData.screenshots.length - 1}
                          onClick={() => handleMoveScreenshot(idx, 1)}
                          className="p-1 rounded bg-slate-900 text-slate-400 hover:text-white disabled:opacity-30"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveScreenshot(idx)}
                          className="p-1 rounded bg-red-950/60 hover:bg-red-900 text-red-400 ml-1"
                          title="Delete screenshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateScreenshot(idx, { source: 'upload' })}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${shot.source === 'upload' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
                          >
                            Upload
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateScreenshot(idx, { source: 'url' })}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${shot.source === 'url' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'}`}
                          >
                            Paste URL
                          </button>
                        </div>

                        {shot.source === 'upload' ? (
                          <label className="cyber-btn cyber-btn-cyan text-[11px] py-1.5 px-2 flex items-center justify-center gap-1 cursor-pointer">
                            <Upload className="w-3 h-3" />
                            {uploadingShotIdx === idx ? 'UPLOADING...' : 'CHOOSE FILE'}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              className="hidden"
                              disabled={uploadingShotIdx === idx}
                              onChange={(e) => handleScreenshotFileUpload(idx, e)}
                            />
                          </label>
                        ) : (
                          <input
                            type="url"
                            placeholder="https://..."
                            value={shot.value || ''}
                            onChange={e => handleUpdateScreenshot(idx, { value: e.target.value })}
                            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                          />
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono text-slate-400 mb-1">Alt Text (Accessibility)</label>
                        <input
                          type="text"
                          placeholder="e.g. In-game battle scene"
                          value={shot.alt || ''}
                          onChange={e => handleUpdateScreenshot(idx, { alt: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                        />
                      </div>
                    </div>

                    {isGoogleThumb(shot.value) && (
                      <div className="p-1.5 bg-yellow-950/60 border border-yellow-500/40 rounded text-[10px] text-yellow-300 font-mono">
                        Warning: Google thumbnail detected. Please use direct image URL or upload file.
                      </div>
                    )}

                    {shot.value && (
                      <div className="flex items-center gap-2 pt-1">
                        <img
                          src={shot.value}
                          alt={shot.alt || 'Preview'}
                          className="w-16 h-10 object-cover rounded border border-slate-700 bg-slate-950"
                        />
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-sm">
                          {shot.value}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 5: Homepage Feature & Devlog Options */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <input
              type="checkbox"
              id="featuredCheck"
              checked={Boolean(formData.featured)}
              onChange={e => setFormData({ ...formData, featured: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 rounded text-cyan-400 bg-slate-950 border-slate-700"
            />
            <label htmlFor="featuredCheck" className="text-slate-300 font-mono text-xs cursor-pointer">
              Feature on Homepage Showcase
            </label>
          </div>

          {!editingGame && (
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="launchDevlogCheck"
                checked={Boolean(formData.create_launch_devlog)}
                onChange={e => setFormData({ ...formData, create_launch_devlog: e.target.checked })}
                className="w-4 h-4 rounded text-cyan-400 bg-slate-950 border-slate-700"
              />
              <label htmlFor="launchDevlogCheck" className="text-cyan-300 font-mono text-xs cursor-pointer">
                Create a launch announcement devlog (draft linked to this game)
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full cyber-btn cyber-btn-cyan py-3 text-xs flex items-center justify-center gap-2 font-mono font-bold"
          >
            <Check className="w-4 h-4" />
            {submitting ? 'VALIDATING & SAVING...' : 'SAVE GAME DOSSIER'}
          </button>
        </form>
      </Modal>

    </div>
  );
}
