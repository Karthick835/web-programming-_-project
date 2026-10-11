import React, { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { contentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminJobs({ jobs, onReload }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const { isAdmin } = useAuth();

  const blankForm = {
    title: '',
    department: 'Engineering',
    location: 'Remote (Worldwide)',
    type: 'Full-Time',
    experience: '3+ years',
    description: '',
    requirements: '',
    perks: '',
    is_active: 1
  };

  const [formData, setFormData] = useState(blankForm);

  const handleOpenAdd = () => {
    setEditingJob(null);
    setFormData(blankForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      department: job.department,
      location: job.location,
      type: job.type,
      experience: job.experience,
      description: job.description,
      requirements: (job.requirements || []).join('\n'),
      perks: (job.perks || []).join('\n'),
      is_active: job.is_active ? 1 : 0
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this job opening?')) return;
    try {
      await contentAPI.deleteJob(id);
      onReload();
    } catch {
      alert('Failed to delete job.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      requirements: formData.requirements.split('\n').map(s => s.trim()).filter(Boolean),
      perks: formData.perks.split('\n').map(s => s.trim()).filter(Boolean),
      is_active: formData.is_active ? 1 : 0
    };
    try {
      if (editingJob) {
        await contentAPI.updateJob(editingJob.id, payload);
      } else {
        await contentAPI.createJob(payload);
      }
      setModalOpen(false);
      onReload();
    } catch {
      alert('Failed to save job opening.');
    }
  };

  const inp = (props) => (
    <input {...props} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 text-xs" />
  );
  const ta = (props) => (
    <textarea {...props} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs" />
  );
  const sel = (props, children) => (
    <select {...props} className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 text-xs">{children}</select>
  );
  const lbl = (text, el) => (
    <div><label className="block text-slate-300 mb-1 font-mono text-xs">{text}</label>{el}</div>
  );

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="font-pixel text-xs text-cyan-400">TALENT ACQUISITION</div>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-white">CAREERS & JOB OPENINGS</h1>
        </div>
        <button onClick={handleOpenAdd} className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> POST NEW JOB
        </button>
      </div>

      {/* List */}
      <div className="space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="cyber-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="pixel-badge badge-cyan">{job.department}</span>
                <span className={`pixel-badge ${job.is_active ? 'badge-emerald' : 'badge-gold'}`}>
                  {job.is_active ? 'ACTIVE HIRING' : 'ARCHIVED'}
                </span>
                <span className="text-xs font-mono text-slate-400">{job.location} • {job.type}</span>
              </div>
              <h3 className="font-heading font-bold text-xl text-white">{job.title}</h3>
              <p className="text-xs text-slate-400 line-clamp-2 max-w-3xl">{job.description}</p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto flex-shrink-0">
              <button onClick={() => handleOpenEdit(job)} className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-mono flex items-center gap-1.5">
                <Edit className="w-3.5 h-3.5" /> Edit
              </button>
              {isAdmin && (
                <button onClick={() => handleDelete(job.id)} className="p-1.5 rounded bg-red-950/60 hover:bg-red-900 text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingJob ? 'Edit Job Opening' : 'Post New Job Opening'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {lbl('Job Title *', inp({ type: 'text', required: true, value: formData.title, onChange: e => setFormData({ ...formData, title: e.target.value }) }))}
          <div className="grid grid-cols-2 gap-4">
            {lbl('Department *',
              sel({ value: formData.department, onChange: e => setFormData({ ...formData, department: e.target.value }) },
                <>
                  <option>Engineering</option>
                  <option>Art & Animation</option>
                  <option>Design & Narrative</option>
                  <option>Audio</option>
                  <option>Production</option>
                </>
              )
            )}
            {lbl('Location', inp({ type: 'text', value: formData.location, onChange: e => setFormData({ ...formData, location: e.target.value }) }))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {lbl('Work Type', inp({ type: 'text', value: formData.type, onChange: e => setFormData({ ...formData, type: e.target.value }) }))}
            {lbl('Experience Level', inp({ type: 'text', value: formData.experience, onChange: e => setFormData({ ...formData, experience: e.target.value }) }))}
          </div>
          {lbl('Overview Description *', ta({ rows: 3, required: true, value: formData.description, onChange: e => setFormData({ ...formData, description: e.target.value }) }))}
          {lbl('Requirements (one per line)', ta({ rows: 3, value: formData.requirements, onChange: e => setFormData({ ...formData, requirements: e.target.value }) }))}
          {lbl('Perks & Benefits (one per line)', ta({ rows: 2, value: formData.perks, onChange: e => setFormData({ ...formData, perks: e.target.value }) }))}
          <div className="flex items-center gap-2 pt-1">
            <input type="checkbox" id="activeJobCheck" checked={Boolean(formData.is_active)} onChange={e => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })} className="w-4 h-4 rounded" />
            <label htmlFor="activeJobCheck" className="text-slate-300 font-mono text-xs">Accept Applications (Status: Open)</label>
          </div>
          <button type="submit" className="w-full cyber-btn cyber-btn-cyan py-3 text-xs">SAVE JOB POSITION</button>
        </form>
      </Modal>

    </div>
  );
}
