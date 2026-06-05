import React, { useState, useMemo } from 'react';
import { MOCK_ORDERS } from './mockOrders';
import './LabDashboard.css';

const STATUS_COLORS = {
  'Pending': '#f39c12',
  'Printing': '#3498db',
  'Framing': '#9b59b6',
  'Quality Check': '#e67e22',
  'Ready to Ship': '#2ecc71',
  'Shipped': '#27ae60'
};

const FilterDropdown = ({ label, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const activeLabel = options.find(o => o.value === value)?.label || label;

  return (
    <div className="lab-filter-dropdown" onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        className={`lab-filter-pill ${value !== 'all' ? 'active' : ''}`}
        onClick={() => setOpen(!open)}
      >
        <span>{activeLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="lab-filter-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`lab-filter-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {value === option.value && <span className="lab-filter-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const LabDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [expandedOrder, setExpandedOrder] = useState(null);

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    ...Object.keys(STATUS_COLORS).map(s => ({ value: s, label: s }))
  ];

  const filteredOrders = useMemo(() => {
    let result = MOCK_ORDERS;
    if (statusFilter !== 'all') {
      result = result.filter(o => o.status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(o => 
        o.id.toLowerCase().includes(q) || 
        o.customer.name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [searchQuery, statusFilter]);

  const formatDate = (isoString) => {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
  };

  const toggleOrderDetails = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  return (
    <main className="lab-main">
      <header className="lab-header">
        <div className="lab-header-left">
          <h1 className="lab-title">Orders Dashboard</h1>
          <div className="lab-search-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="search"
              placeholder="Search by Order ID or Customer"
              className="lab-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <div className="lab-filter-bar">
        <FilterDropdown
          label="Status"
          options={statusOptions}
          value={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      <div className="lab-content">
        {filteredOrders.length === 0 ? (
          <div className="lab-empty">
            <h3>No products to be found here</h3>
            <p>Try adjusting your search or filters to see incoming orders.</p>
          </div>
        ) : (
          <div className="lab-orders-list">
            <div className="lab-orders-header">
              <div className="col-id">Order ID</div>
              <div className="col-customer">Customer</div>
              <div className="col-date">Date</div>
              <div className="col-items">Items</div>
              <div className="col-total">Total</div>
              <div className="col-status">Status</div>
              <div className="col-action"></div>
            </div>
            
            {filteredOrders.map(order => (
              <React.Fragment key={order.id}>
                <div className="lab-order-row" onClick={() => toggleOrderDetails(order.id)}>
                  <div className="col-id font-semibold">{order.id}</div>
                  <div className="col-customer">
                    <div className="customer-name">{order.customer.name}</div>
                    <div className="customer-email">{order.customer.email}</div>
                  </div>
                  <div className="col-date">{formatDate(order.date)}</div>
                  <div className="col-items">
                    {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                    <div className="item-summary text-xs text-gray-500">
                      {order.items.map(item => item.productName).join(', ')}
                    </div>
                  </div>
                  <div className="col-total font-semibold">{formatPrice(order.totalAmount)}</div>
                  <div className="col-status">
                    <span 
                      className="status-badge"
                      style={{ 
                        backgroundColor: `${STATUS_COLORS[order.status]}15`, 
                        color: STATUS_COLORS[order.status] 
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="col-action">
                    <button className="view-details-btn">
                      {expandedOrder === order.id ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>
                
                {/* Expanded Details View */}
                {expandedOrder === order.id && (
                  <div className="lab-order-details">
                    <h4>Ordered Products</h4>
                    <div className="lab-order-items">
                      {order.items.map(item => (
                        <div className="lab-order-item" key={item.id}>
                          <img src={item.photoUrl} alt="Product" className="lab-item-img" />
                          <div className="lab-item-info">
                            <div className="lab-item-title">{item.productName} (x{item.quantity})</div>
                            <div className="lab-item-specs">
                              <span>Size: {item.size.label}</span>
                              <span>Paper: {item.paper.label}</span>
                              {item.frame && <span>Frame: {item.frame.label}</span>}
                            </div>
                          </div>
                          <div className="lab-item-price">{formatPrice(item.unitPrice * item.quantity)}</div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="lab-order-meta">
                      <div className="meta-block">
                        <strong>Shipping Address:</strong><br />
                        {order.shippingAddress}
                      </div>
                      <div className="meta-block">
                        <strong>Order Date:</strong><br />
                        {new Date(order.date).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default LabDashboard;
