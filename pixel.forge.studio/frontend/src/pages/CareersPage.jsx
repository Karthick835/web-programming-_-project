import React, { useState } from 'react';
import { Briefcase, MapPin, Clock, DollarSign, Sparkles, Send, CheckCircle2 } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import Modal from '../components/ui/Modal';
import { contentAPI } from '../services/api';
import { trackEvent } from '../services/tracker';

export default function CareersPage({ jobs }) {
  const [selectedJob, setSelectedJob] = useState(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    applicant_name: '',
    email: '',
    portfolio_url: '',
    resume_path: '',
    cover_note: ''
  });

  const handleOpenApply = (job) => {
    setSelectedJob(job);
    setSubmittedSuccess(false);
    setApplyModalOpen(true);
    trackEvent('click', '/careers', { action: 'open_apply_modal', job: job.title });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await contentAPI.submitApplication({
        job_id: selectedJob?.id,
        job_title: selectedJob?.title,
        applicant_name: formData.applicant_name,
        email: formData.email,
        portfolio_url: formData.portfolio_url,
        resume_path: formData.resume_path || 'Uploaded via web portal',
        cover_note: formData.cover_note
      });

      trackEvent('form_submit', '/careers', {
        type: 'job_application',
        job_title: selectedJob?.title,
        applicant: formData.applicant_name
      });

      setSubmittedSuccess(true);
      setFormData({ applicant_name: '', email: '', portfolio_url: '', resume_path: '', cover_note: '' });
    } catch (err) {
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container py-12 md:py-16 space-y-16">
      
      {/* 1. Header */}
      <SectionHeading
        badge="RECRUITMENT MATRIX"
        title="JOIN THE REBELLION"
        subtitle="We are building the next generation of stylized gaming masterpieces. If you are obsessed with game feel, shader magic, and player delight, we want you on our team."
        align="center"
      />

      {/* 2. Perks Strip (4-Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#0f1224]/80 p-6 rounded-lg border border-[rgba(0,240,255,0.18)] text-center space-y-1.5 backdrop-blur-md">
          <div className="font-pixel text-xs text-[#00f0ff]">100% REMOTE</div>
          <div className="text-xs text-[#8a93b8]">Work from anywhere across Earth</div>
        </div>
        <div className="bg-[#0f1224]/80 p-6 rounded-lg border border-[rgba(255,10,120,0.18)] text-center space-y-1.5 backdrop-blur-md">
          <div className="font-pixel text-xs text-[#ff0a78]">PROFIT SHARING</div>
          <div className="text-xs text-[#8a93b8]">Direct royalties on all shipped games</div>
        </div>
        <div className="bg-[#0f1224]/80 p-6 rounded-lg border border-[rgba(0,255,136,0.18)] text-center space-y-1.5 backdrop-blur-md">
          <div className="font-pixel text-xs text-[#00ff88]">HARDWARE RIG</div>
          <div className="text-xs text-[#8a93b8]">RTX 4090 / M3 Max rig provided</div>
        </div>
        <div className="bg-[#0f1224]/80 p-6 rounded-lg border border-[rgba(255,212,0,0.18)] text-center space-y-1.5 backdrop-blur-md">
          <div className="font-pixel text-xs text-[#ffd400]">UNLIMITED GAMING</div>
          <div className="text-xs text-[#8a93b8]">Research Steam wallet credits</div>
        </div>
      </div>

      {/* 3. Job Openings */}
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-[#e8ecff]">
            OPEN POSITIONS ({jobs.length})
          </h2>
          <span className="text-xs font-mono text-[#00ff88] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-ping"></span>
            Positions Actively Interviewing
          </span>
        </div>

        <div className="space-y-6">
          {jobs.map((job) => (
            <div key={job.id} className="cyber-card p-6 sm:p-8 space-y-6 hud-corner">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="pixel-badge badge-cyan">{job.department}</span>
                    <span className="pixel-badge badge-emerald">{job.type}</span>
                  </div>
                  <h3 className="font-heading text-2xl font-bold text-[#e8ecff]">
                    {job.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-mono text-[#8a93b8] mt-2 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-[#ff0a78]" strokeWidth={2} />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#00f0ff]" strokeWidth={2} />
                      {job.experience}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenApply(job)}
                  className="cyber-btn cyber-btn-cyan text-xs py-3 px-6 self-start md:self-auto flex-shrink-0"
                >
                  APPLY FOR ROLE &rarr;
                </button>
              </div>

              <p className="text-xs sm:text-sm text-[#8a93b8] leading-relaxed font-sans">
                {job.description}
              </p>

              {/* Requirements & Perks Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[rgba(0,240,255,0.15)] text-xs font-sans">
                <div>
                  <h4 className="font-mono text-[#00f0ff] font-semibold mb-2.5 uppercase tracking-wider">Core Requirements</h4>
                  <ul className="space-y-1.5 text-[#8a93b8] list-disc list-inside">
                    {(job.requirements || []).map((req, idx) => (
                      <li key={idx} className="leading-relaxed">{req}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-mono text-[#ff0a78] font-semibold mb-2.5 uppercase tracking-wider">Role Benefits</h4>
                  <ul className="space-y-1.5 text-[#8a93b8] list-disc list-inside">
                    {(job.perks || []).map((perk, idx) => (
                      <li key={idx} className="leading-relaxed">{perk}</li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>
          ))}
        </div>
      </div>

      {/* 4. Application Modal */}
      <Modal
        isOpen={applyModalOpen}
        onClose={() => setApplyModalOpen(false)}
        title={submittedSuccess ? "Application Status" : `Apply: ${selectedJob?.title || ''}`}
        size="md"
        isDirty={!submittedSuccess && Boolean(formData.applicant_name || formData.email || formData.portfolio_url || formData.cover_note)}
      >
        {submittedSuccess ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-[#00ff88]/20 text-[#00ff88] rounded-full flex items-center justify-center mx-auto border border-[#00ff88]/50">
              <CheckCircle2 className="w-8 h-8" strokeWidth={2} />
            </div>
            <h3 className="font-heading text-2xl font-bold text-[#e8ecff]">Application Transmitted!</h3>
            <p className="text-xs text-[#8a93b8] font-sans">
              Thank you for applying for <strong>{selectedJob?.title}</strong>. Our director will review your dossier within 48 hours.
            </p>
            <button
              onClick={() => setApplyModalOpen(false)}
              className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-6"
            >
              CLOSE TRANSMISSION
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <span className="pixel-badge badge-cyan text-[9px] mb-2 inline-block">APPLICATION FORM</span>
              <div className="text-xs font-mono text-[#8a93b8]">{selectedJob?.department} • {selectedJob?.location}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
              <div>
                <label className="block text-[#8a93b8] mb-1 font-mono">Full Legal / Alias Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Rivera"
                  value={formData.applicant_name}
                  onChange={(e) => setFormData({ ...formData, applicant_name: e.target.value })}
                  className="w-full bg-[#07080f] border border-slate-700 rounded px-3 py-2 text-[#e8ecff] focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="block text-[#8a93b8] mb-1 font-mono">Contact Email *</label>
                <input
                  type="email"
                  required
                  placeholder="pilot@domain.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-[#07080f] border border-slate-700 rounded px-3 py-2 text-[#e8ecff] focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="block text-[#8a93b8] mb-1 font-mono">Portfolio / GitHub / ArtStation Link *</label>
                <input
                  type="url"
                  required
                  placeholder="https://artstation.com/yourhandle or https://github.com/yourhandle"
                  value={formData.portfolio_url}
                  onChange={(e) => setFormData({ ...formData, portfolio_url: e.target.value })}
                  className="w-full bg-[#07080f] border border-slate-700 rounded px-3 py-2 text-[#e8ecff] focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <div>
                <label className="block text-[#8a93b8] mb-1 font-mono">Brief Cover Note / Why Pixel Forge?</label>
                <textarea
                  rows={3}
                  placeholder="Tell us about your favorite game mechanic or project you are most proud of..."
                  value={formData.cover_note}
                  onChange={(e) => setFormData({ ...formData, cover_note: e.target.value })}
                  className="w-full bg-[#07080f] border border-slate-700 rounded px-3 py-2 text-[#e8ecff] focus:outline-none focus:border-[#00f0ff]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full cyber-btn cyber-btn-cyan py-3 text-xs flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" strokeWidth={2} />
                {submitting ? 'TRANSMITTING APPLICATION...' : 'SUBMIT CANDIDACY'}
              </button>
            </form>
          </div>
        )}
      </Modal>

    </div>
  );
}
