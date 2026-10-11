import React, { useState } from 'react';
import { Plus, Edit, Trash2, Link, X, ExternalLink, UserCheck } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { contentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const PLATFORMS = [
  { name: 'Website/Portfolio', prefix: '' },
  { name: 'GitHub', prefix: 'https://github.com/' },
  { name: 'LinkedIn', prefix: 'https://linkedin.com/in/' },
  { name: 'X/Twitter', prefix: 'https://x.com/' },
  { name: 'Instagram', prefix: 'https://instagram.com/' },
  { name: 'YouTube', prefix: 'https://youtube.com/@' },
  { name: 'ArtStation', prefix: 'https://artstation.com/u/' },
  { name: 'Behance', prefix: 'https://behance.net/' },
  { name: 'itch.io', prefix: 'https://itch.io/profile/' },
  { name: 'Twitch', prefix: 'https://twitch.tv/' },
  { name: 'Email', prefix: '' },
];

// Auto-expand handle (@username or plain username) to full URL based on platform
function expandHandle(platform, value) {
  if (!value) return value;
  const p = PLATFORMS.find(pl => pl.name === platform);
  if (!p || !p.prefix) return value;

  // Skip if already a full URL
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('mailto:')) {
    return value;
  }

  // Strip leading @
  const handle = value.startsWith('@') ? value.slice(1) : value;
  return `${p.prefix}${handle}`;
}

function InitialsAvatar({ name, size = 14 }) {
  const initials = (name || '??').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  const colors = ['#00f0ff','#ff0a78','#00ff88','#ffd400','#9d4edd','#38bdf8'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div
      className="rounded-lg flex items-center justify-center font-heading font-bold flex-shrink-0 border-2"
      style={{ width: size * 4, height: size * 4, background: `${color}22`, borderColor: `${color}66`, color, fontSize: size }}
    >{initials}</div>
  );
}

const blankLink = () => ({ platform: 'GitHub', url: '' });

