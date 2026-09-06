import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase/client';
import { AppSpinner } from '../../components/ui/AppLoading';

const formatBytes = (bytes) => {
  if (!bytes || bytes <= 0) return '0 MB';
  const tb = 1024 * 1024 * 1024 * 1024;
  const gb = 1024 * 1024 * 1024;
  const mb = 1024 * 1024;
  if (bytes >= tb) return `${(bytes / tb).toFixed(2)} TB`;
  if (bytes >= gb) return `${(bytes / gb).toFixed(2)} GB`;
  return `${(bytes / mb).toFixed(1)} MB`;
};

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalPhotographers: null,
    activeDeliveries: null,
    storageUsed: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const loadStats = async () => {
      try {
        const [photographersRes, deliveriesRes, storageRes] = await Promise.all([
          supabase.from('photographers').select('*', { count: 'exact', head: true }),
          supabase.from('deliveries').select('*', { count: 'exact', head: true }),
          supabase.from('photographers').select('storage_used_bytes'),
        ]);

        if (isMounted) {
          const totalStorage = (storageRes.data || []).reduce(
            (sum, p) => sum + (Number(p.storage_used_bytes) || 0),
            0
          );

          setStats({
            totalPhotographers: photographersRes.count ?? 0,
            activeDeliveries: deliveriesRes.count ?? 0,
            storageUsed: formatBytes(totalStorage),
          });
        }
      } catch (err) {
        console.error('Failed to load admin stats:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">Overview</h1>
        <p className="text-gray-500 mt-1">Welcome to the PIXNXT administrative control panel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#fdfdfc] p-6 rounded-2xl shadow-sm border border-[#eae8e4] flex flex-col justify-between min-h-[130px]">
          <h3 className="text-sm font-medium text-gray-500">Total Photographers</h3>
          <p className="text-3xl font-bold text-gray-900 mt-4 flex items-center gap-2">
            {loading ? <AppSpinner size="sm" /> : stats.totalPhotographers ?? '---'}
          </p>
        </div>
        <div className="bg-[#fdfdfc] p-6 rounded-2xl shadow-sm border border-[#eae8e4] flex flex-col justify-between min-h-[130px]">
          <h3 className="text-sm font-medium text-gray-500">Active Deliveries</h3>
          <p className="text-3xl font-bold text-gray-900 mt-4 flex items-center gap-2">
            {loading ? <AppSpinner size="sm" /> : stats.activeDeliveries ?? '---'}
          </p>
        </div>
        <div className="bg-[#fdfdfc] p-6 rounded-2xl shadow-sm border border-[#eae8e4] flex flex-col justify-between min-h-[130px]">
          <h3 className="text-sm font-medium text-gray-500">Storage Used</h3>
          <p className="text-3xl font-bold text-gray-900 mt-4 flex items-center gap-2">
            {loading ? <AppSpinner size="sm" /> : stats.storageUsed ?? '---'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
