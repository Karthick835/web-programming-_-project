import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('System Glitch Caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07080f] text-[#e8ecff] flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0d0f1d] border border-[#ff0055]/50 rounded-xl p-8 shadow-[0_0_50px_rgba(255,0,85,0.2)] text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#ff0055]/10 border border-[#ff0055]/30 flex items-center justify-center text-3xl">
              ⚠️
            </div>
            
            <div className="space-y-2">
              <span className="pixel-badge badge-red text-[10px] tracking-wider">SYSTEM MALFUNCTION</span>
              <h2 className="font-heading text-2xl font-bold text-white">SUBSYSTEM ERROR DETECTED</h2>
              <p className="text-xs text-[#8a93b8] font-sans leading-relaxed">
                A temporary glitch occurred while rendering this sector. The kernel has prevented a full system shutdown.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-black/60 rounded border border-red-900/40 text-left font-mono text-[11px] text-red-400 overflow-x-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button
                onClick={this.handleReload}
                className="cyber-btn cyber-btn-cyan py-2.5 px-5 text-xs font-mono"
              >
                REBOOT SECTOR
              </button>
              <button
                onClick={this.handleReset}
                className="cyber-btn cyber-btn-outline py-2.5 px-5 text-xs font-mono"
              >
                RETURN HOME
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
