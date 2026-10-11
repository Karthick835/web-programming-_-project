import React, { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle2, AlertCircle, Terminal } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import { contentAPI } from '../services/api';
import { trackEvent } from '../services/tracker';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'Publishing & Partnership',
    message: '',
    website: '' // honeypot — hidden from humans
  });

  const [submitting, setSubmitting] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const subjects = [
    'Publishing & Partnership',
    'Press & Media Inquiries',
    'Community & Beta Playtests',
    'Licensing & Soundtrack Audio',
    'General Transmission'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      await contentAPI.sendMessage(formData);
      trackEvent('form_submit', '/contact', {
        type: 'contact_message',
        subject: formData.subject,
        sender: formData.name
      });
      setSentSuccess(true);
      setFormData({ name: '', email: '', subject: 'Publishing & Partnership', message: '', website: '' });
    } catch (err) {
      const msg = err?.response?.data?.error || 'Failed to transmit message. Please verify fields and try again.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-container py-12 md:py-16 space-y-16">
      
      {/* 1. Header */}
      <SectionHeading
        badge="SIGNAL UPLINK"
        title="TRANSMIT A MESSAGE"
        subtitle="Whether you are a publisher, streamer, prospective partner, or fellow developer, our communications frequency is open."
        align="center"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-10">
        
        {/* Left Col: Contact Info & Hubs */}
        <div className="space-y-6">
          <div className="cyber-card p-6 space-y-6 hud-corner">
            <h3 className="font-pixel text-xs text-[#00f0ff] uppercase tracking-wider">
              STUDIO HEADQUARTERS
            </h3>
            
            <div className="space-y-4 text-xs sm:text-sm font-sans">
              <div className="flex items-start gap-3.5">
                <MapPin className="w-5 h-5 text-[#ff0a78] flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <div className="font-bold text-[#e8ecff]">San Francisco HQ</div>
                  <div className="text-[#8a93b8]">555 Mission St, Suite 2400, San Francisco, CA</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <MapPin className="w-5 h-5 text-[#00f0ff] flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <div className="font-bold text-[#e8ecff]">Tokyo Studio Hub</div>
                  <div className="text-[#8a93b8]">Shibuya Stream Tower 12F, Shibuya-ku, Tokyo, Japan</div>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <Mail className="w-5 h-5 text-[#00ff88] flex-shrink-0 mt-0.5" strokeWidth={2} />
                <div>
                  <div className="font-bold text-[#e8ecff]">Direct Transmissions</div>
                  <div className="text-[#8a93b8]">contact@pixelforge.io</div>
                  <div className="text-[#8a93b8]">press@pixelforge.io</div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#07080f] rounded border border-slate-800 text-[11px] font-mono text-[#8a93b8] space-y-1">
              <div className="text-[#00f0ff] flex items-center gap-1.5">
                <Terminal className="w-4 h-4" strokeWidth={2} />
                PGP Key Fingerprint:
              </div>
              <div className="break-all text-[10px] text-[#5a6488]">
                4F9B 22C1 88A3 91D0 E54B 77A2 BB01 C94E 3320 A101
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Form */}
        <div className="lg:col-span-2">
          <div className="cyber-card p-6 sm:p-10 space-y-6">
            
            {sentSuccess ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 bg-[#00ff88]/20 text-[#00ff88] rounded-full flex items-center justify-center mx-auto border border-[#00ff88]/50 shadow-[0_0_20px_rgba(0,255,136,0.3)]">
                  <CheckCircle2 className="w-8 h-8" strokeWidth={2} />
                </div>
                <h3 className="font-heading text-2xl font-bold text-[#e8ecff]">Transmission Acknowledged!</h3>
                <p className="text-xs sm:text-sm text-[#8a93b8] max-w-md mx-auto font-sans">
                  Your message has been routed to the appropriate studio lead. Expected response latency: under 24 Earth hours.
                </p>
                <button
                  onClick={() => setSentSuccess(false)}
                  className="cyber-btn cyber-btn-cyan text-xs py-2.5 px-6"
                >
                  SEND ANOTHER TRANSMISSION
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 text-xs sm:text-sm font-sans">
                {/* Honeypot field — visually hidden from real users */}
                <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                  <label htmlFor="website_hp">Website</label>
                  <input
                    id="website_hp"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[#8a93b8] mb-1.5 font-mono text-xs">Your Name / Handle *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Marcus Wright"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-[#07080f] border border-slate-700 rounded px-3.5 py-2.5 text-[#e8ecff] focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#8a93b8] mb-1.5 font-mono text-xs">Return Frequency (Email) *</label>
                    <input
                      type="email"
                      required
                      placeholder="pilot@domain.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-[#07080f] border border-slate-700 rounded px-3.5 py-2.5 text-[#e8ecff] focus:outline-none focus:border-[#00f0ff]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#8a93b8] mb-1.5 font-mono text-xs">Transmission Subject *</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-[#07080f] border border-slate-700 rounded px-3.5 py-2.5 text-[#e8ecff] focus:outline-none focus:border-[#00f0ff]"
                  >
                    {subjects.map((sub, idx) => (
                      <option key={idx} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#8a93b8] mb-1.5 font-mono text-xs">Message Payload *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Enter your message, proposal, or inquiry here..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[#07080f] border border-slate-700 rounded px-3.5 py-2.5 text-[#e8ecff] focus:outline-none focus:border-[#00f0ff]"
                  />
                </div>

                {errorMsg && (
                  <div className="flex items-center gap-2 text-xs font-mono text-red-400 bg-red-950/30 border border-red-800/50 rounded p-3">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {errorMsg}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto cyber-btn cyber-btn-cyan py-3.5 px-8 text-xs flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" strokeWidth={2} />
                  {submitting ? 'TRANSMITTING...' : 'DISPATCH TRANSMISSION'}
                </button>
              </form>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
