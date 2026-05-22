import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { galleryService } from '../services/gallery.service';
import { useAuth } from '../hooks/useAuth';
import { storageService } from '../services/storage.service';

export default function AccountSettings() {
    const { tab } = useParams();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const activeTab = tab || 'profile';
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef(null);

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
        <div className="w-full min-h-screen bg-white text-[#111] font-['Roboto',sans-serif]">
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
                        
                        {/* Dropdown Menu (Reused from Sidebar) */}
                        {showDropdown && (
                            <div className="absolute top-[100%] left-0 mt-4 w-[280px] bg-[#ffffff] rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.15)] z-[500] py-1 animate-[cgFadeIn_0.15s_ease]">
                                {/* Profile Header */}
                                <div className="px-5 py-4 border-b border-[#eeeeee] flex items-center gap-3">
                                    <div className="w-[48px] h-[48px] rounded-full flex items-center justify-center text-[20px] font-medium bg-[#e8f7f2] text-[#1a9b84]">
                                        {userInitial}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="text-[15px] font-medium text-[#222] truncate w-[180px]">{businessName}</div>
                                        <div className="text-[13px] text-[#888] truncate w-[180px]">{user?.email || 'user@example.com'}</div>
                                    </div>
                                </div>
                                
                                {/* Invite Friends */}
                                <div className="px-5 py-3.5 text-[15px] text-[#333] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 font-medium border-b border-[#eeeeee]">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg>
                                    Invite Friends & Get $20
                                </div>

                                {/* Profile */}
                                <div 
                                    className="px-5 py-3 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mt-1"
                                    onClick={() => { navigate('/account/profile'); setShowDropdown(false); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                    Profile
                                </div>

                                {/* Billing */}
                                <div 
                                    className="px-5 py-3 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
                                    onClick={() => { navigate('/account/billing'); setShowDropdown(false); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                                    Billing
                                </div>

                                {/* Advanced Settings */}
                                <div 
                                    className="px-5 py-3 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 pb-4 border-b border-[#eeeeee]"
                                    onClick={() => { navigate('/account/advanced'); setShowDropdown(false); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>
                                    Advanced Settings
                                </div>

                                {/* Account */}
                                <div 
                                    className="px-5 py-3 mt-1 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5"
                                    onClick={() => { navigate('/account/account'); setShowDropdown(false); }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                                    Account
                                </div>

                                {/* Log Out */}
                                <div 
                                    className="px-5 py-3 text-[14px] text-[#444] cursor-pointer hover:bg-[#f9f9f9] flex items-center gap-3.5 mb-1"
                                    onClick={async () => {
                                        try {
                                            await logout();
                                            navigate('/login');
                                        } catch (err) {
                                            console.error('Logout failed', err);
                                        }
                                    }}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                                    Log Out
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
                    {activeTab === 'profile' && <ProfileTab user={user} />}
                    {activeTab === 'account' && <AccountTab user={user} />}
                    {activeTab === 'billing' && <div className="text-[#888]">Billing Settings Coming Soon</div>}
                    {activeTab === 'advanced' && <div className="text-[#888]">Advanced Settings Coming Soon</div>}
                    {activeTab === 'refer' && <div className="text-[#888]">Refer a Friend Coming Soon</div>}
                </div>
            </div>
        </div>
    );
}

function ProfileTab({ user }) {
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
            {saving && (
                <div className="fixed bottom-6 right-6 bg-[#1a9b84] text-white px-4 py-2 rounded-md shadow-lg text-[13px] font-medium transition-opacity animate-[cgFadeIn_0.2s_ease]">
                    Saving...
                </div>
            )}
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

function AccountTab({ user }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showUsernameModal, setShowUsernameModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [modalUsername, setModalUsername] = useState('');

    const fallbackSlug = user?.email ? user.email.split('@')[0] : 'poojz';

    const [formData, setFormData] = useState({
        homepage_slug: fallbackSlug,
        email: user?.email || 'poojaelango03@gmail.com',
        two_factor_enabled: false,
        google_connected: true
    });

    useEffect(() => {
        if (!user?.id) return;
        
        galleryService.getPhotographerProfile(user.id)
            .then(data => {
                if (data) {
                    setFormData(prev => ({
                        ...prev,
                        homepage_slug: data.homepage_slug || data.username || fallbackSlug,
                        email: data.contact_email || user?.email || 'poojaelango03@gmail.com',
                        two_factor_enabled: data.two_factor_enabled || false,
                        google_connected: data.google_connected !== undefined ? data.google_connected : true
                    }));
                }
            })
            .catch(err => console.error("Error fetching account details:", err))
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
            // Check if field is a valid db column, we mock the ones that aren't
            if (['two_factor_enabled', 'google_connected'].includes(fieldName)) {
                // Mock saving for UI demo
                await new Promise(r => setTimeout(r, 500));
            } else {
                await galleryService.updatePhotographerProfile(user.id, { [fieldName]: value });
            }
        } catch (err) {
            console.error("Failed to auto-save account field:", fieldName, err);
        }
        setSaving(false);
    };

    const toggle2FA = async () => {
        const newValue = !formData.two_factor_enabled;
        setFormData(prev => ({ ...prev, two_factor_enabled: newValue }));
        await handleAutoSave('two_factor_enabled', newValue);
    };

    if (loading) {
        return <div className="py-8 text-[#888]">Loading account...</div>;
    }

    return (
        <div className="flex flex-col gap-12 pb-20 relative">
            {saving && (
                <div className="fixed bottom-6 right-6 bg-[#1a9b84] text-white px-4 py-2 rounded-md shadow-lg text-[13px] font-medium transition-opacity animate-[cgFadeIn_0.2s_ease] z-50">
                    Saving...
                </div>
            )}
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
                        <p className="text-[13px] text-[#888] mt-2">Your Homepage will be at http://{formData.homepage_slug?.toLowerCase()}.localhost:5173/</p>
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
                            <span className="text-[15px] text-[#999] px-2">No Password set</span>
                            <button className="bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#333] text-[14px] font-medium px-4 py-2 transition-colors rounded-[2px]">
                                Set a Password
                            </button>
                        </div>
                        <p className="text-[13px] text-[#888] mt-2">Your password is not set, once you create it you'll be able to log in using it as well.</p>
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
                                    <span className="text-[14px] text-[#999]">Not connected</span>
                                </div>
                                <button className="bg-[#f5f5f5] hover:bg-[#ebebeb] text-[#333] text-[14px] font-medium px-4 py-2 transition-colors rounded-[2px] min-w-[120px]">
                                    Connect
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
                                
                                <div className="flex items-center border-b border-[#f1f1f1] py-4 text-[14px]">
                                    <div className="w-[40%] text-[#333]">Windows 10, Chrome 148</div>
                                    <div className="w-[30%] text-[#1a9b84]">Current session</div>
                                    <div className="w-[30%] text-[#666]">2409:408d:3c0a:e5c:a02c:1ea4:258f:68e</div>
                                </div>
                                
                                <div className="flex items-center border-b border-[#f1f1f1] py-4 text-[14px] group">
                                    <div className="w-[40%] text-[#333]">Windows 10, Chrome 148</div>
                                    <div className="w-[30%] text-[#666]">19 hours ago</div>
                                    <div className="w-[30%] text-[#666] flex justify-between items-center">
                                        2409:408d:3c0a:e5c:1cc1:6a47:40b5:dee2
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:stroke-[#ff4d4f] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </div>
                                </div>

                                <div className="flex items-center border-b border-[#f1f1f1] py-4 text-[14px] group">
                                    <div className="w-[40%] text-[#333]">Windows 10, Chrome 148</div>
                                    <div className="w-[30%] text-[#666]">19 hours ago</div>
                                    <div className="w-[30%] text-[#666] flex justify-between items-center">
                                        2409:408d:3c0a:e5c:1cc1:6a47:40b5:dee2
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="cursor-pointer hover:stroke-[#ff4d4f] opacity-0 group-hover:opacity-100 transition-opacity">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Manage Account */}
                <div className="mt-14">
                    <h2 className="text-[11px] font-bold text-[#999] tracking-[0.1em] uppercase mb-6">MANAGE ACCOUNT</h2>
                    <p className="text-[14px] text-[#888] leading-relaxed">
                        Please understand that by deleting your account, all photos, collections, mobile apps and other account data will be permanently deleted. Yes, <span className="text-[#1a9b84] cursor-pointer hover:underline">delete</span> my account.
                    </p>
                </div>
            </div>

            {/* Edit Username Modal */}
            {showUsernameModal && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] animate-[cgFadeIn_0.2s_ease]">
                    <div className="bg-white w-[500px] shadow-lg flex flex-col font-['Roboto',sans-serif]">
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
                    <div className="bg-white w-[500px] shadow-lg flex flex-col font-['Roboto',sans-serif]">
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
