import React, { useState } from 'react';
import { Globe, ExternalLink, UserCheck, Share2, Mail, Link } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';
import EmptyState from '../components/ui/EmptyState';
import Avatar from '../components/ui/Avatar';
import { trackEvent } from '../services/tracker';

const SvgGithub = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
);

const SvgLinkedin = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
);

const SvgTwitter = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);

const SvgInstagram = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
);

const SvgYoutube = () => (
  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
);

// Map platform name to icon component and display label
const PLATFORM_CONFIG = {
  'Website/Portfolio': { Icon: Globe, color: '#00f0ff', label: 'Portfolio' },
  'GitHub': { Icon: SvgGithub, color: '#e8ecff', label: 'GitHub' },
  'LinkedIn': { Icon: SvgLinkedin, color: '#0a66c2', label: 'LinkedIn' },
  'X/Twitter': { Icon: SvgTwitter, color: '#1d9bf0', label: 'X/Twitter' },
  'Instagram': { Icon: SvgInstagram, color: '#e1306c', label: 'Instagram' },
  'YouTube': { Icon: SvgYoutube, color: '#ff0000', label: 'YouTube' },
  'ArtStation': { Icon: Globe, color: '#13aff0', label: 'ArtStation' },
  'Behance': { Icon: Globe, color: '#1769ff', label: 'Behance' },
  'itch.io': { Icon: Globe, color: '#fa5c5c', label: 'itch.io' },
  'Twitch': { Icon: Globe, color: '#9146ff', label: 'Twitch' },
  'Email': { Icon: Mail, color: '#00ff88', label: 'Email' },
};

function SocialIcon({ platform, url }) {
  const config = PLATFORM_CONFIG[platform] || { Icon: ExternalLink, color: '#8a93b8', label: platform };
  const { Icon, color, label } = config;
  return (
    <a
      href={platform === 'Email' ? `mailto:${url}` : url}
      target={platform === 'Email' ? '_self' : '_blank'}
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className="transition-all hover:scale-110"
      style={{ color: '#8a93b8' }}
      onMouseEnter={e => e.currentTarget.style.color = color}
      onMouseLeave={e => e.currentTarget.style.color = '#8a93b8'}
    >
      <Icon className="w-4 h-4" strokeWidth={2} />
    </a>
  );
}

export default function TeamPage({ team }) {
  const [selectedDept, setSelectedDept] = useState('All');
  const [toastMsg, setToastMsg] = useState('');

  const departments = ['All', 'Leadership', 'Engineering', 'Art & Animation', 'Audio', 'Design'];

  const filteredTeam = team.filter((m) => {
    if (selectedDept === 'All') return true;
    return m.department.toLowerCase().includes(selectedDept.toLowerCase());
  });

  const handleDeptChange = (dept) => {
    setSelectedDept(dept);
    trackEvent('click', '/team', { filter_department: dept });
  };

  const handleShareMember = (member) => {
    const url = `${window.location.origin}/team#${member.name.toLowerCase().replace(/\s+/g, '-')}`;
    navigator.clipboard.writeText(url).then(() => {
      setToastMsg(`Link copied for ${member.name}!`);
      setTimeout(() => setToastMsg(''), 2500);
    }).catch(() => {
      setToastMsg('Copy failed — try manually copying the URL.');
      setTimeout(() => setToastMsg(''), 2500);
    });
    trackEvent('click', '/team', { action: 'share_member', member: member.name });
  };

  // Parse social_links: may be [] array or {} object (handle both for safety)
  const getSocialLinks = (member) => {
    const raw = member.social_links;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(l => l.platform && l.url);
    if (typeof raw === 'object') {
      return Object.entries(raw)
        .filter(([, url]) => url)
        .map(([platform, url]) => ({ platform, url }));
    }
    return [];
  };

  return (
    <div className="page-container py-12 md:py-16 space-y-12">
      
      {/* Header */}
      <SectionHeading
        badge="THE MINDS BEHIND THE PIXELS"
        title="MEET THE SQUAD"
        subtitle="A passionate collective of veteran designers, shader engineers, retro illustrators, and synth musicians."
        align="center"
      />

      {/* Department Filter Tabs */}
      <div className="flex items-center justify-center gap-2.5 flex-wrap pb-2">
        {departments.map((dept) => (
          <button
            key={dept}
            onClick={() => handleDeptChange(dept)}
            className={`px-4 py-2 rounded text-xs font-mono uppercase tracking-wider transition-all cursor-pointer ${
              selectedDept === dept
                ? 'bg-gradient-to-r from-[#00f0ff] to-blue-600 text-black font-bold shadow-[0_0_16px_rgba(0,240,255,0.4)]'
                : 'bg-[#0f1224] text-[#8a93b8] hover:text-[#00f0ff] border border-slate-800'
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Team Cards Grid */}
      {filteredTeam.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredTeam.map((member) => {
            const socialLinks = getSocialLinks(member);
            return (
              <div
                key={member.id}
                id={member.name.toLowerCase().replace(/\s+/g, '-')}
                className="cyber-card flex flex-col justify-between space-y-6"
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    name={member.name}
                    role={member.role}
                    size="lg"
                    className="rounded-lg shadow-[0_0_12px_rgba(0,240,255,0.25)]"
                  />

                  <div className="space-y-1">
                    <span className="pixel-badge badge-cyan text-[8px]">
                      {member.department}
                    </span>
                    <h3 className="font-heading font-bold text-lg text-[#e8ecff]">
                      {member.name}
                    </h3>
                    <div className="text-xs font-mono text-[#ff0a78]">
                      {member.role}
                    </div>
                    {/* Verified Dev badge — only if is_verified is true */}
                    {member.is_verified && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#00ff88]">
                        <UserCheck className="w-3 h-3" strokeWidth={2.5} />
                        Verified Dev
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#8a93b8] leading-relaxed font-sans">
                  {member.bio}
                </p>

                {/* Social Links — only rendered if links exist */}
                <div className="pt-4 border-t border-[rgba(0,240,255,0.15)] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {socialLinks.length > 0 ? (
                      socialLinks.map((link, i) => (
                        <SocialIcon key={i} platform={link.platform} url={link.url} />
                      ))
                    ) : (
                      <span className="text-[10px] font-mono text-[#3a4468] italic">No links added</span>
                    )}
                  </div>

                  {/* Share button */}
                  <button
                    onClick={() => handleShareMember(member)}
                    title="Copy link to this profile section"
                    className="p-1.5 rounded hover:bg-slate-800 text-slate-600 hover:text-cyan-400 transition-colors"
                  >
                    <Link className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Team Members Found"
          description="No team members match this department filter."
          actionLabel="View All Departments"
          onAction={() => setSelectedDept('All')}
        />
      )}

      {/* Copy link toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0a0d18] border border-cyan-400/60 text-cyan-300 text-xs font-mono px-5 py-2.5 rounded shadow-[0_0_20px_rgba(0,240,255,0.3)] animate-fade-in">
          {toastMsg}
        </div>
      )}

    </div>
  );
}
