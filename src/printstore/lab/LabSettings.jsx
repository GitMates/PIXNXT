import React, { useState } from 'react';

export default function LabSettings() {
  const [refreshInterval, setRefreshInterval] = useState('30');
  const [lowStockWarning, setLowStockWarning] = useState('10');
  const [defaultShippingCost, setDefaultShippingCost] = useState('150');
  const [success, setSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem('pixnxt_lab_settings', JSON.stringify({
      refreshInterval,
      lowStockWarning,
      defaultShippingCost
    }));
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  };

  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      {/* Header Area */}
      <div style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px' }}>
        <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Lab Settings
        </h1>
        <p style={{ color: '#777777', fontSize: '13px', margin: '4px 0 0 0' }}>Configure portal thresholds, background refresh intervals, and defaults</p>
      </div>

      <div style={{ maxWidth: '600px' }}>
        <form onSubmit={handleSave} style={{ border: '1px solid #cbd5e1', padding: '30px', borderRadius: '4px', backgroundColor: '#fafafa' }}>
          <h3 style={{ fontSize: '15px', color: '#111', fontWeight: 'bold', margin: '0 0 20px 0', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Configuration panel</h3>

          {success && (
            <div style={{ padding: '12px', backgroundColor: '#d1fae5', color: '#065f46', fontSize: '13px', fontWeight: 'bold', borderRadius: '3px', marginBottom: '20px' }}>
              ✓ Settings saved successfully.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>Orders Dashboard Refresh Interval (seconds)</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none', cursor: 'pointer' }}
              >
                <option value="15">15 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">60 seconds</option>
                <option value="300">5 minutes</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>Low Stock Alert Warning Level (Units)</label>
              <input
                type="number"
                value={lowStockWarning}
                onChange={(e) => setLowStockWarning(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '12.5px', color: '#64748b', fontWeight: '600' }}>Default Courier Shipping Cost (INR)</label>
              <input
                type="number"
                value={defaultShippingCost}
                onChange={(e) => setDefaultShippingCost(e.target.value)}
                style={{ padding: '8px 10px', border: '1px solid #cbd5e1', fontSize: '13px', outline: 'none' }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: '#005c5a',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Save Configurations
          </button>
        </form>
      </div>

    </div>
  );
}