export default function AdminTeam({ team, onReload }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const { isAdmin } = useAuth();

  const blankForm = {
    name: '',
    role: '',
    department: 'Engineering',
    bio: '',
    avatar: '',
    social_links: [],
    is_verified: false,
    order_idx: 1
  };

  const [formData, setFormData] = useState(blankForm);

  const handleOpenAdd = () => {
    setEditingMember(null);
    setFormData({ ...blankForm, order_idx: team.length + 1 });
    setModalOpen(true);
  };

  const handleOpenEdit = (m) => {
    setEditingMember(m);
    // Normalize social_links to array format
    let links = m.social_links;
    if (!Array.isArray(links)) {
      links = typeof links === 'object' && links
        ? Object.entries(links).filter(([, url]) => url).map(([platform, url]) => ({ platform, url }))
        : [];
    }
    setFormData({
      name: m.name,
      role: m.role,
      department: m.department,
      bio: m.bio,
      avatar: m.avatar || '',
      social_links: links.length > 0 ? links : [],
      is_verified: Boolean(m.is_verified),
      order_idx: m.order_idx || 1
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this team member record?')) return;
    try {
      await contentAPI.deleteTeamMember(id);
      onReload();
    } catch {
      alert('Failed to delete team member.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Auto-expand handles and strip empty links before saving
    const cleanedLinks = formData.social_links
      .filter(l => l.platform && l.url.trim())
      .map(l => ({ platform: l.platform, url: expandHandle(l.platform, l.url.trim()) }));

    const payload = { ...formData, social_links: cleanedLinks };
    try {
      if (editingMember) {
        await contentAPI.updateTeamMember(editingMember.id, payload);
      } else {
        await contentAPI.createTeamMember(payload);
      }
      setModalOpen(false);
      onReload();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save team member.');
    }
  };

  // Add a new blank social link row
  const addLink = () => {
    setFormData(f => ({ ...f, social_links: [...f.social_links, blankLink()] }));
  };

  // Update one link in the array
  const updateLink = (idx, field, value) => {
    setFormData(f => {
      const links = [...f.social_links];
      links[idx] = { ...links[idx], [field]: value };
      return { ...f, social_links: links };
    });
  };

  // Remove a link row
  const removeLink = (idx) => {
    setFormData(f => ({ ...f, social_links: f.social_links.filter((_, i) => i !== idx) }));
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-pixel text-xs text-pink-400">ORGANIZATION & TALENT</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">
            TEAM ROSTER MANAGER
          </h1>
        </div>

        <button
          onClick={handleOpenAdd}
          className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-4 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          ADD MEMBER
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map((m) => {
          const links = Array.isArray(m.social_links) ? m.social_links.filter(l => l.url) : [];
          return (
            <div key={m.id} className="cyber-card p-5 space-y-4 flex flex-col justify-between">
              <div className="flex items-start gap-4">
                {m.avatar
                  ? <img src={m.avatar} alt={m.name} className="w-14 h-14 rounded-lg object-cover border border-cyan-400/40 flex-shrink-0" />
                  : <InitialsAvatar name={m.name} size={14} />}
                <div className="overflow-hidden">
                  <span className="pixel-badge badge-cyan text-[8px]">{m.department}</span>
                  <h3 className="font-heading font-bold text-base text-white truncate">{m.name}</h3>
                  <div className="text-xs font-mono text-pink-400 truncate">{m.role}</div>
                  {m.is_verified && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400 mt-0.5">
                      <UserCheck className="w-3 h-3" />
                      Verified Dev
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                {m.bio}
              </p>

              {/* Social link count */}
              {links.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                  <Link className="w-3 h-3" />
                  {links.length} social link{links.length !== 1 ? 's' : ''}
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-500">Order: #{m.order_idx}</span>
                <div className="space-x-2">
                  <button
                    onClick={() => handleOpenEdit(m)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-400 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <div>
            <label className="block text-slate-300 mb-1 font-mono">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 mb-1 font-mono">Role Title *</label>
              <input
                type="text"
                required
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-mono">Department *</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
              >
                <option value="Leadership">Leadership</option>
                <option value="Engineering">Engineering</option>
                <option value="Art & Animation">Art & Animation</option>
                <option value="Audio">Audio</option>
                <option value="Design">Design</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-mono">Avatar Image URL</label>
            <input
              type="url"
              value={formData.avatar}
              onChange={(e) => setFormData({ ...formData, avatar: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 font-mono text-[11px]"
              placeholder="https://example.com/avatar.jpg"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-mono">Biography</label>
            <textarea
              rows={3}
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
            />
          </div>

          {/* Social Links Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-mono text-slate-300">Social Links</label>
              <button
                type="button"
                onClick={addLink}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Add Link
              </button>
            </div>
            <div className="space-y-2">
              {formData.social_links.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={link.platform}
                    onChange={(e) => updateLink(idx, 'platform', e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 text-[11px] w-36 flex-shrink-0"
                  >
                    {PLATFORMS.map(p => (
                      <option key={p.name} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={link.url}
                    onChange={(e) => updateLink(idx, 'url', e.target.value)}
                    placeholder={
                      link.platform === 'Website/Portfolio' ? 'https://yoursite.com' :
                      link.platform === 'Email' ? 'user@example.com' :
                      '@username or full URL'
                    }
                    className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1.5 text-slate-200 font-mono text-[11px]"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(idx)}
                    className="p-1 text-slate-600 hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {formData.social_links.length === 0 && (
                <p className="text-[10px] font-mono text-slate-600 italic">No social links added. Click "Add Link" to add one.</p>
              )}
              <p className="text-[10px] font-mono text-slate-600">
                Tip: Enter @handle or username — it will be auto-expanded to the full URL on save.
              </p>
            </div>
          </div>

          {/* Verified Dev checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isVerifiedCheck"
              checked={formData.is_verified}
              onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked })}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="isVerifiedCheck" className="text-slate-300 font-mono text-xs flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
              Mark as Verified Dev (shows badge on public team page)
            </label>
          </div>

          <button type="submit" className="w-full cyber-btn cyber-btn-cyan py-3 text-xs">
            SAVE TEAM MEMBER
          </button>
        </form>
      </Modal>

    </div>
  );
}
