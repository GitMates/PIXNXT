import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { clientGalleryEmailTemplatesService, resolveTemplateBody } from '../services/clientGalleryEmailTemplates.service';
import { AppToast, useAppToast } from '../components/ui/AppToast';
import './EmailTemplateEditor.css';

const EmailTemplateEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();
    
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Form state
    const [name, setName] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSystem, setIsSystem] = useState(false);

    // UI state
    const [showHelp, setShowHelp] = useState(true);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const { toast, showToast, clearToast } = useAppToast(3000);

    useEffect(() => {
        if (location.state?.toastMessage) {
            showToast(location.state.toastMessage);
            // Clear the state so it doesn't show again on reload/navigation
            navigate(location.pathname + location.search, { replace: true, state: {} });
        }
    }, [location.state?.toastMessage, showToast, navigate, location.pathname, location.search]);

    const isCreating = !id;

    const fetchTemplate = useCallback(async () => {
        if (!user?.id || isCreating) {
            setLoading(false);
            return;
        }
        
        try {
            const data = await clientGalleryEmailTemplatesService.getTemplateById(user.id, id);
            if (data) {
                setTemplate(data);
                setName(data.name || '');
                setSubject(data.subject || '');
                setBody(data.body || '');
                setIsSystem(data.isSystem || false);
            } else {
                navigate('/settings/email-templates');
            }
        } catch (err) {
            console.error('Error fetching template:', err);
            navigate('/settings/email-templates');
        } finally {
            setLoading(false);
        }
    }, [user?.id, id, isCreating, navigate]);

    useEffect(() => {
        fetchTemplate();
    }, [fetchTemplate]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSave = async () => {
        if (!user?.id) return;
        
        setSaving(true);
        try {
            if (isCreating) {
                const newTpl = await clientGalleryEmailTemplatesService.createTemplate(user.id, { name, subject, body });
                navigate(`/settings/email-templates/${newTpl.id}/edit`, { 
                    replace: true,
                    state: { toastMessage: 'Email template created successfully.' }
                });
            } else {
                await clientGalleryEmailTemplatesService.saveTemplate(user.id, {
                    ...template,
                    name,
                    subject,
                    body
                });
                showToast('Email template saved successfully.');
            }
        } catch (err) {
            console.error('Error saving template:', err);
            alert('Failed to save template.');
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        if (!user?.id || !isSystem || !id) return;
        
        if (window.confirm('Are you sure you want to reset this template to its default state?')) {
            try {
                setSaving(true);
                const resetTpl = await clientGalleryEmailTemplatesService.resetTemplate(user.id, id);
                if (resetTpl) {
                    setTemplate(resetTpl);
                    setName(resetTpl.name || '');
                    setSubject(resetTpl.subject || '');
                    setBody(resetTpl.body || '');
                }
                setShowDropdown(false);
            } catch (err) {
                console.error('Error resetting template:', err);
                alert('Failed to reset template.');
            } finally {
                setSaving(false);
            }
        }
    };

    if (loading) {
        return <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    }

    const resolvedPreviewBody = resolveTemplateBody(body, {
        collectionName: '[DELIVERY NAME]',
        daysPrior: '7 days',
        expiryDate: 'October 30, 2026'
    });

    return (
        <div className="ete-container">
            <div className="ete-header">
                <div className="ete-header-left">
                    <button className="ete-close-btn" onClick={() => navigate('/settings/email-templates')}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    {isSystem ? (
                        <div className="ete-title-static">{name}</div>
                    ) : (
                        <input 
                            className="ete-title-input" 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            placeholder="Untitled Template" 
                        />
                    )}
                </div>
                
                <div className="ete-header-right">
                    {isSystem && (
                        <div style={{ position: 'relative' }} ref={dropdownRef}>
                            <button className="ete-more-btn" onClick={() => setShowDropdown(!showDropdown)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                            </button>
                            {showDropdown && (
                                <div className="ete-dropdown">
                                    <div className="ete-dropdown-item" onClick={handleReset}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
                                        Reset template
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <button className="ete-save-btn" onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            <div className="ete-content">
                <div className="ete-sidebar">
                    <div className="ete-editor-area">
                        <input 
                            className="ete-subject-input" 
                            type="text" 
                            placeholder="Enter subject line (optional)" 
                            value={subject} 
                            onChange={(e) => setSubject(e.target.value)} 
                        />
                        <textarea 
                            className="ete-body-textarea" 
                            placeholder="Enter your text here" 
                            value={body} 
                            onChange={(e) => setBody(e.target.value)} 
                        />
                    </div>
                    
                    <div className="ete-dynamic-help">
                        <div className="ete-help-title" onClick={() => setShowHelp(!showHelp)}>
                            How to insert dynamic text
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showHelp ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                                <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                        </div>
                        {showHelp && (
                            <div className="ete-help-content">
                                <p style={{ marginBottom: '16px' }}>Use the following codes to insert dynamic information into the email.</p>
                                <div className="ete-help-row">
                                    <div className="ete-help-label">Delivery Name:</div>
                                    <div className="ete-help-code">{'{delivery.name}'}</div>
                                </div>
                                <div className="ete-help-row">
                                    <div className="ete-help-label">Days before Expiry Date:</div>
                                    <div className="ete-help-code">{'{days.prior}'}</div>
                                </div>
                                <div className="ete-help-row">
                                    <div className="ete-help-label">Delivery Expiry Date:</div>
                                    <div className="ete-help-code">{'{expiry.date}'}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="ete-preview-pane">
                    <div className="ete-preview-email">
                        <div className="ete-preview-content">
                            <div className="ete-preview-logo">PHOTOGRAPHER</div>
                            <div className="ete-preview-title">[DELIVERY NAME]</div>
                            
                            <img 
                                className="ete-preview-image" 
                                src="/workflow-adventure.jpg" 
                                alt="Sample Delivery Cover" 
                            />
                            
                            <div className="ete-preview-text-block">
                                {resolvedPreviewBody}
                            </div>
                            
                            {body.toLowerCase().includes('view gallery') && (
                                <div className="ete-preview-btn">View Gallery</div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <AppToast toast={toast} onDismiss={clearToast} />
        </div>
    );
};

export default EmailTemplateEditor;
