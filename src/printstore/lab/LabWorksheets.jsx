import React, { useState } from 'react';
import { useLabAuth } from './LabApp';

export default function LabWorksheets() {
  const { orders, orderItems } = useLabAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);

  const calculateMeasurements = (item) => {
    const opts = item.options || {};
    const size = opts.size?.label || '25x38 cm';
    const border = opts.border || 'none';
    const borderThickness = border === 'thick' ? 5 : border === 'thin' ? 2 : 0;
    
    // Parse dimensions from size label like "25x38 cm"
    let width = 25;
    let height = 38;
    const match = size.match(/(\d+)x(\d+)/);
    if (match) {
      width = parseInt(match[1], 10);
      height = parseInt(match[2], 10);
    }

    const frameThickness = 2; // Default wood frame thickness in cm
    const glassSizeWidth = width + (2 * frameThickness) + (2 * borderThickness);
    const glassSizeHeight = height + (2 * frameThickness) + (2 * borderThickness);
    const woodLength = 2 * (width + height + (4 * borderThickness)) + (16 * frameThickness);

    return {
      photoWidth: width,
      photoHeight: height,
      borderThickness,
      frameThickness,
      glassWidth: glassSizeWidth,
      glassHeight: glassSizeHeight,
      woodLength
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const activeWorksheets = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');

  return (
    <div style={{ padding: '32px', backgroundColor: '#ffffff', minHeight: '100%', boxSizing: 'border-box', fontFamily: "'europa', sans-serif" }}>
      
      {/* Hide layout on window print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-worksheet, #printable-worksheet * {
            visibility: visible;
          }
          #printable-worksheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header Area */}
      <div className="no-print" style={{ borderBottom: '1px solid #eaeaea', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontFamily: "'EB Garamond', serif", fontSize: '28px', color: '#005c5a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Manufacturing Worksheets
          </h1>
          <p style={{ color: '#777777', fontSize: '13px', margin: '4px 0 0 0' }}>Generate and print detailed specifications for lab mechanics</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        {/* Worksheets list */}
        <div className="no-print" style={{ flex: '1 1 350px', minWidth: '300px', borderRight: '1px solid #eaeaea', paddingRight: '20px' }}>
          <h3 style={{ fontSize: '16px', color: '#111', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Production Queue
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {activeWorksheets.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '13.5px' }}>No active orders in production queue.</p>
            ) : (
              activeWorksheets.map(order => {
                const orderNumber = `#PXNXT-${order.id.substring(0, 8).toUpperCase()}`;
                const items = orderItems.filter(item => item.order_id === order.id);
                const isSelected = selectedOrder?.id === order.id;

                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrder(order)}
                    style={{
                      padding: '16px',
                      border: isSelected ? '1px solid #005c5a' : '1px solid #e2e8f0',
                      backgroundColor: isSelected ? '#eefaf9' : '#ffffff',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', fontSize: '13px', color: '#111' }}>
                      <span>{orderNumber}</span>
                      <span style={{ color: '#005c5a', textTransform: 'uppercase', fontSize: '11px' }}>{order.status}</span>
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569', marginTop: '6px' }}>{order.customer_name}</div>
                    <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                      {items.length} Custom item(s) • Qty: {items.reduce((sum, i) => sum + i.quantity, 0)}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Worksheet Preview */}
        <div style={{ flex: '2 1 500px', minWidth: '400px', backgroundColor: '#fafafa', padding: '24px', border: '1px solid #e2e8f0', borderRadius: '4px' }}>
          {selectedOrder ? (
            <div>
              {/* Controls */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '24px' }}>
                <button
                  onClick={handlePrint}
                  style={{
                    backgroundColor: '#111111',
                    color: '#ffffff',
                    border: 'none',
                    padding: '8px 16px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '700',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  📄 Print Worksheet / PDF
                </button>
              </div>

              {/* Printable Worksheet Area */}
              <div id="printable-worksheet" style={{ backgroundColor: '#ffffff', padding: '40px', border: '1px solid #e2e8f0', boxSizing: 'border-box' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #111111', paddingBottom: '16px', marginBottom: '24px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '24px', letterSpacing: '0.04em', fontFamily: "'EB Garamond', serif", color: '#111' }}>
                      PIXNXT MANUFACTURING LAB WORKSHEET
                    </h2>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                      Automated Production SpecSheet
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: 'bold', fontFamily: 'monospace' }}>
                      #PXNXT-{selectedOrder.id.substring(0, 8).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                      Date: {new Date(selectedOrder.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Section: Customer details */}
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', color: '#005c5a', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', margin: '0 0 10px 0' }}>
                    Customer & Shipping Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', color: '#333' }}>
                    <div>
                      <strong>Customer Name:</strong> {selectedOrder.customer_name}<br />
                      <strong>Customer Email:</strong> {selectedOrder.customer_email}<br />
                      <strong>Phone:</strong> {selectedOrder.shipping_address?.phone || 'N/A'}
                    </div>
                    <div>
                      <strong>Shipping Address:</strong><br />
                      {selectedOrder.shipping_address?.street || ''}<br />
                      {selectedOrder.shipping_address?.city || ''}, {selectedOrder.shipping_address?.state || ''} {selectedOrder.shipping_address?.postalCode || ''}<br />
                      {selectedOrder.shipping_address?.country || 'India'}
                    </div>
                  </div>
                </div>

                {/* Section: Items Specs */}
                <div>
                  <h4 style={{ textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.05em', color: '#005c5a', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', margin: '0 0 16px 0' }}>
                    Item Manufacturing & Cutting Specifications
                  </h4>

                  {orderItems.filter(item => item.order_id === selectedOrder.id).map((item, idx) => {
                    const math = calculateMeasurements(item);
                    const opts = item.options || {};
                    return (
                      <div key={item.id} style={{ borderBottom: '1px dashed #e2e8f0', paddingBottom: '16px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#111', marginBottom: '8px' }}>
                          Item #{idx + 1}: {item.product_name} (x{item.quantity})
                        </div>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '12px', color: '#444' }}>
                          <div>
                            <strong>Product Options:</strong>
                            <div style={{ paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>• Size: {opts.size?.label || 'Custom'}</span>
                              <span>• Paper: {opts.paper?.label || 'Lustre Photo Paper'}</span>
                              <span>• Frame Finish: {opts.frame?.label || 'No Frame'}</span>
                              <span>• Border Size: {opts.border || 'none'}</span>
                            </div>
                          </div>

                          <div>
                            <strong>Required Cutting Measurements:</strong>
                            <div style={{ paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px', color: '#111' }}>
                              <span>• Photo Print size: {math.photoWidth} x {math.photoHeight} cm</span>
                              <span>• Glass / Backing Board Cut: {math.glassWidth} x {math.glassHeight} cm</span>
                              <span>• Frame Wood Outer length: {math.woodLength} cm (Miter Cut)</span>
                              <span>• Border Matte Width: {math.borderThickness} cm</span>
                            </div>
                          </div>
                        </div>

                        {/* Special Instructions */}
                        <div style={{ marginTop: '12px', fontSize: '11.5px', padding: '10px', backgroundColor: '#f8fafc', borderLeft: '3px solid #005c5a', color: '#475569' }}>
                          <strong>Packaging & Assembly instructions:</strong> Ensure glass sheets are squeegee cleaned. Mount backing board firmly with frame staples. Wrap with corner guards and 3 layers of bubble wrap. Place in shipping box with invoice copy.
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footnote */}
                <div style={{ marginTop: '40px', borderTop: '1px solid #111', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#777' }}>
                  <span>PIXNXT Manufacturing Lab System</span>
                  <span>Signature Checklist: ____________________</span>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
              <span style={{ fontSize: '32px' }}>📄</span>
              <h3 style={{ margin: '16px 0 6px 0', fontSize: '16px', color: '#111' }}>No Worksheet Selected</h3>
              <p style={{ margin: 0, fontSize: '13px' }}>Choose an order from the list on the left to review and print specifications.</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
