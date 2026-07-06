import React, { useState, useEffect } from 'react';
import { Search, Plus, MoreVertical, Shield, User, Loader2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';

const AdminUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Storage Modal States
  const [editingUser, setEditingUser] = useState(null);
  const [storageValue, setStorageValue] = useState('');
  const [storageUnit, setStorageUnit] = useState('GB');
  const [updating, setUpdating] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('photographers')
        .select('id, display_name, email, plan, storage_used_bytes, storage_limit_bytes')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatBytes = (bytes) => {
        if (!bytes || bytes <= 0) return '0.00 MB';
        const tbLimit = 1024 * 1024 * 1024 * 1024;
        const gbLimit = 1024 * 1024 * 1024;
        
        if (bytes >= tbLimit) {
          return `${(bytes / tbLimit).toFixed(2)} TB`;
        }
        if (bytes >= gbLimit) {
          return `${(bytes / gbLimit).toFixed(2)} GB`;
        }
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
      };

      const getDisplayTotalStorage = (limitBytes) => {
        return formatBytes(limitBytes);
      };

      const mappedPhotographers = data.map(p => ({
        id: p.id,
        name: p.display_name || 'Unnamed',
        email: p.email,
        plan: p.plan || 'Unknown',
        role: 'Photographer',
        usedStorage: formatBytes(p.storage_used_bytes),
        totalStorage: getDisplayTotalStorage(p.storage_limit_bytes, p.plan),
        rawLimitBytes: p.storage_limit_bytes || 0,
        rawUsedBytes: p.storage_used_bytes || 0
      }));

      setUsers(mappedPhotographers);
    } catch (err) {
      console.error("Error fetching users:", err);
      setError(err.message || 'Failed to load users. Ensure RLS policies allow reading.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateStorage = async (e) => {
    e.preventDefault();
    if (!editingUser || !storageValue) return;

    setUpdating(true);
    try {
      // Calculate bytes based on unit selection
      let multiplier = 1024 * 1024 * 1024; // default GB
      if (storageUnit === 'MB') multiplier = 1024 * 1024;
      if (storageUnit === 'TB') multiplier = 1024 * 1024 * 1024 * 1024;
      
      const newLimitBytes = Math.round(parseFloat(storageValue) * multiplier);
      
      const { error } = await supabase
        .from('photographers')
        .update({ storage_limit_bytes: newLimitBytes })
        .eq('id', editingUser.id);

      if (error) throw error;
      
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      alert(err.message || 'Failed to update storage limit.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1a1a1a] tracking-tight font-serif uppercase">User Management</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage administrators and platform users.</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-[#fdfdfc] p-4 rounded-2xl shadow-sm border border-[#eae8e4] flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search users by name or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#f8f7f4] border border-[#eae8e4] hover:border-[#eae8e4]/80 focus:border-[#1a1a1a] focus:bg-white rounded-xl text-sm outline-none transition-all focus:ring-1 focus:ring-[#1a1a1a]"
          />
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
          <h3 className="text-red-800 font-semibold mb-1">Failed to load users</h3>
          <p className="text-red-600 text-sm max-w-md">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {!error && loading && (
        <div className="bg-[#fdfdfc] rounded-2xl shadow-sm border border-[#eae8e4] h-64 flex flex-col items-center justify-center">
           <Loader2 className="w-8 h-8 text-slate-900 animate-spin mb-4" />
           <p className="text-gray-500 text-sm font-medium">Fetching user records...</p>
        </div>
      )}

      {/* Table */}
      {!error && !loading && (
        <div className="bg-[#fdfdfc] rounded-2xl shadow-sm border border-[#eae8e4] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-[#f9f8f5]/85 border-b border-[#eae8e4]">
                <tr>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">User</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Role</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Plan</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Used Storage</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider">Total Storage</th>
                  <th className="px-6 py-4 font-semibold text-gray-500 tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No users found matching "{searchQuery}"
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-[#f8f7f4]/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center bg-[#f8f7f4] text-slate-600">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{user.name}</p>
                            <p className="text-gray-500 text-xs mt-0.5">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-700 font-medium">{user.role}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 capitalize">{user.plan}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {user.usedStorage}
                      </td>
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {user.totalStorage}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown Menu */}
                        {activeMenuId === user.id && (
                          <div className="absolute right-6 top-10 w-48 bg-white border border-[#eae8e4] rounded-xl shadow-lg py-1 z-20">
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setStorageValue(user.totalStorage.split(' ')[0]);
                                setStorageUnit(user.totalStorage.split(' ')[1] || 'GB');
                                setActiveMenuId(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-[#3c3c3b] hover:bg-[#f8f7f4] transition-colors"
                            >
                              Edit Storage Limit
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Storage Limit Customisation Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#fdfdfc] rounded-2xl max-w-md w-full shadow-xl border border-[#eae8e4] overflow-hidden">
            <div className="px-6 py-4 border-b border-[#eae8e4] flex items-center justify-between">
              <h3 className="font-semibold text-[#1a1a1a]">Customize Storage Limit</h3>
              <button 
                onClick={() => setEditingUser(null)}
                className="p-1 text-gray-400 hover:text-[#3c3c3b] rounded-lg hover:bg-[#f8f7f4] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateStorage} className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">
                  Update storage limit settings for <strong className="text-gray-900">{editingUser.email}</strong>.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-[#3c3c3b]">Storage Capacity</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={storageValue}
                    onChange={(e) => setStorageValue(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-[#eae8e4] rounded-xl focus:ring-2 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] sm:text-sm outline-none transition-all"
                    placeholder="Enter limit"
                  />
                  <select
                    value={storageUnit}
                    onChange={(e) => setStorageUnit(e.target.value)}
                    className="w-24 px-3 py-2 border border-[#eae8e4] rounded-xl bg-[#f8f7f4] focus:ring-2 focus:ring-[#1a1a1a] focus:border-[#1a1a1a] sm:text-sm outline-none transition-all"
                  >
                    <option value="MB">MB</option>
                    <option value="GB">GB</option>
                    <option value="TB">TB</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#eae8e4] mt-6">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-[#eae8e4] text-[#3c3c3b] text-sm font-medium rounded-xl hover:bg-[#f8f7f4] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-4 py-2 bg-[#1a1a1a] text-white text-sm font-medium rounded-xl hover:bg-[#2a2a2a] transition-colors disabled:opacity-75 flex items-center gap-2"
                >
                  {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManagement;
