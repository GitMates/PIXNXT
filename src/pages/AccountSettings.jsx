import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { galleryService } from '../services/gallery.service';
import { useAuth } from '../hooks/useAuth';
import { storageService } from '../services/storage.service';
import { supabase } from '../lib/supabase/client';

const getDynamicHomepageUrl = (slug) => {
    if (!slug) return '';
    const host = window.location.host;
    const protocol = window.location.protocol;
    
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        const baseHost = host.replace(/^[a-zA-Z0-9-]+\.localhost/, 'localhost');
        return `${protocol}//${slug.toLowerCase()}.${baseHost}/`;
    }
    
    const hostWithoutSubdomain = host.replace(/^(www\.|[a-zA-Z0-9-]+\.)/i, '');
    return `${protocol}//${slug.toLowerCase()}.${hostWithoutSubdomain}/`;
};

export default function AccountSettings() {
    const { tab } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const activeTab = tab || 'profile';
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);
    const [toastMessage, setToastMessage] = useState('');

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3000);
    };

    const userInitial = user?.email ? user.email.charAt(0).toUpperCase() : 'P';
    const businessName = user?.email ? user.email.split('@')[0].toUpperCase() : 'POOJA';

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="w-full min-h-screen bg-white text-[#111]">
            {/* Top Navigation */}
            <div className="w-full h-[80px] border-b border-[#cccccc] bg-[#f5f5f5] flex items-center justify-between px-10">
                <div className="flex items-center">
                    <div 
                        className="text-[17px] font-medium cursor-pointer text-[#111]" 
                        style={{ letterSpacing: '8px', marginRight: '60px' }}
                        onClick={() => navigate('/dashboard')}
                    >
                        PIXNXT
                    </div>
                    
                    {/* Account Dropdown Trigger */}
                    <div className="relative" ref={dropdownRef}>
                        <div 
                            className="flex items-center gap-1.5 text-[14px] text-[#444] cursor-pointer hover:text-[#111] font-medium"
                            onClick={() => setShowDropdown(!showDropdown)}
                        >
                            Account
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        
                        {/* Dropdown Menu (App Switcher matches Sidebar) */}
                        {showDropdown && (
                            <div className="absolute top-[100%] left-0 mt-4 w-[360px] bg-[#ffffff] rounded-none shadow-[0_12px_48px_rgba(0,0,0,0.15)] z-[500] py-3 animate-[cgFadeIn_0.15s_ease]">
                                <div
                                    className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]"
                                    onClick={() => {
                                        navigate('/client-gallery');
                                        setShowDropdown(false);
                                    }}
                                >
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #1a9b84, #147d6a)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                            <circle cx="8.5" cy="8.5" r="1.5" />
                                            <polyline points="21 15 16 10 5 21" />
                                        </svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[15px] font-semibold text-[#111]">Client Gallery</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Better way to share, deliver, proof and sell</span>
                                    </div>
                                </div>
                                <div
                                    className="flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]"
                                    onClick={() => {
                                        navigate('/smart-albums');
                                        setShowDropdown(false);
                                    }}
                                >
                                    <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #9b59b6, #8e44ad)' }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                            <line x1="8" y1="6" x2="16" y2="6"></line>
                                            <line x1="8" y1="10" x2="14" y2="10"></line>
                                        </svg>
                                    </div>
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[15px] font-semibold text-[#111]">Smart Albums</span>
                                        <span className="text-xs text-[#888] leading-[1.4]">Design and deliver beautiful photo albums</span>
                                    </div>
                                </div>
                                <div className="h-px bg-[#f0f0f0] my-2" />
                                <div
                                    className="flex items-center gap-[14px] px-6 py-3.5 cursor-pointer transition-colors duration-120 hover:bg-[#f3f4f6]"
                                    onClick={() => {
                                        navigate('/dashboard');
                                        setShowDropdown(false);
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="3" width="7" height="7" />
                                        <rect x="14" y="3" width="7" height="7" />
                                        <rect x="14" y="14" width="7" height="7" />
                                        <rect x="3" y="14" width="7" height="7" />
                                    </svg>
                                    <span className="text-sm font-medium text-[#333]">View Dashboard</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-6 text-[#666]">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:text-[#111] transition-colors">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                    </svg>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:text-[#111] transition-colors">
                        <path d="M12 1.5v2"></path>
                        <path d="M18 9A6 6 0 0 0 6 9c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <div 
                        className="rounded-full bg-[#e8f7f2] text-[#1a9b84] flex items-center justify-center text-[14px] font-medium cursor-pointer"
                        style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', flexShrink: 0 }}
                    >
                        {userInitial}
                    </div>
                </div>
            </div>

            {/* Sub Navigation */}
            <div className="w-full border-b border-[#cccccc] bg-[#fafafa]">
                <div className="flex gap-8 px-10 pt-1">
                    <button 
                        className={`py-3 text-[14px] transition-colors relative ${activeTab === 'profile' ? 'text-[#111] font-medium' : 'text-[#888] font-normal hover:text-[#111]'}`}
                        onClick={() => navigate('/account/profile')}
                    >
                        Profile
                        {activeTab === 'profile' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#1a9b84]" />}
                    </button>
                    <button 
                        className={`py-3 text-[14px] transition-colors relative ${activeTab === 'account' ? 'text-[#111] font-medium' : 'text-[#888] font-normal hover:text-[#111]'}`}
                        onClick={() => navigate('/account/account')}
                    >
                        Account
                        {activeTab === 'account' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#1a9b84]" />}
                    </button>
                    <button 
                        className={`py-3 text-[14px] transition-colors relative ${activeTab === 'billing' ? 'text-[#111] font-medium' : 'text-[#888] font-normal hover:text-[#111]'}`}
                        onClick={() => navigate('/account/billing')}
                    >
                        Billing
                        {activeTab === 'billing' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#1a9b84]" />}
                    </button>
                    <button 
                        className={`py-3 text-[14px] transition-colors relative ${activeTab === 'advanced' ? 'text-[#111] font-medium' : 'text-[#888] font-normal hover:text-[#111]'}`}
                        onClick={() => navigate('/account/advanced')}
                    >
                        Advanced Settings
                        {activeTab === 'advanced' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#1a9b84]" />}
                    </button>
                    <button 
                        className={`py-3 text-[14px] transition-colors relative ${activeTab === 'refer' ? 'text-[#111] font-medium' : 'text-[#888] font-normal hover:text-[#111]'}`}
                        onClick={() => navigate('/account/refer')}
                    >
                        Refer a Friend
                        {activeTab === 'refer' && <div className="absolute bottom-[-1px] left-0 w-full h-[2px] bg-[#1a9b84]" />}
                    </button>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="w-full bg-white py-12 flex justify-center">
                <div className="w-full max-w-[800px] px-6 lg:px-0">
                    {activeTab === 'profile' && <ProfileTab user={user} showToast={showToast} />}
                    {activeTab === 'account' && <AccountTab user={user} showToast={showToast} />}
                    {activeTab === 'billing' && <BillingTab user={user} showToast={showToast} />}
                    {activeTab === 'advanced' && <AdvancedTab user={user} showToast={showToast} />}
                    {activeTab === 'refer' && <div className="text-[#888]">Refer a Friend Coming Soon</div>}
                </div>
            </div>
            {toastMessage && (
                <div className="fixed bottom-6 right-6 bg-[#1a9b84] text-white px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.12)] text-[13px] font-medium transition-all duration-300 z-[9999] flex items-center gap-2" style={{ animation: 'cgFadeIn 0.25s ease-out' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    {toastMessage}
                </div>
            )}
        </div>
    );
}

function ProfileTab({ user, showToast }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingIcon, setUploadingIcon] = useState(false);
    const fileInputRef = useRef(null);

    const [formData, setFormData] = useState({
        profile_icon_url: '',
        business_name: '',
        first_name: '',
        last_name: '',
        contact_email: '',
        phone: '',
        website: '',
        biography: '',
        business_country: '',
        address_line_1: '',
        address_line_2: '',
        state_province: '',
        city: '',
        zip_postal_code: '',
        time_zone: '(GMT-08:00) Pacific Time (US & Canada)',
        preferred_date_format: 'MM/DD/YYYY',
        social_facebook: '',
        social_x_twitter: '',
        social_instagram: '',
        social_tiktok: '',
        social_pinterest: '',
        social_youtube: '',
        social_vimeo: '',
        social_linkedin: ''
    });

    useEffect(() => {
        if (!user?.id) return;
        
        galleryService.getPhotographerProfile(user.id)
            .then(data => {
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        profile_icon_url: data.profile_icon_url || '',
                        business_name: data.business_name || '',
                        first_name: data.first_name || '',
                        last_name: data.last_name || '',
                        contact_email: data.contact_email || '',
                        phone: data.phone || '',
                        website: data.website || '',
                        biography: data.biography || data.bio || '',
                        business_country: data.business_country || '',
                        address_line_1: data.address_line_1 || '',
                        address_line_2: data.address_line_2 || '',
                        state_province: data.state_province || '',
                        city: data.city || '',
                        zip_postal_code: data.zip_postal_code || '',
                        time_zone: data.time_zone || '(GMT-08:00) Pacific Time (US & Canada)',
                        preferred_date_format: data.preferred_date_format || 'MM/DD/YYYY',
                        social_facebook: data.social_facebook || '',
                        social_x_twitter: data.social_x_twitter || '',
                        social_instagram: data.social_instagram || '',
                        social_tiktok: data.social_tiktok || '',
                        social_pinterest: data.social_pinterest || '',
                        social_youtube: data.social_youtube || '',
                        social_vimeo: data.social_vimeo || '',
                        social_linkedin: data.social_linkedin || ''
                    }));
                }
            })
            .catch(err => console.error("Error fetching profile:", err))
            .finally(() => setLoading(false));
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAutoSave = async (fieldName, value) => {
        if (!user?.id) return;
        setSaving(true);
        try {
            await galleryService.updatePhotographerProfile(user.id, { [fieldName]: value });
            showToast('Changes saved successfully!');
        } catch (err) {
            console.error("Failed to auto-save profile field:", fieldName, err);
        }
        setSaving(false);
    };

    const handleIconClick = () => {
        fileInputRef.current?.click();
    };

    const handleIconChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !user?.id) return;

        setUploadingIcon(true);
        try {
            const ext = file.name.split('.').pop() || 'png';
            const path = `photographers/${user.id}/profile_icon_${Date.now()}.${ext}`;
            const uploadResult = await storageService.upload(path, file);
            const imageUrl = uploadResult.url;
            
            setFormData(prev => ({ ...prev, profile_icon_url: imageUrl }));
            await handleAutoSave('profile_icon_url', imageUrl);
        } catch (err) {
            console.error("Error uploading profile icon:", err);
            alert("Failed to upload profile icon. Please try again.");
        } finally {
            setUploadingIcon(false);
        }
    };

    const handleRemoveIcon = async (e) => {
        e.stopPropagation();
        if (!user?.id) return;
        
        setUploadingIcon(true);
        try {
            setFormData(prev => ({ ...prev, profile_icon_url: '' }));
            await handleAutoSave('profile_icon_url', '');
        } catch (err) {
            console.error("Error removing profile icon:", err);
        } finally {
            setUploadingIcon(false);
        }
    };

    if (loading) {
        return <div className="py-8 text-[#888]">Loading profile...</div>;
    }

    return (
        <div className="flex flex-col gap-12 pb-20 relative">
            <style>{`
                .profile-upload-box {
                    width: 120px;
                    height: 120px;
                    background-color: #f5f5f5;
                    margin-bottom: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #999;
                    cursor: pointer;
                    position: relative;
                    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                    border-radius: 4px;
                    overflow: hidden;
                }
                .profile-upload-box:hover {
                    background-color: #eaeaea;
                }
                .profile-upload-inner {
                    width: 36px;
                    height: 36px;
                    border: 1.5px solid #d1d5db;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: #ffffff;
                    color: #4b5563;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.06);
                    transition: all 0.2s ease;
                }
                .profile-upload-box:hover .profile-upload-inner {
                    border-color: #9ca3af;
                    transform: scale(1.08);
                    box-shadow: 0 4px 6px rgba(0,0,0,0.08);
                }
                .profile-upload-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.4);
                    color: #ffffff;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.2s ease;
                    font-size: 12px;
                    font-weight: 500;
                }
                .profile-upload-box:hover .profile-upload-overlay {
                    opacity: 1;
                }
                .profile-upload-remove-btn {
                    position: absolute;
                    top: 6px;
                    right: 6px;
                    background-color: rgba(255, 255, 255, 0.9);
                    border: none;
                    border-radius: 50%;
                    width: 20px;
                    height: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
                    color: #ef4444;
                    transition: all 0.15s ease;
                    z-index: 10;
                }
                .profile-upload-remove-btn:hover {
                    background-color: #ffffff;
                    color: #dc2626;
                    transform: scale(1.1);
                }
                .profile-upload-spinner {
                    width: 24px;
                    height: 24px;
                    border: 2px solid rgba(0,0,0,0.1);
                    border-top: 2px solid #1a9b84;
                    border-radius: 50%;
                    animation: profile-spin 0.8s linear infinite;
                }
                @keyframes profile-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            <div>
                <h1 className="text-[28px] font-normal text-[#111] mb-8 pb-4 border-b border-[#f1f1f1]">Profile</h1>
                
                {/* Business Details */}
                <h2 className="text-[11px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">BUSINESS DETAILS</h2>
                
                <div className="flex flex-col gap-8 w-full">
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Profile Icon</label>
                        <div 
                            className="profile-upload-box" 
                            onClick={handleIconClick}
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleIconChange} 
                                style={{ display: 'none' }} 
                                accept="image/*" 
                            />
                            {uploadingIcon ? (
                                <div className="profile-upload-spinner"></div>
                            ) : formData.profile_icon_url ? (
                                <>
                                    <img src={formData.profile_icon_url} alt="Profile Icon" className="w-full h-full object-cover" />
                                    <div className="profile-upload-overlay">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mb-1"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2 2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                                        Change
                                    </div>
                                    <button 
                                        className="profile-upload-remove-btn" 
                                        onClick={handleRemoveIcon}
                                        title="Remove Icon"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </>
                            ) : (
                                <div className="profile-upload-inner">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                </div>
                            )}
                        </div>
                        <p className="text-[13px] text-[#888] leading-relaxed">Your profile icon is a center cropped square icon shown on your galleries, homepage<br/>and applicable places. Tip: make your image a square image before uploading.</p>
                    </div>

                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Business Name</label>
                        <input 
                            type="text" 
                            name="business_name"
                            value={formData.business_name}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('business_name', e.target.value)}
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                        <p className="text-[13px] text-[#888] mt-2">Your business name is shown on your homepage, collections, email notifications and more.</p>
                    </div>

                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">First Name</label>
                        <input 
                            type="text" 
                            name="first_name"
                            value={formData.first_name}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('first_name', e.target.value)}
                            placeholder="Your first name"
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                        <p className="text-[13px] text-[#888] mt-2">Your first name is shown on your Studio Manager documents including contract signatures.</p>
                    </div>

                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Last Name</label>
                        <input 
                            type="text" 
                            name="last_name"
                            value={formData.last_name}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('last_name', e.target.value)}
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                        <p className="text-[13px] text-[#888] mt-2">Your last name is shown on your Studio Manager documents including contract signatures.</p>
                    </div>

                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Contact Email</label>
                        <input 
                            type="email" 
                            name="contact_email"
                            value={formData.contact_email}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('contact_email', e.target.value)}
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                        <p className="text-[13px] text-[#888] mt-2">This email is shown publicly to your clients. This is not your account login email.</p>
                    </div>

                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Phone</label>
                        <input 
                            type="text" 
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('phone', e.target.value)}
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                    </div>

                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Website</label>
                        <input 
                            type="text" 
                            name="website"
                            value={formData.website}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('website', e.target.value)}
                            placeholder="https://"
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                        <p className="text-[13px] text-[#888] mt-2">Your client will find links back to your website in many places throughout Pixieset. It is important that you enter a valid website</p>
                    </div>

                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Biography</label>
                        <textarea 
                            name="biography"
                            value={formData.biography}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('biography', e.target.value)}
                            rows="4"
                            maxLength="500"
                            placeholder="Optional. Max 500 characters."
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] resize-y transition-colors"
                        ></textarea>
                        <div className="w-full text-left text-[12px] text-[#888] mt-1">{formData.biography.length} / 500</div>
                    </div>
                </div>
            </div>

            {/* Business Address */}
            <div className="mt-2">
                <h2 className="text-[12px] font-bold text-[#999] tracking-[0.1em] uppercase mb-4">BUSINESS ADDRESS</h2>
                
                <div className="flex flex-col gap-6 w-full">
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Business Country</label>
                        <select 
                            name="business_country"
                            value={formData.business_country}
                            onChange={(e) => { handleChange(e); handleAutoSave('business_country', e.target.value); }}
                            className="w-full border border-[#ddd] px-3 py-2 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] bg-white h-[44px] transition-colors"
                        >
                            <option value="">Select a country</option>
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="UK">United Kingdom</option>
                            <option value="AU">Australia</option>
                            <option value="IN">India</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Address Line 1</label>
                        <input 
                            type="text" 
                            name="address_line_1"
                            value={formData.address_line_1}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('address_line_1', e.target.value)}
                            placeholder="Street Address"
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Address Line 2</label>
                        <input 
                            type="text" 
                            name="address_line_2"
                            value={formData.address_line_2}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('address_line_2', e.target.value)}
                            placeholder="Unit / Apartment Number"
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">State / Province</label>
                        <input 
                            type="text" 
                            name="state_province"
                            value={formData.state_province}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('state_province', e.target.value)}
                            placeholder="State / Province"
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">City</label>
                        <input 
                            type="text" 
                            name="city"
                            value={formData.city}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('city', e.target.value)}
                            placeholder="City"
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Zip / Postal Code</label>
                        <input 
                            type="text" 
                            name="zip_postal_code"
                            value={formData.zip_postal_code}
                            onChange={handleChange}
                            onBlur={(e) => handleAutoSave('zip_postal_code', e.target.value)}
                            placeholder="Zip / Postal"
                            className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                        />
                    </div>
                </div>
            </div>

            {/* Standards & Formats */}
            <div className="mt-2">
                <h2 className="text-[12px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">STANDARDS & FORMATS</h2>
                
                <div className="flex flex-col gap-6 w-full">
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Time Zone</label>
                        <select 
                            name="time_zone"
                            value={formData.time_zone}
                            onChange={(e) => { handleChange(e); handleAutoSave('time_zone', e.target.value); }}
                            className="w-full border border-[#ddd] px-3 py-2 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] bg-white h-[44px] transition-colors"
                        >
                            <option value="(GMT-08:00) Pacific Time (US & Canada)">(GMT-08:00) Pacific Time (US & Canada)</option>
                            <option value="(GMT-05:00) Eastern Time (US & Canada)">(GMT-05:00) Eastern Time (US & Canada)</option>
                            <option value="(GMT+00:00) London">(GMT+00:00) London</option>
                            <option value="(GMT+05:30) Asia, Kolkata">(GMT+05:30) Asia, Kolkata</option>
                            <option value="(GMT+05:30) India Standard Time">(GMT+05:30) India Standard Time</option>
                        </select>
                    </div>
                    
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Preferred Date Format</label>
                        <select 
                            name="preferred_date_format"
                            value={formData.preferred_date_format}
                            onChange={(e) => { handleChange(e); handleAutoSave('preferred_date_format', e.target.value); }}
                            className="w-full border border-[#ddd] px-3 py-2 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] bg-white h-[44px] transition-colors"
                        >
                            <option value="mm/dd/yyyy">mm/dd/yyyy</option>
                            <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                            <option value="yyyy/mm/dd">yyyy/mm/dd</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Social */}
            <div className="mt-2">
                <h2 className="text-[12px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">SOCIAL</h2>
                
                <div className="flex flex-col gap-6 w-full">
                    {[
                        { 
                            label: 'Facebook', 
                            name: 'social_facebook',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                            )
                        },
                        { 
                            label: 'X (formerly Twitter)', 
                            name: 'social_x_twitter',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                            )
                        },
                        { 
                            label: 'Instagram', 
                            name: 'social_instagram',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#111]"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                            )
                        },
                        { 
                            label: 'TikTok', 
                            name: 'social_tiktok',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .8.11v-3.5a6.8 6.8 0 0 0-1.23-.1 6.35 6.35 0 0 0-6.1 6.3 6.27 6.27 0 0 0 6.1 6.25 6.27 6.27 0 0 0 6.1-6.25V7.95a10.6 10.6 0 0 0 4.45 1.01V5.51a8.38 8.38 0 0 1-4.21-1.18z"/></svg>
                            )
                        },
                        { 
                            label: 'Pinterest', 
                            name: 'social_pinterest',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.08 3.16 9.43 7.63 11.17-.1-.95-.19-2.4.04-3.44.22-.94 1.4-6 1.4-6s-.36-.72-.36-1.78c0-1.67.97-2.91 2.17-2.91 1.02 0 1.52.77 1.52 1.69 0 1.03-.66 2.57-1 4-.28 1.19.6 2.17 1.78 2.17 2.13 0 3.77-2.25 3.77-5.5 0-2.87-2.06-4.88-5.01-4.88-3.41 0-5.42 2.56-5.42 5.21 0 1.03.4 2.14.89 2.74.1.12.11.23.08.35l-.33 1.35c-.05.22-.17.27-.4.16-1.5-.7-2.44-2.89-2.44-4.65 0-3.79 2.75-7.26 7.93-7.26 4.16 0 7.4 2.97 7.4 6.93 0 4.14-2.61 7.46-6.23 7.46-1.22 0-2.36-.63-2.75-1.38l-.75 2.85c-.27 1.04-1 2.35-1.49 3.15C9.57 23.81 10.76 24 12 24c6.63 0 12-5.37 12-12S18.63 0 12 0z"/></svg>
                            )
                        },
                        { 
                            label: 'YouTube', 
                            name: 'social_youtube',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.508a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.508 9.388.508 9.388.508s7.518 0 9.388-.508a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                            )
                        },
                        { 
                            label: 'Vimeo', 
                            name: 'social_vimeo',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M22.396 7.158c-.092 2.037-1.514 4.824-4.264 8.363-2.85 3.69-5.26 5.534-7.234 5.534-1.22 0-2.257-1.123-3.112-3.37L5.03 8.96c-.642-2.385-1.33-3.578-2.064-3.578-.152 0-.68.322-1.586.966l-.95-.1.21-.99c.974-.853 1.93-1.7 2.87-2.54 1.285-1.077 2.215-1.65 2.793-1.723 1.343-.16 2.17.765 2.476 2.784.336 2.222.565 3.6.69 4.13.396 2.382.793 3.573 1.19 3.573.304 0 .762-.486 1.374-1.46.61-.97 1.258-2.072 1.942-3.298.672-1.218.992-2.116.96-2.697-.062-.83-.544-1.246-1.444-1.246-.427 0-.915.09-1.462.274 1.198-3.924 3.473-5.787 6.827-5.59 2.478.143 3.64 1.545 3.486 4.2z"/></svg>
                            )
                        },
                        { 
                            label: 'LinkedIn', 
                            name: 'social_linkedin',
                            icon: (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-[#111]"><path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z"/></svg>
                            )
                        }
                    ].map(social => (
                        <div key={social.name}>
                            <label className="flex items-center gap-2 text-[15px] font-bold text-[#111] mb-2">
                                <span className="flex items-center w-[18px] h-[18px] justify-center">{social.icon}</span>
                                <span>{social.label}</span>
                            </label>
                            <input 
                                type="text" 
                                name={social.name}
                                value={formData[social.name]}
                                onChange={handleChange}
                                onBlur={(e) => handleAutoSave(social.name, e.target.value)}
                                placeholder="e.g. mydomain.com"
                                className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function AccountTab({ user, showToast }) {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Modals
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    
    // Forms
    const [modalUsername, setModalUsername] = useState('');
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [deleteSaving, setDeleteSaving] = useState(false);

    const fallbackSlug = user?.email ? user.email.split('@')[0] : 'poojz';

    const [formData, setFormData] = useState({
        homepage_slug: fallbackSlug,
        email: user?.email || 'poojaelango03@gmail.com',
        two_factor_enabled: false,
        google_connected: true,
        apple_connected: false,
        login_password_set: false,
        active_sessions: []
    });

    // Load dynamic data on mount
    useEffect(() => {
        if (!user?.id) return;
        
        galleryService.getPhotographerProfile(user.id)
            .then(data => {
                if (data) {
                    let sessions = data.active_sessions || [];
                    if (sessions.length === 0) {
                        const userAgent = navigator.userAgent;
                        let browser = "Chrome 148";
                        let os = "Windows 10";
                        if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) browser = "Safari";
                        else if (userAgent.includes("Firefox")) browser = "Firefox";
                        else if (userAgent.includes("Edg")) browser = "Edge";
                        
                        if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS")) os = "macOS";
                        else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";
                        else if (userAgent.includes("Android")) os = "Android";
                        else if (userAgent.includes("Linux")) os = "Linux";

                        sessions = [{
                            id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
                            device: `${os}, ${browser}`,
                            lastActive: 'Current session',
                            ip: '2409:408d:3c0a:e5c:a02c:1ea4:258f:68e'
                        }];
                        galleryService.updatePhotographerProfile(user.id, { active_sessions: sessions })
                            .catch(err => console.error("Error setting initial session:", err));
                    }

                    setFormData(prev => ({
                        ...prev,
                        homepage_slug: data.homepage_slug || data.username || fallbackSlug,
                        email: data.contact_email || user?.email || 'poojaelango03@gmail.com',
                        two_factor_enabled: data.two_factor_enabled || false,
                        google_connected: data.google_connected !== undefined ? data.google_connected : true,
                        apple_connected: data.apple_connected || false,
                        login_password_set: data.login_password_set || false,
                        active_sessions: sessions
                    }));
                }
            })
            .catch(err => console.error("Error fetching account details:", err))
            .finally(() => setLoading(false));
    }, [user]);

    // Live IP detection
    useEffect(() => {
        if (!user?.id) return;
        fetch('https://api.ipify.org?format=json')
            .then(res => res.json())
            .then(data => {
                if (data.ip) {
                    setFormData(prev => {
                        const updated = { ...prev };
                        if (updated.active_sessions && updated.active_sessions.length > 0) {
                            updated.active_sessions = updated.active_sessions.map((s, idx) => 
                                idx === 0 ? { ...s, ip: data.ip } : s
                            );
                            galleryService.updatePhotographerProfile(user.id, { active_sessions: updated.active_sessions })
                                .catch(err => console.error("Error saving session IP:", err));
                        }
                        return updated;
                    });
                }
            })
            .catch(() => {});
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAutoSave = async (fieldName, value) => {
        if (!user?.id) return;
        showToast('Changes saved successfully!');
        setSaving(true);
        try {
            await galleryService.updatePhotographerProfile(user.id, { [fieldName]: value });
        } catch (err) {
            console.error("Failed to auto-save account field:", fieldName, err);
        }
        setSaving(false);
    };

    const toggle2FA = async () => {
        const newValue = !formData.two_factor_enabled;
        setFormData(prev => ({ ...prev, two_factor_enabled: newValue }));
        showToast(`Two-factor authentication ${newValue ? 'enabled' : 'disabled'}`);
        try {
            await galleryService.updatePhotographerProfile(user.id, { two_factor_enabled: newValue });
        } catch (err) {
            console.error("Failed to toggle 2FA:", err);
        }
    };

    const handleSetPassword = async (e) => {
        e.preventDefault();
        setPasswordError('');
        if (!passwordForm.newPassword) {
            setPasswordError('Password cannot be empty.');
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('Passwords do not match.');
            return;
        }
        setPasswordSaving(true);
        try {
            const { error: authError } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
            if (authError) throw authError;

            await galleryService.updatePhotographerProfile(user.id, { login_password_set: true });
            setFormData(prev => ({ ...prev, login_password_set: true }));
            setShowPasswordModal(false);
            setPasswordForm({ newPassword: '', confirmPassword: '' });
            showToast('Password updated successfully!');
        } catch (err) {
            console.error("Error setting password:", err);
            setPasswordError(err.message || 'Failed to update password.');
        } finally {
            setPasswordSaving(false);
        }
    };

    const handleDeleteAccount = async (e) => {
        e.preventDefault();
        setDeleteError('');
        if (deleteConfirmEmail.toLowerCase() !== formData.email.toLowerCase()) {
            setDeleteError('Email does not match.');
            return;
        }
        setDeleteSaving(true);
        try {
            // Delete photographer record
            const { error: dbError } = await supabase
                .from('photographers')
                .delete()
                .eq('id', user.id);
            if (dbError) throw dbError;

            // Log out user
            await logout();
            navigate('/auth');
        } catch (err) {
            console.error("Error deleting account:", err);
            setDeleteError(err.message || 'Failed to delete account.');
        } finally {
            setDeleteSaving(false);
        }
    };

    const revokeSession = async (sessionId) => {
        const updated = formData.active_sessions.filter(s => s.id !== sessionId);
        setFormData(prev => ({ ...prev, active_sessions: updated }));
        await handleAutoSave('active_sessions', updated);
        showToast('Session terminated successfully.');
    };

    if (loading) {
        return <div className="py-8 text-[#888]">Loading account...</div>;
    }

    return (
        <div className="flex flex-col gap-12 pb-20 relative">
            <div>
                <h1 className="text-[28px] font-normal text-[#111] mb-8 pb-4 border-b border-[#f1f1f1]">Account</h1>
                
                {/* Account Info */}
                <h2 className="text-[11px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">ACCOUNT INFO</h2>
                
                <div className="flex flex-col gap-8 w-full">
                    {/* Username */}
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Username</label>
                        <div className="w-full bg-[#f9f9f9] border border-[#f1f1f1] px-4 py-3 flex justify-between items-center group transition-colors hover:border-[#ddd]">
                            <span className="text-[15px] text-[#111]">{formData.homepage_slug}</span>
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a9b84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                className="cursor-pointer opacity-80 hover:opacity-100 flex-shrink-0 ml-2"
                                onClick={() => {
                                    setModalUsername(formData.homepage_slug);
                                    setShowUsernameModal(true);
                                }}
                            >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                        <p className="text-[13px] text-[#888] mt-2">
                            Your Homepage will be at{' '}
                            <a 
                                href={getDynamicHomepageUrl(formData.homepage_slug)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="text-[#1a9b84] hover:underline font-medium"
                            >
                                {getDynamicHomepageUrl(formData.homepage_slug)}
                            </a>
                        </p>
                    </div>

                    {/* Account Email */}
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Account Email</label>
                        
                        <div className="bg-[#fff9e6] border border-[#ffecb3] p-4 flex gap-3 mb-4 rounded-[2px]">
                            <div className="mt-0.5">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="#333" className="text-white">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                </svg>
                            </div>
                            <div className="text-[13px] text-[#333] font-medium leading-relaxed">
                                Your email address has not been verified. To keep your account safe and secure, we've sent an email to verify your email address and activate your account. <span className="text-[#1a9b84] cursor-pointer hover:underline">Resend confirmation email.</span>
                            </div>
                        </div>

                        <div className="w-full bg-[#f9f9f9] border border-[#f1f1f1] px-4 py-3 flex justify-between items-center group transition-colors hover:border-[#ddd]">
                            <span className="text-[15px] text-[#111]">{formData.email}</span>
                            <svg 
                                width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a9b84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                className="cursor-pointer opacity-80 hover:opacity-100 flex-shrink-0 ml-2"
                                onClick={() => setShowEmailModal(true)}
                            >
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </div>
                        <p className="text-[13px] text-[#888] mt-2">You will receive important notifications at this email, and your client will see this email where applicable.</p>
                    </div>

                    {/* Account Password */}
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Account Password</label>
                        <div className="w-full border border-[#f1f1f1] p-2 flex justify-between items-center bg-white">
                            <span className={`text-[15px] px-2 ${formData.login_password_set ? 'text-[#111]' : 'text-[#999]'}`}>
                                {formData.login_password_set ? 'Password set' : 'No Password set'}
                            </span>
                            <button 
                                onClick={() => setShowPasswordModal(true)}
                                className="bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#333] text-[14px] font-medium px-4 py-2 transition-colors rounded-[2px]"
                            >
                                {formData.login_password_set ? 'Change Password' : 'Set a Password'}
                            </button>
                        </div>
                        <p className="text-[13px] text-[#888] mt-2">
                            {formData.login_password_set 
                                ? 'Your password is set, you can use it to log in alongside your social connections.' 
                                : "Your password is not set, once you create it you'll be able to log in using it as well."}
                        </p>
                    </div>

                    {/* Social Login */}
                    <div>
                        <label className="block text-[15px] font-bold text-[#111] mb-2">Social Login</label>
                        <div className="border border-[#f1f1f1] bg-white flex flex-col">
                            {/* Google */}
                            <div className="flex justify-between items-center p-3 border-b border-[#f1f1f1]">
                                <div className="flex items-center gap-4 px-2">
                                    <svg width="22" height="22" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                                    </svg>
                                    <span className="text-[15px] font-bold text-[#111]">Google</span>
                                    <span className="text-[14px] text-[#999]">{formData.google_connected ? 'Connected' : 'Not connected'}</span>
                                </div>
                                <button 
                                    className="bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#333] text-[14px] font-medium px-4 py-2 transition-colors rounded-[2px] min-w-[120px]"
                                    onClick={async () => {
                                        const newValue = !formData.google_connected;
                                        setFormData(prev => ({ ...prev, google_connected: newValue }));
                                        await handleAutoSave('google_connected', newValue);
                                        showToast(`Google integration ${newValue ? 'connected' : 'disconnected'}`);
                                    }}
                                >
                                    {formData.google_connected ? 'Disconnect' : 'Connect'}
                                </button>
                            </div>
                            
                            {/* Apple */}
                            <div className="flex justify-between items-center p-3">
                                <div className="flex items-center gap-4 px-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="#000000" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M17.05 13.92c-.023-1.944 1.583-2.894 1.656-2.94-1.258-1.841-3.21-2.091-3.922-2.115-1.66-.17-3.242 1.002-4.088 1.002-.858 0-2.164-1.01-3.56-1.01-1.83 0-3.524 1.066-4.464 2.716-1.905 3.303-.487 8.2 1.365 10.876.908 1.31 1.977 2.775 3.407 2.723 1.385-.05 1.907-.893 3.525-.893 1.606 0 2.096.893 3.537.868 1.488-.025 2.417-1.318 3.313-2.636 1.037-1.517 1.464-2.983 1.484-3.058-.032-.014-2.222-.853-2.253-5.533zM15.467 4.966c.773-.935 1.293-2.235 1.15-3.533-1.11.045-2.455.74-3.25 1.67-.714.832-1.336 2.155-1.173 3.432 1.238.096 2.5-.66 3.273-1.569z"/>
                                    </svg>
                                    <span className="text-[15px] font-bold text-[#111]">Apple</span>
                                    <span className="text-[14px] text-[#999]">{formData.apple_connected ? 'Connected' : 'Not connected'}</span>
                                </div>
                                <button 
                                    className="bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#333] text-[14px] font-medium px-4 py-2 transition-colors rounded-[2px] min-w-[120px]"
                                    onClick={async () => {
                                        const newValue = !formData.apple_connected;
                                        setFormData(prev => ({ ...prev, apple_connected: newValue }));
                                        await handleAutoSave('apple_connected', newValue);
                                        showToast(`Apple integration ${newValue ? 'connected' : 'disconnected'}`);
                                    }}
                                >
                                    {formData.apple_connected ? 'Disconnect' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Security */}
                <div className="mt-14">
                    <h2 className="text-[11px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">ACCOUNT SECURITY</h2>
                    
                    <div className="flex flex-col gap-10 w-full">
                        {/* Two-Factor Authentication */}
                        <div>
                            <h3 className="text-[15px] font-bold text-[#111] mb-4">Two-Factor Authentication</h3>
                            <div className="flex items-center gap-3 mb-4">
                                <button 
                                    className={`w-[48px] h-[24px] rounded-full relative transition-colors ${formData.two_factor_enabled ? 'bg-[#1a9b84]' : 'bg-[#e0e0e0]'}`}
                                    onClick={toggle2FA}
                                >
                                    <div className={`absolute top-1 left-1 w-[16px] h-[16px] rounded-full bg-white transition-transform ${formData.two_factor_enabled ? 'translate-x-[24px]' : 'translate-x-0'}`}></div>
                                </button>
                                <span className={`text-[14px] ${formData.two_factor_enabled ? 'text-[#1a9b84]' : 'text-[#999]'}`}>
                                    {formData.two_factor_enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            <p className="text-[13px] text-[#888] leading-relaxed">
                                Two-factor authentication adds an extra layer of protection by requiring a verification code when you log in to your account with an email address and password. <span className="text-[#1a9b84] cursor-pointer hover:underline">Learn more</span>
                            </p>
                        </div>

                        {/* Your Devices / Browsers */}
                        <div>
                            <h3 className="text-[15px] font-bold text-[#111] mb-6">Your Devices / Browsers</h3>
                            <div className="w-full">
                                <div className="flex items-center border-b border-[#f1f1f1] pb-3 text-[13px] font-bold text-[#111]">
                                    <div className="w-[40%]">Device</div>
                                    <div className="w-[30%]">Last Active</div>
                                    <div className="w-[30%]">IP Address</div>
                                </div>
                                
                                {formData.active_sessions.map((session, idx) => (
                                    <div key={session.id || idx} className="flex items-center border-b border-[#f1f1f1] py-4 text-[14px] group">
                                        <div className="w-[40%] text-[#333]">{session.device}</div>
                                        <div className={`w-[30%] ${idx === 0 ? 'text-[#1a9b84]' : 'text-[#666]'}`}>
                                            {idx === 0 ? 'Current session' : session.lastActive}
                                        </div>
                                        <div className="w-[30%] text-[#666] flex justify-between items-center">
                                            {session.ip}
                                            {idx > 0 && (
                                                <svg 
                                                    width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
                                                    className="cursor-pointer hover:stroke-[#ff4d4f] opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => revokeSession(session.id)}
                                                >
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Manage Account */}
                <div className="mt-14">
                    <h2 className="text-[11px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">MANAGE ACCOUNT</h2>
                    <p className="text-[14px] text-[#888] leading-relaxed">
                        Please understand that by deleting your account, all photos, collections, mobile apps and other account data will be permanently deleted. Yes, <span onClick={() => setShowDeleteModal(true)} className="text-[#1a9b84] cursor-pointer hover:underline">delete</span> my account.
                    </p>
                </div>
            </div>

            {/* Set/Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <form onSubmit={handleSetPassword} className="bg-white w-[500px] shadow-lg flex flex-col">
                        <div className="px-8 py-6 border-b border-[#f1f1f1]">
                            <h2 className="text-[13px] font-bold text-[#333] tracking-[0.1em] uppercase">
                                {formData.login_password_set ? 'CHANGE PASSWORD' : 'SET A PASSWORD'}
                            </h2>
                        </div>
                        
                        <div className="p-8 flex flex-col gap-6">
                            {passwordError && (
                                <div className="text-[13px] text-red-500 bg-red-50 border border-red-200 px-4 py-3 rounded-[2px]">
                                    {passwordError}
                                </div>
                            )}
                            <div>
                                <label className="block text-[15px] font-bold text-[#111] mb-2">New Password</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-[15px] font-bold text-[#111] mb-2">Confirm Password</label>
                                <input 
                                    type="password" 
                                    required
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                                />
                            </div>
                        </div>
                        
                        <div className="px-8 py-5 flex justify-end items-center gap-4 border-t border-[#f1f1f1] bg-[#fafafa]">
                            <button 
                                type="button"
                                className="text-[14px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                onClick={() => {
                                    setShowPasswordModal(false);
                                    setPasswordForm({ newPassword: '', confirmPassword: '' });
                                    setPasswordError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={passwordSaving}
                                className="bg-[#1a9b84] hover:bg-[#15826e] text-white text-[14px] font-medium px-6 py-2 transition-colors rounded-[2px] disabled:opacity-50"
                            >
                                {passwordSaving ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Delete Account Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <form onSubmit={handleDeleteAccount} className="bg-white w-[500px] shadow-lg flex flex-col">
                        <div className="px-8 py-6 border-b border-[#f1f1f1]">
                            <h2 className="text-[13px] font-bold text-[#ff4d4f] tracking-[0.1em] uppercase">DELETE ACCOUNT</h2>
                        </div>
                        
                        <div className="p-8 flex flex-col gap-6">
                            <div className="text-[14px] text-[#333] bg-red-50 border border-red-200 px-4 py-3 rounded-[2px] leading-relaxed">
                                <strong>Warning:</strong> Deleting your account will permanently delete all of your photos, collections, client galleries, mobile apps, and other related data. This action is completely irreversible.
                            </div>
                            {deleteError && (
                                <div className="text-[13px] text-red-500 bg-red-50 border border-red-200 px-4 py-3 rounded-[2px]">
                                    {deleteError}
                                </div>
                            )}
                            <div>
                                <label className="block text-[15px] font-bold text-[#111] mb-2">
                                    To confirm, type your account email: <strong className="select-all text-[#1a9b84]">{formData.email}</strong>
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    value={deleteConfirmEmail}
                                    onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                                    placeholder={formData.email}
                                    className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#ff4d4f] transition-colors"
                                />
                            </div>
                        </div>
                        
                        <div className="px-8 py-5 flex justify-end items-center gap-4 border-t border-[#f1f1f1] bg-[#fafafa]">
                            <button 
                                type="button"
                                className="text-[14px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                onClick={() => {
                                    setShowDeleteModal(false);
                                    setDeleteConfirmEmail('');
                                    setDeleteError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit"
                                disabled={deleteSaving}
                                className="bg-[#ff4d4f] hover:bg-[#d9363e] text-white text-[14px] font-medium px-6 py-2 transition-colors rounded-[2px] disabled:opacity-50"
                            >
                                {deleteSaving ? 'Deleting...' : 'Delete Account'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Edit Username Modal */}
            {showUsernameModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <div className="bg-white w-[500px] shadow-lg flex flex-col">
                        <div className="px-8 py-6 border-b border-[#f1f1f1]">
                            <h2 className="text-[13px] font-bold text-[#333] tracking-[0.1em] uppercase">EDIT USERNAME</h2>
                        </div>
                        
                        <div className="p-8">
                            <div className="flex gap-3 mb-6">
                                <div className="mt-0.5">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4d4f" className="text-white">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                    </svg>
                                </div>
                                <div className="text-[14px] text-[#333] leading-relaxed">
                                    Your username is directly tied to your Pixieset URL (e.g. https://yourusername.pixieset.com). If you change your username, your URLs for existing galleries, portfolio website, and booking site will be immediately changed as well.
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-[15px] font-bold text-[#111] mb-2">New Username</label>
                                <input 
                                    type="text" 
                                    value={modalUsername}
                                    onChange={(e) => setModalUsername(e.target.value)}
                                    className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                                />
                            </div>
                        </div>
                        
                        <div className="px-8 py-5 flex justify-end items-center gap-4 border-t border-[#f1f1f1] bg-[#fafafa]">
                            <button 
                                className="text-[14px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                onClick={() => setShowUsernameModal(false)}
                            >
                                Cancel
                            </button>
                            <button 
                                className="bg-[#1a9b84] hover:bg-[#15826e] text-white text-[14px] font-medium px-6 py-2 transition-colors rounded-[2px]"
                                onClick={async () => {
                                    setFormData(prev => ({ ...prev, homepage_slug: modalUsername }));
                                    setShowUsernameModal(false);
                                    await handleAutoSave('homepage_slug', modalUsername);
                                    window.dispatchEvent(new CustomEvent('pixnxt:username-changed', { detail: { slug: modalUsername } }));
                                }}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <div className="bg-white w-[500px] shadow-lg flex flex-col">
                        <div className="px-8 py-6 border-b border-[#f1f1f1]">
                            <h2 className="text-[13px] font-bold text-[#333] tracking-[0.1em] uppercase">EDIT ACCOUNT EMAIL</h2>
                        </div>
                        
                        <div className="p-8">
                            {formData.google_connected ? (
                                <div className="flex gap-3">
                                    <div className="mt-0.5">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#ff4d4f" className="text-white">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                                        </svg>
                                    </div>
                                    <div className="text-[14px] text-[#333] leading-relaxed">
                                        Your Pixieset account is connected to your Google account. To update your email, you must first disconnect your Google account.
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-[15px] font-bold text-[#111] mb-2">New Account Email</label>
                                    <input 
                                        type="email" 
                                        value={formData.email}
                                        onChange={handleChange}
                                        name="email"
                                        className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors"
                                    />
                                    <p className="text-[13px] text-[#888] mt-2">Updating your email will require re-verification.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="px-8 py-5 flex justify-end items-center gap-4 border-t border-[#f1f1f1] bg-[#fafafa]">
                            {formData.google_connected ? (
                                <button 
                                    className="text-[14px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                    onClick={() => setShowEmailModal(false)}
                                >
                                    Close
                                </button>
                            ) : (
                                <>
                                    <button 
                                        className="text-[14px] text-[#666] font-medium hover:text-[#111] transition-colors"
                                        onClick={() => setShowEmailModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        className="bg-[#1a9b84] hover:bg-[#15826e] text-white text-[14px] font-medium px-6 py-2 transition-colors rounded-[2px]"
                                        onClick={async () => {
                                            setShowEmailModal(false);
                                            await handleAutoSave('contact_email', formData.email);
                                        }}
                                    >
                                        Save
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function BillingTab({ user, showToast }) {
    const [card, setCard] = useState(null);
    const [showCardModal, setShowCardModal] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [selectedUpgradeProduct, setSelectedUpgradeProduct] = useState('');
    const [savingCard, setSavingCard] = useState(false);
    
    // Modal Form State
    const [cardName, setCardName] = useState('');
    const [cardNumber, setCardNumber] = useState('');
    const [cardExpiry, setCardExpiry] = useState('');
    const [cardCvc, setCardCvc] = useState('');

    // Dynamic Storage State
    const [storageUsedBytes, setStorageUsedBytes] = useState(0);
    const [loadingStorage, setLoadingStorage] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        
        // Fetch real collection details to calculate photo storage size dynamically
        galleryService.getCollections(user.id)
            .then(collections => {
                const totalBytes = (collections || []).reduce((acc, c) => acc + (c.storage_bytes || 0), 0);
                setStorageUsedBytes(totalBytes);
            })
            .catch(err => console.error("Error loading storage size:", err))
            .finally(() => setLoadingStorage(false));

        // Load card from localStorage
        const stored = localStorage.getItem(`pixnxt_card_${user.id}`);
        if (stored) {
            try {
                setCard(JSON.parse(stored));
            } catch (e) {
                console.error("Error parsing stored card:", e);
            }
        }
    }, [user]);

    const formatStorageText = (bytes) => {
        if (!bytes || bytes <= 0) return "0 MB used";
        const mb = bytes / (1024 * 1024);
        if (mb < 0.1) {
            return `${(bytes / 1024).toFixed(0)} KB used`;
        }
        if (mb < 1024) {
            return `${mb.toFixed(1)} MB used`;
        }
        const gb = mb / 1024;
        return `${gb.toFixed(2)} GB used`;
    };

    const handleSaveCard = (e) => {
        e.preventDefault();
        if (!cardName || !cardNumber || !cardExpiry || !cardCvc) {
            alert("Please fill in all card details.");
            return;
        }

        setSavingCard(true);
        setTimeout(() => {
            const last4 = cardNumber.replace(/\s+/g, '').slice(-4);
            const firstDigit = cardNumber.charAt(0);
            let brand = 'Visa';
            if (firstDigit === '5') brand = 'Mastercard';
            else if (firstDigit === '3') brand = 'American Express';
            else if (firstDigit === '6') brand = 'Discover';

            const newCard = {
                name: cardName,
                last4,
                expiry: cardExpiry,
                brand
            };

            setCard(newCard);
            if (user?.id) {
                localStorage.setItem(`pixnxt_card_${user.id}`, JSON.stringify(newCard));
            }
            setSavingCard(false);
            setShowCardModal(false);
            showToast('Credit card updated successfully!');
            
            // Reset form
            setCardName('');
            setCardNumber('');
            setCardExpiry('');
            setCardCvc('');
        }, 800);
    };

    const handleRemoveCard = () => {
        if (window.confirm("Are you sure you want to remove this credit card?")) {
            setCard(null);
            if (user?.id) {
                localStorage.removeItem(`pixnxt_card_${user.id}`);
            }
            showToast('Credit card removed successfully.');
        }
    };

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = (matches && matches[0]) || '';
        const parts = [];

        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }

        if (parts.length > 0) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const formatExpiry = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return `${v.slice(0, 2)}/${v.slice(2, 4)}`;
        }
        return v;
    };

    return (
        <div className="flex flex-col gap-10 pb-20 text-[#111]">
            {/* Header */}
            <div>
                <h1 className="text-[26px] font-light text-[#222] mb-1">Billing</h1>
            </div>

            {/* Current Subscriptions */}
            <div className="bg-white border border-[#eeeeee] rounded-[2px] p-8">
                <h2 className="text-[17px] font-medium text-[#222] mb-6">Current Subscriptions</h2>
                
                <div className="w-full">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1.5fr_1fr_2.5fr_1.2fr] pb-3 border-b border-[#f1f1f1] text-[11px] font-bold text-[#888] uppercase tracking-wider">
                        <div>Product</div>
                        <div>Plan</div>
                        <div>Details</div>
                        <div className="text-right">Action</div>
                    </div>

                    {/* Row 1: Client Gallery */}
                    <div className="grid grid-cols-[1.5fr_1fr_2.5fr_1.2fr] py-5 border-b border-[#f1f1f1] items-center text-[14px]">
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[#e8f7f2]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a9b84" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                            <span className="font-medium text-[#222]">Client Gallery</span>
                        </div>
                        <div className="text-[#444] font-medium">Free</div>
                        <div className="text-[#666] leading-relaxed text-[13px] flex flex-col gap-0.5">
                            <div>• 3 GB photo ({formatStorageText(storageUsedBytes)})</div>
                            <div>• 15% Store commission</div>
                            <div>• Limited mobile apps</div>
                        </div>
                        <div className="text-right">
                            <button 
                                onClick={() => { setSelectedUpgradeProduct('Client Gallery'); setShowUpgradeModal(true); }}
                                className="bg-[#1a9b84] hover:bg-[#15826e] text-white text-[13px] font-medium px-5 py-2 transition-colors rounded-[2px]"
                            >
                                Upgrade
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Website */}
                    <div className="grid grid-cols-[1.5fr_1fr_2.5fr_1.2fr] py-5 border-b border-[#f1f1f1] items-center text-[14px]">
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[#e3f2fd]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1976d2" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                            </div>
                            <span className="font-medium text-[#222]">Website</span>
                        </div>
                        <div className="text-[#444] font-medium">Free</div>
                        <div className="text-[#666] leading-relaxed text-[13px] flex flex-col gap-0.5">
                            <div>• Limited pages, photos and blog posts</div>
                        </div>
                        <div className="text-right">
                            <button 
                                onClick={() => { setSelectedUpgradeProduct('Website'); setShowUpgradeModal(true); }}
                                className="bg-[#1a9b84] hover:bg-[#15826e] text-white text-[13px] font-medium px-5 py-2 transition-colors rounded-[2px]"
                            >
                                Upgrade
                            </button>
                        </div>
                    </div>

                    {/* Row 3: Studio Manager */}
                    <div className="grid grid-cols-[1.5fr_1fr_2.5fr_1.2fr] py-5 items-center text-[14px]">
                        <div className="flex items-center gap-3.5">
                            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-[#e8f5e9]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                            </div>
                            <span className="font-medium text-[#222]">Studio Manager</span>
                        </div>
                        <div className="text-[#444] font-medium">Free</div>
                        <div className="text-[#666] leading-relaxed text-[13px] flex flex-col gap-0.5">
                            <div>• Unlimited invoices</div>
                            <div>• 3 contracts, 3 questionnaires, 3 quotes</div>
                            <div>• 1 session type and 1 payment link</div>
                            <div>• Limited document and booking options</div>
                        </div>
                        <div className="text-right">
                            <button 
                                onClick={() => { setSelectedUpgradeProduct('Studio Manager'); setShowUpgradeModal(true); }}
                                className="bg-[#1a9b84] hover:bg-[#15826e] text-white text-[13px] font-medium px-5 py-2 transition-colors rounded-[2px]"
                            >
                                Upgrade
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* The Pixnxt Suite Promo Card */}
            <div className="bg-[#fafafa] border border-[#eeeeee] rounded-[2px] p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Multi Badges Circle */}
                    <div className="flex -space-x-3 items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1a9b84] text-white shadow-md border-2 border-white z-5"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg></div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#3498db] text-white shadow-md border-2 border-white z-4"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg></div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#2ecc71] text-white shadow-md border-2 border-white z-3"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path></svg></div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#e74c3c] text-white shadow-md border-2 border-white z-2"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg></div>
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#f1c40f] text-white shadow-md border-2 border-white z-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg></div>
                    </div>
                    
                    <div className="flex flex-col gap-1 text-center md:text-left">
                        <span className="text-[13px] font-bold text-[#1a9b84] uppercase tracking-wider">The Pixnxt Suite</span>
                        <h3 className="text-[18px] font-bold text-[#222]">All essential apps. One simple plan.</h3>
                        <p className="text-[13px] text-[#666] max-w-[500px] leading-relaxed">Everything you need - Website, Client Gallery, Studio Manager, Store, Mobile Gallery App - in one package at a great price.</p>
                    </div>
                </div>
                
                <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
                    <div className="flex flex-col items-center md:items-end">
                        <span className="text-[20px] font-bold text-[#222]">From $28/month</span>
                        <span className="text-[12px] font-medium text-[#ff4d4f] bg-[#fff1f0] px-2 py-0.5 rounded-[2px] mt-0.5">Up to 37% OFF</span>
                    </div>
                    <button 
                        onClick={() => { setSelectedUpgradeProduct('The Pixnxt Suite'); setShowUpgradeModal(true); }}
                        className="border border-[#1a9b84] text-[#1a9b84] hover:bg-[#1a9b84] hover:text-white transition-all text-[13px] font-semibold px-6 py-2.5 rounded-[2px]"
                    >
                        SEE PRICING
                    </button>
                </div>
            </div>

            {/* Credit Card Section */}
            <div className="bg-white border border-[#eeeeee] rounded-[2px] p-8">
                <h2 className="text-[17px] font-medium text-[#222] mb-4">Credit Card</h2>
                
                {card ? (
                    <div className="flex items-center justify-between border border-[#e8f7f2] bg-[#fcfdfe] p-5 rounded-[4px]">
                        <div className="flex items-center gap-4">
                            {/* Card Brand Badge */}
                            <div className="w-14 h-9 border border-[#eaeaea] bg-white rounded-[4px] flex items-center justify-center font-bold text-[13px] text-[#444] shadow-sm tracking-wide">
                                {card.brand}
                            </div>
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[15px] font-medium text-[#222]">{card.brand} ending in {card.last4}</span>
                                <span className="text-[12px] text-[#666]">Expires {card.expiry} • Cardholder: {card.name}</span>
                            </div>
                        </div>
                        <button 
                            onClick={handleRemoveCard}
                            className="text-[13px] font-semibold text-[#ff4d4f] hover:text-[#d32f2f] hover:bg-[#fff1f0] px-4 py-2 transition-all rounded-[2px]"
                        >
                            Remove Card
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-start gap-4">
                        <p className="text-[14px] text-[#666]">You do not have a credit card on your account.</p>
                        <button 
                            onClick={() => setShowCardModal(true)}
                            className="bg-[#f0f0f0] hover:bg-[#e4e4e4] text-[#444] hover:text-[#111] text-[13px] font-medium px-5 py-2.5 transition-colors rounded-[2px] border border-[#dcdcdc]"
                        >
                            Add Credit Card
                        </button>
                    </div>
                )}
            </div>

            {/* Card Modal */}
            {showCardModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <div className="bg-white w-[480px] shadow-2xl flex flex-col rounded-[4px] overflow-hidden">
                        <div className="px-8 py-6 border-b border-[#f1f1f1] flex justify-between items-center">
                            <h2 className="text-[14px] font-bold text-[#333] tracking-[0.1em] uppercase">Add Credit Card</h2>
                            <button onClick={() => setShowCardModal(false)} className="text-[#888] hover:text-[#111] transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveCard} className="p-8 flex flex-col gap-5">
                            <div>
                                <label className="block text-[13px] font-bold text-[#333] mb-2 uppercase tracking-wide">Cardholder Name</label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="e.g. John Doe"
                                    value={cardName}
                                    onChange={(e) => setCardName(e.target.value)}
                                    className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors rounded-[2px]"
                                />
                            </div>

                            <div>
                                <label className="block text-[13px] font-bold text-[#333] mb-2 uppercase tracking-wide">Card Number</label>
                                <div className="relative flex items-center">
                                    <input 
                                        type="text" 
                                        required
                                        maxLength="19"
                                        placeholder="0000 0000 0000 0000"
                                        value={cardNumber}
                                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                                        className="w-full border border-[#ddd] pl-4 pr-12 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors rounded-[2px] tracking-wider"
                                    />
                                    {/* Brand Detection Icon */}
                                    <div className="absolute right-4 text-[11px] font-bold text-[#888]">
                                        {cardNumber.charAt(0) === '4' ? 'VISA' : cardNumber.charAt(0) === '5' ? 'MC' : cardNumber.charAt(0) === '3' ? 'AMEX' : 'CARD'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[13px] font-bold text-[#333] mb-2 uppercase tracking-wide">Expiration</label>
                                    <input 
                                        type="text" 
                                        required
                                        maxLength="5"
                                        placeholder="MM/YY"
                                        value={cardExpiry}
                                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                                        className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors rounded-[2px] text-center"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[13px] font-bold text-[#333] mb-2 uppercase tracking-wide">CVC</label>
                                    <input 
                                        type="password" 
                                        required
                                        maxLength="4"
                                        placeholder="•••"
                                        value={cardCvc}
                                        onChange={(e) => setCardCvc(e.target.value.replace(/[^0-9]/g, ''))}
                                        className="w-full border border-[#ddd] px-4 py-2.5 text-[15px] text-[#111] focus:outline-none focus:border-[#1a9b84] transition-colors rounded-[2px] text-center"
                                    />
                                </div>
                            </div>

                            <div className="mt-4 flex justify-end gap-3.5">
                                <button 
                                    type="button"
                                    className="text-[14px] text-[#666] font-medium hover:text-[#111] px-4 py-2 transition-colors"
                                    onClick={() => setShowCardModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={savingCard}
                                    className="bg-[#1a9b84] hover:bg-[#15826e] text-white text-[14px] font-medium px-6 py-2 transition-colors rounded-[2px] min-w-[100px] flex items-center justify-center"
                                >
                                    {savingCard ? 'Saving...' : 'Save Card'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <div className="bg-white w-[540px] shadow-2xl flex flex-col rounded-[4px] overflow-hidden">
                        <div className="px-8 py-6 border-b border-[#f1f1f1] flex justify-between items-center">
                            <h2 className="text-[14px] font-bold text-[#333] tracking-[0.1em] uppercase">Upgrade {selectedUpgradeProduct}</h2>
                            <button onClick={() => setShowUpgradeModal(false)} className="text-[#888] hover:text-[#111] transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                        
                        <div className="p-8 flex flex-col gap-6">
                            <div className="text-[15px] text-[#444] leading-relaxed">
                                You are about to upgrade your plan for <span className="font-semibold text-[#111]">{selectedUpgradeProduct}</span>. Choose the billing frequency below:
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="border-2 border-[#1a9b84] bg-[#e8f7f2]/20 p-5 rounded-[4px] flex flex-col gap-2 relative cursor-pointer">
                                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#1a9b84] flex items-center justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </div>
                                    <span className="text-[12px] font-bold text-[#1a9b84] uppercase tracking-wide">Yearly Plan</span>
                                    <span className="text-[22px] font-bold text-[#222]">$28<span className="text-sm font-normal text-[#666]">/mo</span></span>
                                    <span className="text-[12px] text-[#2ecc71] font-semibold">Save 37% ($168 billed annually)</span>
                                </div>
                                <div className="border border-[#ddd] hover:border-[#aaa] p-5 rounded-[4px] flex flex-col gap-2 cursor-pointer transition-colors">
                                    <span className="text-[12px] font-bold text-[#666] uppercase tracking-wide">Monthly Plan</span>
                                    <span className="text-[22px] font-bold text-[#222]">$45<span className="text-sm font-normal text-[#666]">/mo</span></span>
                                    <span className="text-[12px] text-[#888]">Billed monthly, cancel anytime</span>
                                </div>
                            </div>

                            {card ? (
                                <div className="border border-[#eaeaea] bg-[#fafafa] p-4 rounded-[4px] flex items-center gap-3.5">
                                    <div className="w-10 h-7 border border-[#ddd] bg-white rounded-[2px] flex items-center justify-center font-bold text-[11px] text-[#444]">
                                        {card.brand}
                                    </div>
                                    <span className="text-[13px] text-[#555]">Will be charged to <span className="font-semibold text-[#222]">{card.brand} ending in {card.last4}</span></span>
                                </div>
                            ) : (
                                <div className="border border-[#ffccc7] bg-[#fff2f0] p-4 rounded-[4px] flex items-center gap-3 text-[#ff4d4f] text-[13px]">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                                    <span>Please add a credit card to your account to complete the upgrade.</span>
                                </div>
                            )}

                            <div className="mt-4 flex justify-end gap-3.5">
                                <button 
                                    className="text-[14px] text-[#666] font-medium hover:text-[#111] px-4 py-2 transition-colors"
                                    onClick={() => setShowUpgradeModal(false)}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => {
                                        if (!card) {
                                            setShowUpgradeModal(false);
                                            setShowCardModal(true);
                                        } else {
                                            showToast(`Upgraded ${selectedUpgradeProduct} successfully!`);
                                            setShowUpgradeModal(false);
                                        }
                                    }}
                                    className="bg-[#1a9b84] hover:bg-[#15826e] text-white text-[14px] font-medium px-6 py-2 transition-colors rounded-[2px]"
                                >
                                    {card ? 'Complete Upgrade' : 'Add Card & Upgrade'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdvancedTab({ user, showToast }) {
    // Advanced Settings State
    const [settings, setSettings] = useState({
        // Client Gallery
        cgDownloadCollection: true,
        cgDownloadPhoto: true,
        cgDownloadVideo: true,
        cgCreateFavoriteList: true,
        cgEmailRegistration: true,
        cgMarkPrivate: true,
        cgGalleryExpiring: true,
        cgPhotoReprocessError: true,

        // Store
        storeNewOrder: true,
        storeLabProcessed: true,
        storeLabShipped: true,

        // Studio Manager Payments
        smPaymentMade: true,
        smPaymentPastDue: true,
        smPaymentFailed: true,
        // Studio Manager Documents
        smContractSigned: true,
        smQuoteAccepted: true,
        smQuestionnaireCompleted: true,
        smDocExpired: true,
        // Studio Manager Sessions
        smSessionInquiry: true,
        smSessionConfirmed: true,
        smSessionUpcoming: true,

        // Others
        othersEmailBounced: true,
        othersReferralCredit: true,
        othersReferralSignup: true,
        othersReferralEnd: true,

        // Language
        language: 'English (US)'
    });

    // Expand/Collapse States
    const [openCategories, setOpenCategories] = useState({
        cg: true,
        store: true,
        sm: true,
        others: true
    });

    // Language Dropdown Open State
    const [langDropdownOpen, setLangDropdownOpen] = useState(false);
    const langRef = useRef(null);

    const [savingField, setSavingField] = useState('');
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        if (!user?.id) return;
        const stored = localStorage.getItem(`pixnxt_advanced_${user.id}`);
        if (stored) {
            try {
                setSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
            } catch (e) {
                console.error("Error parsing advanced settings:", e);
            }
        }
    }, [user]);

    // Handle clicks outside language dropdown to close it
    useEffect(() => {
        function handleClickOutside(event) {
            if (langRef.current && !langRef.current.contains(event.target)) {
                setLangDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const saveSettings = (updated) => {
        if (!user?.id) return;
        setSavingField('saving');
        localStorage.setItem(`pixnxt_advanced_${user.id}`, JSON.stringify(updated));
        setTimeout(() => {
            setSavingField('');
            setSaveStatus('All changes saved');
            showToast('Advanced settings saved successfully!');
            setTimeout(() => setSaveStatus(''), 2500);
        }, 500);
    };

    const handleToggle = (key) => {
        const updated = { ...settings, [key]: !settings[key] };
        setSettings(updated);
        saveSettings(updated);
    };

    const toggleCategory = (cat) => {
        setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const handleLanguageSelect = (lang) => {
        const updated = { ...settings, language: lang };
        setSettings(updated);
        saveSettings(updated);
        setLangDropdownOpen(false);
    };

    const renderToggleRow = (label, key) => (
        <div className="flex items-center justify-between py-3.5 border-b border-[#f9f9f9] text-[14px]">
            <span className="text-[#333] font-normal">{label}</span>
            <div className="flex items-center gap-3 select-none">
                <button
                    onClick={() => handleToggle(key)}
                    className={`w-[44px] h-[24px] rounded-full transition-colors relative focus:outline-none ${settings[key] ? 'bg-[#1a9b84]' : 'bg-[#e4e4e4]'}`}
                >
                    <span className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] bg-white rounded-full transition-transform shadow-[0_1px_3px_rgba(0,0,0,0.15)] ${settings[key] ? 'translate-x-[20px]' : 'translate-x-0'}`} />
                </button>
                <span className="text-[13px] text-[#888] w-7 font-normal">{settings[key] ? 'On' : 'Off'}</span>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-8 pb-20 text-[#111]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#eeeeee] pb-5">
                <div>
                    <h1 className="text-[26px] font-light text-[#222] mb-1">Advanced Settings</h1>
                </div>
            </div>

            {/* Notifications Sub-header */}
            <div>
                <span className="text-[11px] font-bold text-[#888] tracking-[0.15em] uppercase block mb-1">NOTIFICATIONS</span>
                <h2 className="text-[17px] font-semibold text-[#222] mb-6">Email Notifications</h2>
            </div>

            {/* Email Notifications Collapsible Container */}
            <div className="flex flex-col gap-5">
                {/* Category 1: Client Gallery */}
                <div className="bg-white border border-[#eeeeee] rounded-[2px] overflow-hidden">
                    <div 
                        className="flex items-center justify-between px-6 py-4.5 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
                        onClick={() => toggleCategory('cg')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#e8f7f2]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1a9b84" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                            </div>
                            <span className="font-semibold text-[15px] text-[#222]">Client Gallery</span>
                        </div>
                        <svg 
                            className={`transition-transform duration-200 text-[#888] ${openCategories.cg ? 'rotate-180' : 'rotate-0'}`} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {openCategories.cg && (
                        <div className="px-6 pb-6 pt-1 border-t border-[#f8f8f8] animate-[cgFadeIn_0.15s_ease]">
                            <div className="text-[12px] text-[#888] font-normal mb-3">Send me an email when:</div>
                            <div className="flex flex-col text-[#222]">
                                {renderToggleRow("Someone downloads a Collection", "cgDownloadCollection")}
                                {renderToggleRow("Someone downloads a single photo", "cgDownloadPhoto")}
                                {renderToggleRow("Someone downloads a single video", "cgDownloadVideo")}
                                {renderToggleRow("Someone creates a new Favorite list", "cgCreateFavoriteList")}
                                {renderToggleRow("Someone creates a new email registration", "cgEmailRegistration")}
                                {renderToggleRow("Someone marks a photo as private", "cgMarkPrivate")}
                                {renderToggleRow("A gallery is expiring", "cgGalleryExpiring")}
                                {renderToggleRow("A photo is unable to be reprocessed", "cgPhotoReprocessError")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Category 2: Store */}
                <div className="bg-white border border-[#eeeeee] rounded-[2px] overflow-hidden">
                    <div 
                        className="flex items-center justify-between px-6 py-4.5 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
                        onClick={() => toggleCategory('store')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#fff1f0]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff4d4f" strokeWidth="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                            </div>
                            <span className="font-semibold text-[15px] text-[#222]">Store</span>
                        </div>
                        <svg 
                            className={`transition-transform duration-200 text-[#888] ${openCategories.store ? 'rotate-180' : 'rotate-0'}`} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {openCategories.store && (
                        <div className="px-6 pb-6 pt-1 border-t border-[#f8f8f8] animate-[cgFadeIn_0.15s_ease]">
                            <div className="text-[12px] text-[#888] font-normal mb-3">Send me an email when:</div>
                            <div className="flex flex-col text-[#222]">
                                {renderToggleRow("Someone places a new Store order", "storeNewOrder")}
                                {renderToggleRow("A lab-fulfillment order has been processed", "storeLabProcessed")}
                                {renderToggleRow("A lab-fulfillment order has been shipped", "storeLabShipped")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Category 3: Studio Manager */}
                <div className="bg-white border border-[#eeeeee] rounded-[2px] overflow-hidden">
                    <div 
                        className="flex items-center justify-between px-6 py-4.5 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
                        onClick={() => toggleCategory('sm')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#e8f5e9]">
                                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
                            </div>
                            <span className="font-semibold text-[15px] text-[#222]">Studio Manager</span>
                        </div>
                        <svg 
                            className={`transition-transform duration-200 text-[#888] ${openCategories.sm ? 'rotate-180' : 'rotate-0'}`} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {openCategories.sm && (
                        <div className="px-6 pb-6 pt-1 border-t border-[#f8f8f8] animate-[cgFadeIn_0.15s_ease]">
                            <div className="text-[12px] text-[#888] font-normal mb-3">Send me an email when:</div>
                            <div className="flex flex-col text-[#222]">
                                {/* PAYMENTS */}
                                <div className="text-[10px] font-bold text-[#888] tracking-[0.15em] uppercase mt-4 mb-2">PAYMENTS</div>
                                {renderToggleRow("An invoice payment has been made", "smPaymentMade")}
                                {renderToggleRow("An invoice payment is past due", "smPaymentPastDue")}
                                {renderToggleRow("An invoice bank payment has failed", "smPaymentFailed")}

                                {/* DOCUMENTS */}
                                <div className="text-[10px] font-bold text-[#888] tracking-[0.15em] uppercase mt-6 mb-2">DOCUMENTS</div>
                                {renderToggleRow("A contract has been signed", "smContractSigned")}
                                {renderToggleRow("A quote has been accepted", "smQuoteAccepted")}
                                {renderToggleRow("A questionnaire has been completed", "smQuestionnaireCompleted")}
                                {renderToggleRow("A contract, quote, or questionnaire has expired", "smDocExpired")}

                                {/* SESSIONS */}
                                <div className="text-[10px] font-bold text-[#888] tracking-[0.15em] uppercase mt-6 mb-2">SESSIONS</div>
                                {renderToggleRow("A session inquiry has been received", "smSessionInquiry")}
                                {renderToggleRow("A session is confirmed, canceled, or rescheduled", "smSessionConfirmed")}
                                {renderToggleRow("A session is upcoming tomorrow", "smSessionUpcoming")}
                            </div>
                        </div>
                    )}
                </div>

                {/* Category 4: Others */}
                <div className="bg-white border border-[#eeeeee] rounded-[2px] overflow-hidden">
                    <div 
                        className="flex items-center justify-between px-6 py-4.5 cursor-pointer hover:bg-[#fafafa] transition-colors select-none"
                        onClick={() => toggleCategory('others')}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center shrink-0 bg-[#222] text-white font-bold text-[12px] select-none shadow-sm">P</div>
                            <span className="font-semibold text-[15px] text-[#222]">Others</span>
                        </div>
                        <svg 
                            className={`transition-transform duration-200 text-[#888] ${openCategories.others ? 'rotate-180' : 'rotate-0'}`} 
                            width="14" 
                            height="14" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2.5"
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </div>

                    {openCategories.others && (
                        <div className="px-6 pb-6 pt-1 border-t border-[#f8f8f8] animate-[cgFadeIn_0.15s_ease]">
                            <div className="text-[12px] text-[#888] font-normal mb-3">Send me an email when:</div>
                            <div className="flex flex-col text-[#222]">
                                {renderToggleRow("An email was unable to be delivered", "othersEmailBounced")}
                                {renderToggleRow("You receive credit as a referral reward", "othersReferralCredit")}
                                {renderToggleRow("Someone you referred has signed up", "othersReferralSignup")}
                                {renderToggleRow("You are reaching the end of a referral period and have not upgraded yet", "othersReferralEnd")}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Language Section at the bottom */}
            <div className="bg-white border border-[#eeeeee] rounded-[2px] p-8 mt-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                    <h2 className="text-[16px] font-semibold text-[#222]">Language</h2>
                    <span className="text-[9px] font-bold text-[#1890ff] bg-[#e6f7ff] border border-[#bae7ff] px-1.5 py-0.5 rounded-[2px] select-none tracking-wide">BETA</span>
                </div>

                {/* Custom Language Select Dropdown */}
                <div className="relative w-full max-w-[480px]" ref={langRef}>
                    <div 
                        className="flex items-center justify-between border border-[#ddd] bg-white px-4 py-2.5 text-[15px] text-[#111] cursor-pointer hover:border-[#aaa] transition-colors rounded-[2px]"
                        onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                    >
                        <span>{settings.language}</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2.5" className="mt-0.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    {langDropdownOpen && (
                        <div className="absolute top-[105%] left-0 w-full bg-white border border-[#ccc] rounded-[2px] shadow-lg z-[600] py-1 text-[15px]">
                            <div 
                                className={`px-4 py-2 cursor-pointer transition-colors ${settings.language === 'English (US)' ? 'bg-[#1890ff] text-white' : 'hover:bg-[#f5f5f5] text-[#222]'}`}
                                onClick={() => handleLanguageSelect('English (US)')}
                            >
                                English (US)
                            </div>
                            <div 
                                className={`px-4 py-2 cursor-pointer transition-colors ${settings.language === 'Español (Latinoamérica)' ? 'bg-[#1890ff] text-white' : 'hover:bg-[#f5f5f5] text-[#222]'}`}
                                onClick={() => handleLanguageSelect('Español (Latinoamérica)')}
                            >
                                Español (Latinoamérica)
                            </div>
                            <div 
                                className={`px-4 py-2 cursor-pointer transition-colors ${settings.language === 'Português (Brasil)' ? 'bg-[#1890ff] text-white' : 'hover:bg-[#f5f5f5] text-[#222]'}`}
                                onClick={() => handleLanguageSelect('Português (Brasil)')}
                            >
                                Português (Brasil)
                            </div>
                        </div>
                    )}
                </div>

                <p className="text-[12px] text-[#888] leading-relaxed mt-1">
                    Choose your preferred language for the Pixieset dashboard. During the beta phase, this setting applies only to Client Gallery.
                </p>
            </div>
        </div>
    );
}
