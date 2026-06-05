import React from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LabSidebarLayout from './LabSidebarLayout';
import LabDashboard from './LabDashboard';

function LabShell() {
    return (
        <LabSidebarLayout>
            <Outlet />
        </LabSidebarLayout>
    );
}

const LabApp = () => (
    <Routes>
        <Route element={<LabShell />}>
            <Route index element={<Navigate to="orders" replace />} />
            <Route path="orders" element={<LabDashboard />} />
            {/* Future routes like production or shipped could go here */}
            <Route path="production" element={
                <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    <h2>Production view coming soon</h2>
                </div>
            } />
        </Route>
        <Route path="*" element={<Navigate to="/lab/orders" replace />} />
    </Routes>
);

export default LabApp;
