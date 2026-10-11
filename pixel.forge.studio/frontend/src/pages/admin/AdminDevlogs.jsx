import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, RefreshCw, BookOpen } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { contentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = ['ENGINEERING', 'GAME UPDATE', 'SOUND & MUSIC', 'ART & DESIGN', 'COMMUNITY', 'STUDIO NEWS', 'PATCH NOTES'];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Simple reading time estimate
function readingTime(text = '') {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

const blankForm = {
  title: '',
  slug: '',
  category: 'STUDIO NEWS',
  excerpt: '',
  content: '',
  cover_image: '',
  game_id: '',
  version: '',
  author: 'Pixel Forge Team',
  status: 'draft'
};

export default function AdminDevlogs({ games = [] }) {
  const [devlogs, setDevlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDevlog, setEditingDevlog] = useState(null);
  const [formData, setFormData] = useState(blankForm);
  const [preview, setPreview] = useState(false);
  const [slugManual, setSlugManual] = useState(false);
  const { isAdmin } = useAuth();

  const fetchDevlogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await contentAPI.getDevlogsAdmin();
      setDevlogs(res.data.devlogs || []);
    } catch (err) {
      console.error('Failed to fetch devlogs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevlogs();
  }, [fetchDevlogs]);

  const handleOpenAdd = () => {
    setEditingDevlog(null);
    setFormData(blankForm);
    setSlugManual(false);
    setPreview(false);
    setModalOpen(true);
  };

  const handleOpenEdit = (d) => {
    setEditingDevlog(d);
    setFormData({
      title: d.title,
      slug: d.slug,
      category: d.category,
      excerpt: d.excerpt,
      content: d.content,
      cover_image: d.cover_image || '',
      game_id: d.game_id || '',
      version: d.version || '',
      author: d.author,
      status: d.status
    });
    setSlugManual(true);
    setPreview(false);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this devlog permanently?')) return;
    try {
      await contentAPI.deleteDevlog(id);
      fetchDevlogs();
    } catch {
      alert('Failed to delete devlog.');
    }
  };

  const handleToggleStatus = async (d) => {
    const newStatus = d.status === 'published' ? 'draft' : 'published';
    try {
      await contentAPI.updateDevlog(d.id, { ...d, status: newStatus });
      fetchDevlogs();
    } catch {
      alert('Failed to update status.');
    }
  };

  const handleTitleChange = (val) => {
    const update = { title: val };
    if (!slugManual) update.slug = slugify(val);
    setFormData(f => ({ ...f, ...update }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        game_id: formData.game_id || null,
      };
      if (editingDevlog) {
        await contentAPI.updateDevlog(editingDevlog.id, payload);
      } else {
        await contentAPI.createDevlog(payload);
      }
      setModalOpen(false);
      fetchDevlogs();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to save devlog.');
    }
  };

  const inp = (props) => (
    <input {...props} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs" />
  );

  const field = (label, el, hint = '') => (
    <div>
      <label className="block text-slate-300 mb-1 font-mono text-xs">{label}</label>
      {el}
      {hint && <p className="text-[10px] font-mono text-slate-600 mt-1">{hint}</p>}
    </div>
  );

  const statusColor = (s) => s === 'published' ? 'badge-emerald' : 'badge-yellow';

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-pixel text-xs text-cyan-400">CONTENT</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">DEVLOGS & UPDATES</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchDevlogs} className="p-2 rounded bg-slate-900 text-slate-400 hover:text-cyan-400 border border-slate-700">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={handleOpenAdd} className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-4 flex items-center gap-2">
            <Plus className="w-4 h-4" /> NEW DEVLOG
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="cyber-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-900/90 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-4">Title</th>
                <th className="p-4">Category</th>
                <th className="p-4">Game</th>
                <th className="p-4">Status</th>
                <th className="p-4">Read Time</th>
                <th className="p-4">Published</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-500 animate-pulse">Loading devlogs...</td></tr>
              ) : devlogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <div className="text-sm font-heading">No devlogs yet.</div>
                    <div className="text-xs mt-1">Click "NEW DEVLOG" to create your first post.</div>
                  </td>
                </tr>
              ) : devlogs.map((d) => (
                <tr key={d.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4">
                    <div className="font-bold text-white font-sans truncate max-w-[220px]">{d.title}</div>
                    <div className="text-[10px] text-slate-500">/{d.slug}</div>
                  </td>
                  <td className="p-4">
                    <span className="pixel-badge badge-cyan text-[8px]">{d.category}</span>
                  </td>
                  <td className="p-4 text-slate-400">{d.game_title || '—'}</td>
                  <td className="p-4">
                    <span className={`pixel-badge ${statusColor(d.status)} text-[8px]`}>{d.status}</span>
                  </td>
                  <td className="p-4 text-slate-400">{readingTime(d.content)} min</td>
                  <td className="p-4 text-slate-400">
                    {d.published_at ? new Date(d.published_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleStatus(d)}
                      className={`p-1.5 rounded text-xs ${d.status === 'published' ? 'bg-yellow-950/60 hover:bg-yellow-900 text-yellow-400' : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-400'}`}
                      title={d.status === 'published' ? 'Unpublish (set to draft)' : 'Publish'}
                    >
                      {d.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleOpenEdit(d)} className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400" title="Edit">
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDelete(d.id)} className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-400" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingDevlog ? `Edit: ${editingDevlog.title}` : 'New Devlog Post'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {field('Title *',
            inp({ type: 'text', required: true, value: formData.title, onChange: e => handleTitleChange(e.target.value) })
          )}

          <div className="grid grid-cols-2 gap-4">
            {field('Slug (auto-generated)',
              <div className="flex gap-2">
                {inp({
                  type: 'text', required: true, value: formData.slug,
                  onChange: e => { setSlugManual(true); setFormData(f => ({ ...f, slug: e.target.value })); }
                })}
              </div>,
              'URL: /devlog/' + (formData.slug || 'your-slug-here')
            )}

            {field('Category *',
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('Linked Game (optional)',
              <select
                value={formData.game_id}
                onChange={e => setFormData(f => ({ ...f, game_id: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs"
              >
                <option value="">— No linked game —</option>
                {games.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
              </select>
            )}

            {field('Version / Patch (optional)',
              inp({ type: 'text', placeholder: 'e.g. v1.4.2', value: formData.version, onChange: e => setFormData(f => ({ ...f, version: e.target.value })) })
            )}
          </div>

          {field('Author *',
            inp({ type: 'text', required: true, value: formData.author, onChange: e => setFormData(f => ({ ...f, author: e.target.value })) })
          )}

          {field('Cover Image URL',
            inp({ type: 'url', placeholder: 'https://...', value: formData.cover_image, onChange: e => setFormData(f => ({ ...f, cover_image: e.target.value })) })
          )}

          {field('Excerpt / Summary *',
            <textarea rows={2} required value={formData.excerpt} onChange={e => setFormData(f => ({ ...f, excerpt: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs" />
          )}

          {/* Markdown content + live preview toggle */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-mono text-slate-300 text-xs">Content (Markdown) *</label>
              <button type="button" onClick={() => setPreview(p => !p)}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200">
                {preview ? 'Edit Mode' : 'Preview Mode'}
              </button>
            </div>
            {preview ? (
              <div
                className="w-full min-h-[200px] bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs prose prose-invert prose-sm max-w-none leading-relaxed font-sans whitespace-pre-wrap overflow-y-auto"
                style={{ maxHeight: '300px' }}
              >
                {formData.content || <span className="text-slate-600 italic">No content yet...</span>}
              </div>
            ) : (
              <textarea
                rows={10}
                required
                value={formData.content}
                onChange={e => setFormData(f => ({ ...f, content: e.target.value }))}
                placeholder="# Your Devlog Title&#10;&#10;Write your content in Markdown format here..."
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs font-mono"
              />
            )}
            <p className="text-[10px] font-mono text-slate-600 mt-1">
              Estimated read time: ~{readingTime(formData.content)} min
            </p>
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <label className="text-slate-300 font-mono text-xs">Status:</label>
            <select
              value={formData.status}
              onChange={e => setFormData(f => ({ ...f, status: e.target.value }))}
              className="bg-slate-950 border border-slate-700 rounded px-3 py-1.5 text-slate-200 text-xs"
            >
              <option value="draft">Draft (not public)</option>
              <option value="published">Published (live on site)</option>
            </select>
          </div>

          <button type="submit" className="w-full cyber-btn cyber-btn-cyan py-3 text-xs">
            SAVE DEVLOG
          </button>
        </form>
      </Modal>
    </div>
  );
}
