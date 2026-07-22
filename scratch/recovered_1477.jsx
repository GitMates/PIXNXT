import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase/client';
import { 
  ShoppingBag, Settings, ChevronDown, ChevronUp, 
  LogOut, User, Gift, DollarSign, Package, ChevronLeft, Eye, Mail, Phone
} from 'lucide-react';
import helpPng from '../assets/icons/help.png';
import notificationPng from '../assets/icons/notification.png';
import './Dashboard.css';
import '../printstore/PrintStore.css';

export default function StoreDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const [orders, setOrders] = useState([]);
  const [orderItems, setOrderItems] = useState([]);
  const [collections, setCollections] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [expandedOrderId, setExpandedOrderId] = useState(null);

  // Filters
  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterCollection, setFilterCollection] = useState('');

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();
        if (data) setProfile(data);
      } catch (e) {
        console.error("Error loading profile:", e);
      }
    }
    loadProfile();
  }, [user]);

  // Load all data from database
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: ordersData } = await supabase
          .from('printstore_orders')
          .select('*')
          .order('created_at', { ascending: false });

        const { data: itemsData } = await supabase
          .from('printstore_order_items')
          .select('*');

        const { data: collectionsData } = await supabase
          .from('collections')
          .select('id, name');

        const { data: photosData } = await supabase
          .from('photos')
          .select('id, collection_id');

        setOrders(ordersData || []);
        setOrderItems(itemsData || []);
        setCollections(collectionsData || []);
        setPhotos(photosData || []);
      } catch (error) {
        console.error("Error loading store dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [user]);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Map photo ID → Collection name
  const photoToCollectionMap = useMemo(() => {
    const map = {};
    const colMap = {};
    collections.forEach(c => { colMap[c.id] = c.name; });
    photos.forEach(p => {
      if (p.collection_id && colMap[p.collection_id]) {
        map[p.id] = colMap[p.collection_id];
      }
    });
    return map;
  }, [collections, photos]);

  // Resolve collection name per order
  const orderCollectionNames = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      let collectionName = '—';
      for (const item of items) {
        const opt = item.options || {};
        const photoId = opt.photo?.id || (opt.photos && opt.photos[0]?.id);
        if (photoId && photoToCollectionMap[photoId]) {
          collectionName = photoToCollectionMap[photoId];
          break;
        }
      }
      map[order.id] = collectionName;
    });
    return map;
  }, [orders, orderItems, photoToCollectionMap]);

  // Items count per order
  const orderItemsCount = useMemo(() => {
    const map = {};
    orders.forEach(order => {
      const items = orderItems.filter(item => item.order_id === order.id);
      const totalQty = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      map[order.id] = totalQty;
    });
    return map;
  }, [orders, orderItems]);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const shortId = order.id ? order.id.split('-')[0].toUpperCase() : '';
      const orderCol = orderCollectionNames[order.id] || '';
      
      if (filterOrderId && !shortId.toLowerCase().includes(filterOrderId.toLowerCase()) && !order.id.toLowerCase().includes(filterOrderId.toLowerCase())) {
        return false;
      }
      if (filterStatus !== 'All' && order.status !== filterStatus) {
        return false;
      }
      if (filterCustomer && !(order.customer_name?.toLowerCase().includes(filterCustomer.toLowerCase()) || order.customer_email?.toLowerCase().includes(filterCustomer.toLowerCase()))) {
        return false;
      }
      if (filterCollection && !orderCol.toLowerCase().includes(filterCollection.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [orders, orderCollectionNames, filterOrderId, filterStatus, filterCustomer, filterCollection]);

  const toggleRow = (orderId) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('pixnxt_session');
    navigate('/auth');
  };

  // Format date and time from created_at
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="store-dashboard-wrapper">
      {/* Top Navbar — same as client gallery / Dashboard */}
      <nav className="dash-navbar" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}>
        <div className="dash-navbar-left">
          <Link to="/dashboard" className="dash-logo">PIXNXT</Link>
        </div>

        <div className="dash-navbar-right">
          <button className="dash-nav-icon" title="Help" style={{ borderRadius: '50%' }}>
            <img src={helpPng} alt="Help" className="dash-nav-icon-img" />
          </button>
          <button className="dash-nav-icon" title="Notifications" style={{ borderRadius: '50%' }}>
            <img src={notificationPng} alt="Notifications" className="dash-nav-icon-img" />
          </button>

          <div className="dash-profile-wrapper" ref={profileRef}>
            <button
              className="dash-profile-btn"
              onClick={() => setProfileOpen(!profileOpen)}
              title="Profile"
            >
              {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </button>

            {profileOpen && (
              <div className="dash-profile-dropdown">
                <div className="dash-dropdown-header">
                  <div className="dash-dropdown-avatar">
                    {profile?.display_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="dash-dropdown-user-info">
                    <h4>{profile?.display_name || 'Photographer'}</h4>
                    <p>{user?.email || 'No email'}</p>
                  </div>
                </div>
                <div className="dash-dropdown-items">
                  <button className="dash-dropdown-item" style={{ borderRadius: '4px' }}>
                    <Gift size={16} style={{marginRight: '8px'}} /> Invite Friends & Get $20
                  </button>
                  <div className="dash-dropdown-divider" />
                  <button className="dash-dropdown-item" onClick={() => navigate('/settings')} style={{ borderRadius: '4px' }}>
                    <User size={16} style={{marginRight: '8px'}} /> Profile
                  </button>
                  <button className="dash-dropdown-item" onClick={handleLogout} style={{ borderRadius: '4px' }}>
                    <LogOut size={16} style={{marginRight: '8px'}} /> Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Layout */}
      <div className="store-dashboard-layout" style={{ marginTop: '76px' }}>
        {/* Sidebar — client gallery dark theme */}
        <aside className="store-dashboard-sidebar">
          <div className="sidebar-header-title">
            <ShoppingBag size={18} />
            <span>Store Manager</span>
          </div>
          <ul className="sidebar-menu">
            <li className="active">
              <Link to="/store/orders">
                <Package size={18} />
                <span>Orders</span>
              </Link>
            </li>
            <li>
              <Link to="/photographer">
                <DollarSign size={18} />
                <span>Pricing & Setup</span>
              </Link>
            </li>
            <li>
              <Link to="/settings">
                <Settings size={18} />
                <span>Store Settings</span>
              </Link>
            </li>
          </ul>
        </aside>

        {/* Content Area */}
        <main className="store-dashboard-main">
          <div className="store-dashboard-content">
            <div className="store-dashboard-header-row">
              <div>
                <h1 className="store-dashboard-title">Orders</h1>
                <p className="store-dashboard-subtitle">Manage, view, and track all incoming product orders from your galleries.</p>
              </div>
              <div className="results-count-label">
                {filteredOrders.length > 0 ? `Displaying 1-${filteredOrders.length} of ${filteredOrders.length} results.` : 'No results.'}
              </div>
            </div>

            {loading ? (
              <div className="store-loading-spinner-box">
                <div className="store-spinner"></div>
              </div>
            ) : (
              <div className="store-dashboard-table-container">
                <table className="store-dashboard-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Status</th>
                      <th>Customer</th>
                      <th>Contact</th>
                      <th>Collection</th>
                      <th>Date</th>
                      <th>Time</th>
                      <th style={{ textAlign: 'center' }}>Items</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                    <tr className="filter-input-row">
                      <td>
                        <input 
                          type="text" 
                          placeholder="Search order…" 
                          value={filterOrderId}
                          onChange={(e) => setFilterOrderId(e.target.value)}
                        />
                      </td>
                      <td>
                        <select 
                          value={filterStatus}
                          onChange={(e) => setFilterStatus(e.target.value)}
                        >
                          <option value="All">All Statuses</option>
                          <option value="pending">Pending</option>
                          <option value="artwork_review">Artwork Review</option>
                          <option value="printing">Printing</option>
                          <option value="completed">Complete</option>
                          <option value="cancelled">Canceled</option>
                        </select>
                      </td>
                      <td>
                        <input 
                          type="text" 
                          placeholder="Search customer…" 
                          value={filterCustomer}
                          onChange={(e) => setFilterCustomer(e.target.value)}
                        />
                      </td>
                      <td></td>
                      <td>
                        <input 
                          type="text" 
                          placeholder="Search collection…" 
                          value={filterCollection}
                          onChange={(e) => setFilterCollection(e.target.value)}
                        />
                      </td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td></td>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="no-records-row">No orders found.</td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const isExpanded = expandedOrderId === order.id;
                        const shortId = order.id ? `#${order.id.split('-')[0].toUpperCase()}` : '';
                        const collectionName = orderCollectionNames[order.id] || '—';
                        const items = orderItems.filter(item => item.order_id === order.id);
                        const itemCount = orderItemsCount[order.id] || 0;

                        return (
                          <React.Fragment key={order.id}>
                            <tr className={`order-main-row ${isExpanded ? 'row-expanded' : ''}`} onClick={() => toggleRow(order.id)}>
                              <td className="font-semibold text-dark">{shortId}</td>
                              <td>
                                <span className={`order-status-badge status-${order.status}`}>
                                  {order.status?.replace('_', ' ')}
                                </span>
                              </td>
                              <td>{order.customer_name || '—'}</td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span style={{ fontSize: '13px', color: '#333' }}>{order.customer_email || '—'}</span>
                                </div>
                              </td>
                              <td>{collectionName}</td>
                              <td style={{ whiteSpace: 'nowrap' }}>{formatDate(order.created_at)}</td>
                              <td style={{ whiteSpace: 'nowrap', color: '#666' }}>{formatTime(order.created_at)}</td>
                              <td style={{ textAlign: 'center' }}>{itemCount}</td>
                              <td className="font-semibold" style={{ textAlign: 'right' }}>₹{order.total?.toFixed(2)}</td>
                              <td style={{ textAlign: 'center' }}>
                                <button className="order-view-toggle-btn" onClick={(e) => { e.stopPropagation(); toggleRow(order.id); }}>
                                  {isExpanded ? 'Hide' : 'View'}
                                </button>
                              </td>
                            </tr>
                            
                            {isExpanded && (
                              <tr className="order-details-drawer-row">
                                <td colSpan={10} className="order-details-drawer-cell">
                                  <div className="order-details-wrapper animate-slide-down">
                                    {/* Shipping details */}
                                    <div className="shipping-details-box">
                                      <h3 className="details-box-title">Shipping Details</h3>
                                      <div className="shipping-details-card">
                                        <div className="shipping-detail-col">
                                          <span className="label-heading">Shipping Method</span>
                                          <span className="value-text">{order.shipping_method || 'India Ground Shipping (5-7 business days)'}</span>
                                        </div>
                                        <div className="shipping-detail-col">
                                          <span className="label-heading">Tracking Info</span>
                                          <span className="value-text tracking-code">{order.payment_intent_id || '—'}</span>
                                        </div>
                                        <div className="shipping-detail-col">
                                          <span className="label-heading">Delivery Address</span>
                                          <span className="value-text">
                                            {order.customer_name || '—'}<br />
                                            {order.shipping_address?.address || '—'}, {order.shipping_address?.city || ''}<br />
                                            {order.shipping_address?.zip || ''}, {order.shipping_address?.country || 'India'}
                                          </span>
                                        </div>
                                        <div className="shipping-detail-col">
                                          <span className="label-heading">Contact Email</span>
                                          <span className="value-text">{order.customer_email || '—'}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Items details table */}
                                    <table className="order-items-detail-table">
                                      <thead>
                                        <tr>
                                          <th>Item ({items.length})</th>
                                          <th>Product</th>
                                          <th style={{ textAlign: 'center' }}>Qty</th>
                                          <th style={{ textAlign: 'right' }}>Price</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {items.map((item) => {
                                          const opt = item.options || {};
                                          const photoUrl = opt.photo?.url || (opt.photos && opt.photos[0]?.url) || '';
                                          const sizeLabel = opt.size?.label || '—';
                                          const paperLabel = opt.paper?.label || '—';
                                          const frameLabel = opt.frame?.label && opt.frame.id !== 'frame_none' ? opt.frame.label : null;

                                          return (
                                            <tr key={item.id}>
                                              <td className="item-thumbnail-cell">
                                                {photoUrl ? (
                                                  <div className="item-thumb-wrapper">
                                                    <img src={photoUrl} alt={item.product_name} className="item-thumbnail-img" />
                                                  </div>
                                                ) : (
                                                  <div className="item-thumb-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontSize: '11px' }}>No image</div>
                                                )}
                                              </td>
                                              <td>
                                                <div className="item-name-info">
                                                  <span className="item-product-name">{item.product_name}</span>
                                                  <span className="item-product-options">
                                                    Size: {sizeLabel} | Paper: {paperLabel}{frameLabel ? ` | Frame: ${frameLabel}` : ''}
                                                  </span>
                                                </div>
                                              </td>
                                              <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                              <td style={{ textAlign: 'right' }} className="font-semibold">₹{(item.unit_price * item.quantity).toFixed(2)}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>

                                    {/* Cost breakdown */}
                                    <div className="order-cost-breakdown">
                                      <div className="breakdown-row">
                                        <span>Subtotal</span>
                                        <span>₹{order.subtotal?.toFixed(2) || '0.00'}</span>
                                      </div>
                                      <div className="breakdown-row">
                                        <span>Shipping</span>
                                        <span>₹{order.shipping_amount?.toFixed(2) || '0.00'}</span>
                                      </div>
                                      {(order.discount_amount > 0) && (
                                        <div className="breakdown-row" style={{ color: '#059669' }}>
                                          <span>Discount</span>
                                          <span>-₹{order.discount_amount?.toFixed(2)}</span>
                                        </div>
                                      )}
                                      <div className="breakdown-row">
                                        <span>Tax</span>
                                        <span>₹{order.tax_amount?.toFixed(2) || '0.00'}</span>
                                      </div>
                                      <div className="breakdown-row order-total-row font-bold">
                                        <span>Order Total</span>
                                        <span>₹{order.total?.toFixed(2) || '0.00'}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
