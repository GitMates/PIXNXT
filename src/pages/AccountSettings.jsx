import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { galleryService } from '../services/gallery.service';
import { useAuth } from '../hooks/useAuth';

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
            <div className="w-full h-[80px] border-b border-[#eeeeee] bg-[#f5f5f5] flex items-center justify-between px-10">
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
            <div className="w-full border-b border-[#eeeeee] bg-[#fafafa]">
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
                    {activeTab === 'account' && <div className="text-[#888]">Account Settings Coming Soon</div>}
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

    if (loading) {
        return <div className="py-8 text-[#888]">Loading profile...</div>;
    }

    return (
        <div className="flex flex-col gap-12 pb-20 relative">
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
                        <div className="w-[100px] h-[100px] bg-[#f5f5f5] mb-3 flex items-center justify-center text-[#999] cursor-pointer hover:bg-[#eeeeee] transition-colors relative group">
                            {formData.profile_icon_url ? (
                                <img src={formData.profile_icon_url} alt="Profile Icon" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-[28px] h-[28px] border border-[#ccc] flex items-center justify-center bg-white text-[#888]">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
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
                <h2 className="text-[12px] font-bold text-[#999] tracking-[0.1em] uppercase mb-4">SOCIAL</h2>
                
                <div className="flex flex-col gap-6 w-full">
                    {[
                        { label: 'f Facebook', name: 'social_facebook' },
                        { label: '𝕏 X (formerly Twitter)', name: 'social_x_twitter' },
                        { label: '📷 Instagram', name: 'social_instagram' },
                        { label: '🎵 TikTok', name: 'social_tiktok' },
                        { label: 'P Pinterest', name: 'social_pinterest' },
                        { label: '▶ YouTube', name: 'social_youtube' },
                        { label: 'v Vimeo', name: 'social_vimeo' },
                        { label: 'in LinkedIn', name: 'social_linkedin' }
                    ].map(social => (
                        <div key={social.name}>
                            <label className="block text-[15px] font-bold text-[#111] mb-2">{social.label}</label>
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
