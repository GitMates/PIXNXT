import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase/client';
import LabSidebarLayout from './LabSidebarLayout';
import LabDashboard from './LabDashboard';
import LabAuth from './LabAuth';
import LabOrderDetail from './LabOrderDetail';
import LabQueue from './LabQueue';
import LabProductionBoard from './LabProductionBoard';
import LabWorksheets from './LabWorksheets';
import LabPrintQueue from './LabPrintQueue';
import LabReadyToDeliver from './LabReadyToDeliver';
import LabQualityControl from './LabQualityControl';
import LabPackagingCenter from './LabPackagingCenter';
import LabInventory from './LabInventory';
import LabEmployeeManagement from './LabEmployeeManagement';
import LabReprintManager from './LabReprintManager';
import LabDispatchHistory from './LabDispatchHistory';
import LabReports from './LabReports';
import LabSettings from './LabSettings';
import LabQualityControlDetailsPage from './LabQualityControlDetailsPage';
import LabArtworkReviewList from './LabArtworkReviewList';
import LabArtworkReviewDetails from './LabArtworkReviewDetails';

// Create a Lab Auth Context
export const LabAuthContext = createContext(null);

export const useLabAuth = () => useContext(LabAuthContext);

function LabShell() {
    const { labUser, logout } = useLabAuth();
    
    if (!labUser) {
        return <Navigate to="/lab/auth" replace />;
    }

    return (
        <LabSidebarLayout labUser={labUser} onLogout={logout}>
            <Outlet />
        </LabSidebarLayout>
    );
}

const LabApp = () => {
    const navigate = useNavigate();
    const [labUser, setLabUser] = useState(() => {
        try {
            const cached = localStorage.getItem('pixnxt_lab_session');
            return cached ? JSON.parse(cached) : null;
        } catch (e) {
            return null;
        }
    });

    const [orders, setOrders] = useState([]);
    const [orderItems, setOrderItems] = useState([]);
    const [initialLoaded, setInitialLoaded] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [inventory, setInventory] = useState([]);

    const logout = () => {
        localStorage.removeItem('pixnxt_lab_session');
        setLabUser(null);
        navigate('/lab/auth', { replace: true });
    };

    // Dynamic fetch functions
    const fetchEmployees = async () => {
        try {
            const { data, error } = await supabase.from('printstore_lab_employees').select('*');
            if (error) throw error;
            setEmployees(data || []);
        } catch (e) {
            console.error('Error loading employees:', e);
        }
    };

    const fetchInventory = async () => {
        try {
            const { data, error } = await supabase.from('printstore_inventory').select('*');
            if (error) throw error;
            setInventory(data || []);
        } catch (e) {
            console.error('Error loading inventory:', e);
        }
    };
    const fetchOrders = async () => {
        try {
            const { data: ordersData, error: ordersError } = await supabase
                .from('printstore_orders')
                .select('*')
                .order('created_at', { ascending: false });

            if (ordersError) throw ordersError;

            const { data: itemsData, error: itemsError } = await supabase
                .from('printstore_order_items')
                .select('*');

            if (itemsError) throw itemsError;

            setOrders(ordersData || []);
            setOrderItems(itemsData || []);
            setInitialLoaded(true);
        } catch (e) {
            console.error('Error fetching orders:', e);
        }
    };

    useEffect(() => {
        const checkSession = () => {
            try {
                const cached = localStorage.getItem('pixnxt_lab_session');
                setLabUser(cached ? JSON.parse(cached) : null);
            } catch (e) {
                setLabUser(null);
            }
        };
        
        window.addEventListener('storage', checkSession);
        fetchEmployees();
        fetchInventory();
        fetchOrders(); // Fetch orders on app mount!

        return () => window.removeEventListener('storage', checkSession);
    }, []);

    const authContextValue = {
        labUser,
        setLabUser,
        logout,
        orders,
        setOrders,
        orderItems,
        setOrderItems,
        initialLoaded,
        setInitialLoaded,
        employees,
        setEmployees,
        inventory,
        setInventory,
        refreshEmployees: fetchEmployees,
        refreshInventory: fetchInventory,
        refreshOrders: fetchOrders
    };

    return (
        <LabAuthContext.Provider value={authContextValue}>
            <style>{`
                @keyframes lab-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .lab-spinner {
                    width: 40px;
                    height: 40px;
                    border: 3.5px solid rgba(148, 163, 184, 0.25);
                    border-top: 3.5px solid #64748b;
                    border-radius: 50%;
                    animation: lab-spin 0.9s linear infinite;
                    display: inline-block;
                }
            `}</style>
            <Routes>
                <Route path="auth" element={
                    labUser ? <Navigate to="/lab/dashboard" replace /> : <LabAuth />
                } />
                <Route element={<LabShell />}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<LabDashboard />} />
                    <Route path="queue" element={<LabQueue />} />
                    <Route path="orders/:orderId" element={<LabOrderDetail />} />
                    <Route path="production" element={<LabProductionBoard />} />
                    <Route path="worksheets" element={<LabWorksheets />} />
                    <Route path="print-queue" element={<LabPrintQueue />} />
                    <Route path="ready-to-deliver" element={<LabReadyToDeliver />} />
                    <Route path="quality-control" element={<LabQualityControl />} />
                    <Route path="quality-control/:orderId" element={<LabQualityControlDetailsPage />} />
                    <Route path="packaging" element={<LabPackagingCenter />} />
                    <Route path="inventory" element={<LabInventory />} />
                    <Route path="employees" element={<LabEmployeeManagement />} />
                    <Route path="reprints" element={<LabReprintManager />} />
                    <Route path="dispatch-history" element={<LabDispatchHistory />} />
                    <Route path="artwork-review" element={<LabArtworkReviewList />} />
                    <Route path="artwork-review/:orderId" element={<LabArtworkReviewDetails />} />
                    <Route path="reports" element={<LabReports />} />
                    <Route path="settings" element={<LabSettings />} />
                </Route>
                <Route path="*" element={<Navigate to="/lab/dashboard" replace />} />
            </Routes>
        </LabAuthContext.Provider>
    );
};

export default LabApp;
