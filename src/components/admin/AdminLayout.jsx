import React, { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ChevronDown, User, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase/client';
import { getUserDisplayLabel, getUserInitial } from '../../lib/userInitials';

const AdminLayout = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);

  const userInitial = getUserInitial(user);
  const userDisplayLabel = getUserDisplayLabel(user);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setShowProfileDropdown(false);
      }
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
  ];

  const renderProfileDropdown = () => (
    <div className="absolute bottom-full left-0 mb-2 w-[280px] rounded-2xl bg-white shadow-xl shadow-black/10 z-[500] py-1 border border-[#ECEAE6] animate-[cgFadeIn_0.15s_ease]">
      <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-medium bg-[#1A1A1A] text-white">
          {userInitial}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="text-base font-medium text-[#1A1A1A] truncate">{userDisplayLabel}</div>
          <div className="text-sm text-[#71717A] truncate">{user?.email}</div>
        </div>
      </div>

      <div
        className="px-5 py-3 text-base text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
        onClick={() => {
          navigate('/admin/users');
          setShowProfileDropdown(false);
        }}
      >
        <Users className="w-[18px] h-[18px] text-gray-500" />
        User Management
      </div>

      <div
        className="px-5 py-3 text-base text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mb-1 border-t border-[#eeeeee] mt-1"
        onClick={async () => {
          try {
            await handleLogout();
            setShowProfileDropdown(false);
          } catch (err) {
            console.error('Logout failed', err);
          }
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Log Out
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f8f7f4] text-[#3c3c3b] font-inter overflow-hidden">
      {/* Sidebar / Drawer */}
      <aside className="w-64 bg-[#f9f8f5] border-r border-[#eae8e4] flex flex-col hidden md:flex">
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-[#eae8e4]/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
              <img src="/Logo_Final-01.png" alt="Pixnxt" className="w-5 h-5 object-contain invert" />
            </div>
            <span className="font-bold text-lg text-gray-900 tracking-tight font-serif uppercase">PIXNXT Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1a1a1a] text-white shadow-md'
                    : 'text-[#71717a] hover:bg-[#eae8e4]/40 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        {/* User / Logout Dropdown Trigger Area */}
        <div className="p-4 border-t border-[#eae8e4]/80">
          <div className="relative" ref={profileDropdownRef}>
            <button
              type="button"
              onClick={() => setShowProfileDropdown((v) => !v)}
              className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-[#1A1A1A]/5"
            >
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#1A1A1A] text-sm font-semibold text-white">
                {userInitial}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#1A1A1A]">{userDisplayLabel}</span>
              <ChevronDown className={`size-4 text-gray-500 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
            </button>
            {showProfileDropdown && renderProfileDropdown()}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header (visible only on small screens) */}
        <header className="md:hidden h-16 bg-[#f9f8f5] border-b border-[#eae8e4] flex items-center justify-between px-4 shadow-sm z-10">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-[#1a1a1a] rounded-lg flex items-center justify-center">
              <img src="/Logo_Final-01.png" alt="Pixnxt" className="w-5 h-5 object-contain invert" />
            </div>
            <span className="font-bold text-gray-900 font-serif uppercase">Admin</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-red-600 rounded-lg bg-red-50">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
