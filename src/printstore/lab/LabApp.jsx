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
import LabFrameWorkshop from './LabFrameWorkshop';
import '../../styles/clientGalleryTheme.css';
import './labTheme.css';
import { filterLabPhysicalItems } from './labPhotoUrl';

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

            const physicalItems = filterLabPhysicalItems(itemsData || []);
            const labOrderIds = new Set(physicalItems.map((item) => item.order_id));
            // Hide digital-only orders from the lab entirely
            setOrders((ordersData || []).filter((order) => labOrderIds.has(order.id)));
            setOrderItems(physicalItems);
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
            <div className="theme-mono lab-shell" style={{ minHeight: '100%' }}>
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
                        <Route path="frame-workshop" element={<LabFrameWorkshop />} />
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
            </div>
        </LabAuthContext.Provider>
    );
};

export default LabApp;
