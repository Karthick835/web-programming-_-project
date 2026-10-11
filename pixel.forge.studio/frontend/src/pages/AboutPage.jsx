import React from 'react';
import { Shield, Sparkles, Cpu, Target, Flag, Layers, Terminal, CheckCircle2 } from 'lucide-react';
import SectionHeading from '../components/ui/SectionHeading';

export default function AboutPage({ setActivePage }) {
  const milestones = [
    {
      year: '2020',
      title: 'The Underground Game Jam',
      badge: 'ORIGINS',
      description: 'Elena Chen and Marcus Vance win 1st place in the Tokyo Retro Game Jam with a 48-hour prototype that would become the foundation of Chrono Rift.'
    },
    {
      year: '2022',
      title: 'Chrono Rift: Commercial Launch',
      badge: 'MILESTONE',
      description: 'Chrono Rift launches globally on Steam and Nintendo Switch, selling 300,000 copies in 90 days and winning "Best Indie Debut" at the Global Gaming Awards.'
    },
    {
      year: '2024',
      title: 'Expanding the Multiverse',
      badge: 'SCALE',
      description: 'The studio expands to 25 remote-first developers and reveals CyberVanguard 2099 at the Tokyo Game Show to ecstatic critical reception.'
    },
    {
      year: '2025',
      title: 'CyberVanguard Hits 1M+ Pilots',
      badge: 'TRIUMPH',
      description: 'CyberVanguard 2099 tops global Steam charts, receiving a 98% overwhelmingly positive rating and solidifying Pixel Forge as an indie powerhouse.'
    },
    {
      year: '2027+',
      title: 'Project Aetheria & Skyforge Engine',
      badge: 'FUTURE',
      description: 'Pioneering open-world voxel physics and modular mecha combat in our custom proprietary C++ engine.'
    }
  ];

  return (
    <div className="page-container py-12 md:py-16 space-y-20 md:space-y-28">
      
      {/* 1. Header Hero */}
      <SectionHeading
        badge="STUDIO MANIFESTO"
        title="THE PIXEL FORGE STORY"
        subtitle="Born from arcade nostalgia and driven by cutting-edge technology, Pixel Forge Studio builds high-octane games that ignite imagination."
        align="center"
      />

      {/* 2. Mission & Tech Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-block px-3 py-1 bg-[rgba(0,240,255,0.12)] border border-[#00f0ff]/40 rounded text-xs font-mono text-[#00f0ff]">
            ENGINEERING EXCELLENCE
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-[#e8ecff] leading-tight">
            We don't make games for algorithms. We make games for players.
          </h2>
          <p className="text-xs sm:text-sm text-[#8a93b8] leading-relaxed font-sans">
            In an era of generic live-service clones, Pixel Forge stands for craft, precision, and passion. We believe pixel art is not an outdated constraint, but a timeless fine art discipline that allows for supreme readability and expressive kinetic impact.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="cyber-card p-5 space-y-2">
              <div className="font-pixel text-xs text-[#00f0ff]">01. TACTILE FEEL</div>
              <p className="text-xs text-[#8a93b8]">Crisp frame-data, custom hit-stop buffers, and zero input lag.</p>
            </div>
            <div className="cyber-card p-5 space-y-2">
              <div className="font-pixel text-xs text-[#ff0a78]">02. SYNTH AESTHETICS</div>
              <p className="text-xs text-[#8a93b8]">Original analog synth soundtracks and volumetric lighting.</p>
            </div>
          </div>
        </div>

        <div className="cyber-card p-6 relative overflow-hidden hud-corner">
          <div className="relative h-80 rounded overflow-hidden bg-slate-950 border border-[#00f0ff]/30">
            <img
              src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80"
              alt="Pixel Forge Studio Tech"
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-xs font-mono text-[#00f0ff] bg-black/80 p-3.5 rounded border border-slate-800 backdrop-blur space-y-1">
              <div className="flex items-center gap-2 text-[#ff0a78]">
                <Terminal className="w-4 h-4" strokeWidth={2} />
                <span>NeonVoxel Engine Build #2099.4</span>
              </div>
              <div className="text-[11px] text-[#8a93b8]">Deterministic rollback networking & 240 FPS rendering pipeline</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Studio Chronological Timeline */}
      <div className="space-y-12">
        <SectionHeading
          badge="THE JOURNEY"
          title="CHRONOLOGICAL TIMELINE"
          subtitle="From a two-person garage game jam to a globally recognized indie gaming studio."
          align="center"
        />

        <div className="relative border-l-2 border-[#00f0ff]/30 ml-4 md:ml-24 lg:ml-32 space-y-12 pb-6">
          {milestones.map((m, idx) => (
            <div key={idx} className="relative pl-8 sm:pl-10 group">
              {/* Timeline Pin */}
              <div className="absolute -left-[9px] top-2 w-4 h-4 rounded-full bg-[#07080f] border-2 border-[#00f0ff] group-hover:bg-[#00f0ff] group-hover:scale-125 transition-all shadow-[0_0_12px_rgba(0,240,255,0.6)]" />

              <div className="cyber-card p-6 max-w-3xl space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="font-heading text-xl font-bold text-[#00f0ff]">
                    {m.year}
                  </span>
                  <span className="pixel-badge badge-magenta">
                    {m.badge}
                  </span>
                </div>
                <h3 className="font-heading text-lg font-bold text-[#e8ecff]">
                  {m.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#8a93b8] leading-relaxed font-sans">
                  {m.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
