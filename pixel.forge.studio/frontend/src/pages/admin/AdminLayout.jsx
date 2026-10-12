import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Split,
  Gamepad2,
  Users,
  Briefcase,
  Mail,
  FileText,
  LogOut,
  ExternalLink,
  Shield,
  Activity,
  Menu,
  X,
  UserCheck,
  BookOpen,
  Key,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../../components/ui/Avatar';
import Modal from '../../components/ui/Modal';
import { contentAPI, authAPI } from '../../services/api';

export default function AdminLayout({ activeTab, setActiveTab, onExitAdmin, children }) {
  const { user, logout, isAdmin } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Change Password state
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPassword.length < 6) {
      setPwError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('New passwords do not match.');
      return;
    }

    setPwLoading(true);
    try {
      const res = await authAPI.changePassword(currentPassword, newPassword);
      setPwSuccess(res.data.message || 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setChangePasswordOpen(false);
        setPwSuccess('');
      }, 2000);
    } catch (err) {
      setPwError(err.response?.data?.error || 'Failed to update password.');
    } finally {
      setPwLoading(false);
    }
  };

  // Poll for unread message count every 60 seconds
  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await contentAPI.getMessages({ status: 'unread' });
        setUnreadCount(res.data.unreadCount || 0);
      } catch (_) {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen]);

  const tabs = [
    { id: 'analytics', label: 'ANALYTICS & FUNNEL', icon: BarChart3, roleRequired: 'editor' },
    { id: 'steam', label: 'STEAM FUNNEL', icon: Activity, roleRequired: 'editor' },
    { id: 'visitors', label: 'VISITOR PROFILES', icon: UserCheck, roleRequired: 'editor' },
    { id: 'experiments', label: 'A/B TESTING STUDIO', icon: Split, roleRequired: 'editor' },
    { id: 'games', label: 'GAMES MANAGER', icon: Gamepad2, roleRequired: 'editor' },
    { id: 'devlogs', label: 'DEVLOGS & UPDATES', icon: BookOpen, roleRequired: 'editor' },
    { id: 'team', label: 'TEAM MANAGER', icon: Users, roleRequired: 'editor' },
    { id: 'jobs', label: 'JOBS & CAREERS', icon: Briefcase, roleRequired: 'editor' },
    { id: 'messages', label: 'CONTACT INBOX', icon: Mail, roleRequired: 'editor', badge: unreadCount },
    { id: 'applications', label: 'APPLICATIONS', icon: FileText, roleRequired: 'editor' },
  ];

  const handleTabClick = (id) => {
    setActiveTab(id);
    setSidebarOpen(false);
    // Refresh unread count when navigating to messages
    if (id === 'messages') {
      contentAPI.getMessages({ status: 'unread' }).then(res => {
        setUnreadCount(res.data.unreadCount || 0);
      }).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col md:flex-row">
      
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/75 backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 1. Admin Sidebar (Desktop & Drawer) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0a0d18] border-r border-cyan-500/20 transform transition-transform duration-300 md:translate-x-0 md:static ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full flex flex-col justify-between p-4">
          
          {/* Brand header */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-pink-500/20 border border-pink-500/50 flex items-center justify-center text-pink-400">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-pixel text-xs text-white">PIXEL FORGE</div>
                  <div className="text-[10px] font-mono text-cyan-400">ADMIN CONTROL</div>
                </div>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white"
                aria-label="Close sidebar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current user badge */}
            <div className="bg-slate-900/90 p-3 rounded border border-slate-800 flex items-center gap-3">
              <Avatar
                name={user?.name || 'Admin User'}
                size="sm"
                className="flex-shrink-0"
              />
              <div className="overflow-hidden">
                <div className="text-xs font-semibold text-white truncate">{user?.name || 'Administrator'}</div>
                <span className={`inline-block text-[9px] font-pixel px-1.5 py-0.5 rounded uppercase ${
                  isAdmin ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                }`}>
                  {user?.role || 'editor'}
                </span>
              </div>
            </div>

            {/* Navigation tabs */}
            <nav className="space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded text-xs font-mono tracking-wider transition-all text-left ${
                      isActive
                        ? 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 border-l-4 border-cyan-400 font-bold shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span className="flex-1">{tab.label}</span>
                    {tab.badge > 0 && (
                      <span className="ml-auto bg-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom actions */}
          <div className="pt-4 border-t border-slate-800/80 space-y-2">
            <button
              onClick={() => {
                setChangePasswordOpen(true);
                setPwError('');
                setPwSuccess('');
              }}
              className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-cyan-400 hover:bg-cyan-950/40 border border-cyan-500/20 transition-all"
            >
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                Change Password
              </span>
              <span className="text-[10px] text-slate-500">&rarr;</span>
            </button>

            <button
              onClick={onExitAdmin}
              className="w-full flex items-center justify-between px-3 py-2 rounded text-xs font-mono text-slate-400 hover:text-cyan-300 hover:bg-slate-900/60 transition-all"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="w-4 h-4" />
                Live Public Site
              </span>
              <span className="text-[10px] text-slate-600">&rarr;</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs font-mono text-red-400 hover:bg-red-950/30 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

        </div>
      </aside>

      {/* 2. Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Mobile top header bar */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[#0a0d18] border-b border-cyan-500/20">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded bg-slate-900 text-cyan-400 border border-slate-700"
              aria-label="Open sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="font-pixel text-xs text-white">PIXEL FORGE HQ</span>
          </div>

          <button
            onClick={onExitAdmin}
            className="text-xs text-cyan-400 font-mono px-2.5 py-1 rounded bg-slate-900 border border-cyan-500/30"
          >
            Exit HQ
          </button>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>

      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setPwError('');
          setPwSuccess('');
        }}
        title="CHANGE STAFF ACCESS KEY"
        size="sm"
      >
        <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs font-sans">
          <p className="text-xs text-slate-400 font-mono">
            Enter your current password to authorize changing your staff security access key.
          </p>

          {pwError && (
            <div className="p-3 bg-red-950/60 border border-red-500/50 rounded text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          {pwSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-500/50 rounded text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{pwSuccess}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 mb-1 font-mono">Current Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-mono">New Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-mono">Confirm New Password</label>
            <div className="relative">
              <Key className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                autoComplete="new-password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-cyan-400 font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setChangePasswordOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pwLoading}
              className="cyber-btn cyber-btn-cyan px-4 py-2 text-xs flex items-center gap-2"
            >
              {pwLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
