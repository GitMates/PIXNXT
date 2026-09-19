import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ChevronDown, AlertTriangle, Layers, Gauge } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { signOut } from '../../services/auth.service';
import { getUserDisplayLabel, getUserInitial } from '../../lib/userInitials';

const AdminLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);

  const userInitial = getUserInitial(user);
  const userDisplayLabel = getUserDisplayLabel(user);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setShowProfileDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'User Management', path: '/admin/users', icon: Users },
    { name: 'Quotas & Limits', path: '/admin/quotas', icon: Gauge },
    { name: 'Albums & Deliveries', path: '/admin/usage', icon: Layers },
    { name: 'Crash Report', path: '/admin/crashes', icon: AlertTriangle },
  ];

  return (
    <div className="flex h-screen bg-[#f4f2ee] text-[#3c3c3b] overflow-hidden">
      <aside className="w-60 bg-[#141414] text-white flex flex-col hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0">
              <img src="/Logo_Final-01.png" alt="Pixnxt" className="w-5 h-5 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-serif font-bold text-[13px] tracking-wide uppercase truncate">PIXNXT</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider">Admin</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 py-5 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-white text-[#141414] shadow-sm'
                    : 'text-white/65 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px] shrink-0" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setShowProfileDropdown((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/8"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#141414]">
                {userInitial}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white/90">{userDisplayLabel}</span>
              <ChevronDown className={`size-4 text-white/40 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showProfileDropdown && (
              <div className="absolute bottom-full left-0 mb-2 w-[260px] rounded-2xl bg-white shadow-xl shadow-black/20 z-[500] py-1 border border-[#ECEAE6]">
                <div className="px-4 py-3 border-b border-[#eeeeee]">
                  <p className="text-sm font-medium text-[#1A1A1A] truncate">{userDisplayLabel}</p>
                  <p className="text-xs text-[#71717A] truncate">{user?.email}</p>
                </div>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left text-[#444] hover:bg-[#f9f9f9] flex items-center gap-3"
                  onClick={() => { navigate('/admin/users'); setShowProfileDropdown(false); }}
                >
                  <Users className="w-4 h-4 text-gray-500" />
                  User Management
                </button>
                <button
                  type="button"
                  className="w-full px-4 py-3 text-sm text-left text-[#444] hover:bg-[#f9f9f9] flex items-center gap-3 border-t border-[#eeeeee]"
                  onClick={async () => {
                    try {
                      await handleLogout();
                      setShowProfileDropdown(false);
                    } catch (err) {
                      console.error('Logout failed', err);
                    }
                  }}
                >
                  <LogOut className="w-4 h-4 text-gray-500" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative min-w-0">
        <header className="md:hidden h-14 bg-[#141414] text-white flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-white rounded-lg flex items-center justify-center">
              <img src="/Logo_Final-01.png" alt="Pixnxt" className="w-4 h-4 object-contain" />
            </div>
            <span className="font-serif font-bold text-sm uppercase tracking-wide">Admin</span>
          </div>
          <button type="button" onClick={handleLogout} className="p-2 text-white/80 rounded-lg hover:bg-white/10">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="max-w-6xl mx-auto p-4 md:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
