import React from 'react';

const AdminDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight font-serif uppercase">Overview</h1>
        <p className="text-gray-500 mt-1">Welcome to the PIXNXT administrative control panel.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder Stat Cards */}
        <div className="bg-[#fdfdfc] p-6 rounded-2xl shadow-sm border border-[#eae8e4] flex flex-col justify-between">
          <h3 className="text-sm font-medium text-gray-500">Total Photographers</h3>
          <p className="text-3xl font-bold text-gray-900 mt-4">---</p>
        </div>
        <div className="bg-[#fdfdfc] p-6 rounded-2xl shadow-sm border border-[#eae8e4] flex flex-col justify-between">
          <h3 className="text-sm font-medium text-gray-500">Active Collections</h3>
          <p className="text-3xl font-bold text-gray-900 mt-4">---</p>
        </div>
        <div className="bg-[#fdfdfc] p-6 rounded-2xl shadow-sm border border-[#eae8e4] flex flex-col justify-between">
          <h3 className="text-sm font-medium text-gray-500">Storage Used</h3>
          <p className="text-3xl font-bold text-gray-900 mt-4">---</p>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
