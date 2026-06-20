import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import '../PrintStore.css';

export default function AddressSidebar({ isOpen, onClose, onSaveAddress, initialData }) {
  const [formData, setFormData] = useState({
    accountName: '',
    email: '',
    recipientName: '',
    street: '',
    addressLine2: '',
    city: '',
    country: 'India',
    zipCode: '',
    phoneNumber: '',
    sameBilling: true
  });

  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  // Validation Logic
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmailValid = emailRegex.test(formData.email);
    const isZipValid = /^\d{6}$/.test(formData.zipCode);
    const isPhoneValid = /^\d{10}$/.test(formData.phoneNumber);
    
    // Check required fields
    const requiredFilled = 
      formData.accountName.trim() !== '' &&
      isEmailValid &&
      formData.recipientName.trim() !== '' &&
      formData.street.trim() !== '' &&
      formData.addressLine2.trim() !== '' &&
      formData.city.trim() !== '' &&
      formData.country.trim() !== '' &&
      isZipValid &&
      isPhoneValid;

    setIsValid(requiredFilled);
  }, [formData]);

  // Input sanitization handlers
  const handleTextOnly = (e, field) => {
    const val = e.target.value.replace(/[^A-Za-z\s]/g, '');
    setFormData({ ...formData, [field]: val });
  };

  const handleNumbersOnly = (e, field, maxLength) => {
    let val = e.target.value.replace(/[^0-9]/g, '');
    if (maxLength && val.length > maxLength) {
      val = val.slice(0, maxLength);
    }
    setFormData({ ...formData, [field]: val });
  };

  const handleAlphanumeric = (e, field) => {
    // Both text and numbers allowed, no special sanitization needed other than normal input, 
    // but we can block extreme special chars if we want. Standard text input is fine for address.
    setFormData({ ...formData, [field]: e.target.value });
  };

  const handleEmail = (e) => {
    setFormData({ ...formData, email: e.target.value });
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="address-sidebar-overlay" onClick={onClose} />
      <div className="address-sidebar">
        <div className="address-sidebar-header">
          <h2>Shipping and billing details</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="address-sidebar-content">
          <p className="address-subtext">We need these details to proceed. We'll store them so you don't have to enter them again later.</p>
          
          <div className="form-section">
            <h3 className="section-title">Account details</h3>
            <p className="section-subtext">We use this to identify your order.</p>
            
            <div className="form-group">
              <label>Full name *</label>
              <input 
                type="text" 
                value={formData.accountName}
                onChange={(e) => handleTextOnly(e, 'accountName')}
                placeholder="Name"
              />
            </div>
            
            <div className="form-group">
              <label>Email *</label>
              <input 
                type="email" 
                value={formData.email}
                onChange={handleEmail}
                placeholder="email@example.com"
              />
              {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                <p className="field-error" style={{ color: '#d32f2f', fontSize: '11px', marginTop: '4px' }}>Please enter a valid email address.</p>
              )}
            </div>
          </div>
          
          <div className="form-section">
            <h3 className="section-title">Shipping address</h3>
            
            <div className="form-group">
              <label>Recipient's full name *</label>
              <input 
                type="text" 
                value={formData.recipientName}
                onChange={(e) => handleTextOnly(e, 'recipientName')}
                placeholder="Full name"
              />
              <p className="field-hint">To ensure correct delivery, enter the full name (first and last) of the person receiving the order.</p>
            </div>
            
            <div className="form-group">
              <label>Street and Number *</label>
              <input 
                type="text" 
                value={formData.street}
                onChange={(e) => handleAlphanumeric(e, 'street')}
              />
            </div>
            
            <div className="form-group">
              <label>Address line 2 *</label>
              <input 
                type="text" 
                value={formData.addressLine2}
                onChange={(e) => handleAlphanumeric(e, 'addressLine2')}
              />
              <p className="field-hint">Apt, suite, unit, floor, etc.</p>
            </div>
            
            <div className="form-group">
              <label>City *</label>
              <input 
                type="text" 
                value={formData.city}
                onChange={(e) => handleTextOnly(e, 'city')}
              />
            </div>
            
            <div className="form-group">
              <label>Country *</label>
              <select 
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Australia">Australia</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Zip Code *</label>
              <input 
                type="text" 
                value={formData.zipCode}
                onChange={(e) => handleNumbersOnly(e, 'zipCode', 6)}
                placeholder="6 digits"
              />
              {formData.zipCode && formData.zipCode.length !== 6 && (
                <p className="field-error" style={{ color: '#d32f2f', fontSize: '11px', marginTop: '4px' }}>Zip code must be exactly 6 digits.</p>
              )}
            </div>
            
            <div className="form-group">
              <label>Phone Number *</label>
              <input 
                type="text" 
                value={formData.phoneNumber}
                onChange={(e) => handleNumbersOnly(e, 'phoneNumber', 10)}
                placeholder="10 digits"
              />
              {formData.phoneNumber && formData.phoneNumber.length !== 10 && (
                <p className="field-error" style={{ color: '#d32f2f', fontSize: '11px', marginTop: '4px' }}>Phone number must be exactly 10 digits.</p>
              )}
            </div>
          </div>
          
          {/* Billing address details automatically match shipping details */}
        </div>
        
        <div className="address-sidebar-footer">
          <button 
            className={`address-done-btn ${isValid ? 'valid' : ''}`}
            disabled={!isValid}
            onClick={() => onSaveAddress(formData)}
          >
            Done
          </button>
          <p className="privacy-notice">Your data is handled in accordance with our <a>Privacy Policy</a></p>
        </div>
      </div>
    </>
  );
}
