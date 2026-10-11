import React, { useState } from 'react';
import { Plus, Edit, Trash2, Check } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { contentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminGames({ games, onReload }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const { isAdmin } = useAuth();

  const blankForm = {
    title: '',
    genre: 'Action RPG',
    status: 'Released',
    tagline: '',
    description: '',
    release_date: '2026',
    rating: 4.8,
    platforms: 'Steam, PC',
    banner_img: '',
    trailer_url: '',
    tags: 'Action, Pixel',
    featured: 0,
    create_launch_devlog: false
  };

  const [formData, setFormData] = useState(blankForm);

  const handleOpenAdd = () => {
    setEditingGame(null);
    setFormData(blankForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (game) => {
    setEditingGame(game);
    setFormData({
      title: game.title,
      genre: game.genre,
      status: game.status,
      tagline: game.tagline || '',
      description: game.description,
      release_date: game.release_date || '',
      rating: game.rating,
      platforms: (game.platforms || []).join(', '),
      banner_img: game.banner_img || '',
      trailer_url: game.trailer_url || '',
      tags: (game.tags || []).join(', '),
      featured: game.featured ? 1 : 0
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      platforms: formData.platforms.split(',').map(s => s.trim()).filter(Boolean),
      tags: formData.tags.split(',').map(s => s.trim()).filter(Boolean),
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
    } catch {
      alert('Failed to save game record.');
    }
  };

  const field = (label, el) => (
    <div>
      <label className="block text-slate-300 mb-1 font-mono text-xs">{label}</label>
      {el}
    </div>
  );
  const input = (props) => (
    <input {...props} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs" />
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
                <th className="p-4">Featured</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {games.map((g) => (
                <tr key={g.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {g.banner_img
                        ? <img src={g.banner_img} alt={g.title} className="w-12 h-8 rounded object-cover border border-slate-700" />
                        : <div className="w-12 h-8 rounded border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500 text-[9px]">IMG</div>
                      }
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
              ))}
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
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Title *', input({ type: 'text', required: true, value: formData.title, onChange: e => setFormData({ ...formData, title: e.target.value }) }))}
            {field('Genre *', input({ type: 'text', required: true, value: formData.genre, onChange: e => setFormData({ ...formData, genre: e.target.value }) }))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {field('Status',
              <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs">
                <option>Released</option><option>In Beta</option><option>In Development</option>
              </select>
            )}
            {field('Release Window', input({ type: 'text', value: formData.release_date, onChange: e => setFormData({ ...formData, release_date: e.target.value }) }))}
            {field('Rating (1–5)', input({ type: 'number', step: '0.1', min: '1', max: '5', value: formData.rating, onChange: e => setFormData({ ...formData, rating: parseFloat(e.target.value) }) }))}
          </div>
          {field('Banner Image URL', input({ type: 'url', value: formData.banner_img, onChange: e => setFormData({ ...formData, banner_img: e.target.value }) }))}
          {field('Tagline', input({ type: 'text', value: formData.tagline, onChange: e => setFormData({ ...formData, tagline: e.target.value }) }))}
          {field('Full Description *',
            <textarea rows={3} required value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs" />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {field('Platforms (comma separated)', input({ type: 'text', value: formData.platforms, onChange: e => setFormData({ ...formData, platforms: e.target.value }) }))}
            {field('Tags (comma separated)', input({ type: 'text', value: formData.tags, onChange: e => setFormData({ ...formData, tags: e.target.value }) }))}
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="featuredCheck" checked={Boolean(formData.featured)} onChange={e => setFormData({ ...formData, featured: e.target.checked ? 1 : 0 })} className="w-4 h-4 rounded" />
            <label htmlFor="featuredCheck" className="text-slate-300 font-mono text-xs">Feature on Homepage Showcase</label>
          </div>
          {!editingGame && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
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
          <button type="submit" className="w-full cyber-btn cyber-btn-cyan py-3 text-xs flex items-center justify-center gap-2">
            <Check className="w-4 h-4" /> SAVE GAME DOSSIER
          </button>
        </form>
      </Modal>

    </div>
  );
}
