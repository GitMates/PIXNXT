import React from 'react';
import { Check } from 'lucide-react';

export default function TrackOrderPage() {
  const steps = [
    { label: 'Order placed', date: 'Oct 24, 10:00 AM' },
    { label: 'Order sent to making lab', date: 'Oct 24, 2:30 PM' },
    { label: 'Product made', date: 'Oct 25, 11:15 AM' },
    { label: 'Packed', date: 'Oct 25, 4:00 PM' },
    { label: 'Dispatching tomorrow', date: 'Pending' },
    { label: 'Dispatched', date: 'Pending' },
    { label: 'Arrived to this place', date: 'Pending' },
    { label: 'Out for delivery', date: 'Pending' },
  ];

  // Hardcoded to step index 3 ("Packed")
  const currentStepIndex = 3;

  return (
    <div className="track-order-page-container pdp-products-page cart-page-container">
      <div className="track-order-header-page">
        <h2>TRACK YOUR ORDER</h2>
      </div>

      <div className="track-order-content">
        
        <div className="order-details-box">
          <div className="order-info-row">
            <span className="order-label">Order Number:</span>
            <span className="order-value">#PXNXT-9824</span>
          </div>
          <div className="order-info-row">
            <span className="order-label">Frame Details:</span>
            <span className="order-value">Premium Matte, 16x20 (x4)</span>
          </div>
          <div className="order-info-row">
            <span className="order-label">Total Amount:</span>
            <span className="order-value">₹1,322.04 INR</span>
          </div>
          <div className="order-info-row">
            <span className="order-label">Paid Using:</span>
            <span className="order-value">Credit Card</span>
          </div>
          <div className="order-info-row">
            <span className="order-label">Contact Number:</span>
            <span className="order-value">+91 98765 43210</span>
          </div>
        </div>

        <div className="timeline-container-wrapper">
          <h3 className="timeline-title">DELIVERY STATUS</h3>
          
          <div className="horizontal-timeline">
            {steps.map((step, index) => {
              const isCompleted = index <= currentStepIndex;
              const isCurrent = index === currentStepIndex;
              
              return (
                <div key={index} className={`timeline-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                  <div className="step-indicator-wrapper">
                    <div className="step-indicator">
                      {isCompleted ? <Check size={14} color="#fff" strokeWidth={3} /> : <div className="step-dot" />}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`step-line ${index < currentStepIndex ? 'completed-line' : ''}`}></div>
                    )}
                  </div>
                  <div className="step-content">
                    <div className="step-label">{step.label}</div>
                    <div className="step-date">{step.date}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
