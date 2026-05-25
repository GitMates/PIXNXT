import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import './Settings.css';

const Settings = () => {
    const { tab } = useParams();
    const navigate = useNavigate();
    const activeTab = tab || 'branding';

    return (
        <SidebarLayout>
            <main className="set-main">
                <header className="set-header">
                    <h1 className="set-title">Settings</h1>
                    <div className="st-tabs">
                        <button className={`st-tab ${activeTab === 'branding' ? 'active' : ''}`} onClick={() => navigate('/settings/branding')}>Branding</button>
                        <button className={`st-tab ${activeTab === 'watermark' ? 'active' : ''}`} onClick={() => navigate('/settings/watermark')}>Watermark</button>
                        <button className={`st-tab ${activeTab === 'presets' ? 'active' : ''}`} onClick={() => navigate('/settings/presets')}>Presets</button>
                        <button className={`st-tab ${activeTab === 'email-templates' ? 'active' : ''}`} onClick={() => navigate('/settings/email-templates')}>Email Templates</button>
                        <button className={`st-tab ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => navigate('/settings/preferences')}>Preferences</button>
                        <button className={`st-tab ${activeTab === 'integrations' ? 'active' : ''}`} onClick={() => navigate('/settings/integrations')}>Integrations</button>
                    </div>
                </header>

                <div className="set-content">
                    {activeTab === 'branding' && <BrandingTab />}
                    {activeTab === 'watermark' && <WatermarkTab />}
                    {activeTab === 'presets' && <PresetsTab />}
                    {activeTab === 'email-templates' && <EmailTemplatesTab />}
                    {activeTab === 'preferences' && <PreferencesTab />}
                    {activeTab === 'integrations' && <IntegrationsTab />}
                </div>
            </main>
        </SidebarLayout>
    );
};

const BrandingTab = () => {
    const [pToggle, setPToggle] = useState(true);
    return (
        <div className="set-tab-content">
            <div className="set-section">
                <h3 className="set-section-title">Domain</h3>
                <div className="set-input-wrap">
                    <input className="set-input" type="text" readOnly value="dfvb.pixieset.com" />
                </div>
                <p className="set-help-text">Your client galleries and mobile gallery apps are always available with your default site address. To change your default domain, edit your username under <span className="text-teal">Account</span>.</p>
            </div>

            <div className="set-section border-sub">
                <div className="set-section-header">
                    <h3 className="set-section-title">Custom Domain</h3>
                    <span className="set-rocket-pill">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l.5-.5a5.4 5.4 0 0 0 1-1.5L20.5 6a2.83 2.83 0 0 0-4-4L5 13.5a5.4 5.4 0 0 0-1.5 1Z"></path><path d="m15 5 4 4"></path><path d="m9 15 3 3"></path></svg>
                        UPGRADE
                    </span>
                </div>
                <div className="set-input-wrap disabled">
                    <input className="set-input disabled" type="text" placeholder="www.yourdomain.com" disabled />
                </div>
                <p className="set-help-text">Use your own custom domain for your client galleries. This feature is available with an upgraded account. <span className="text-teal">Learn more</span></p>
            </div>

            <div className="set-upgrade-box no-bg-mobile">
                <div className="set-box-header">
                    <h3 className="set-upgrade-title">Upgrade for more brand control</h3>
                    <span className="set-rocket-pill">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l.5-.5a5.4 5.4 0 0 0 1-1.5L20.5 6a2.83 2.83 0 0 0-4-4L5 13.5a5.4 5.4 0 0 0-1.5 1Z"></path><path d="m15 5 4 4"></path><path d="m9 15 3 3"></path></svg>
                        UPGRADE
                    </span>
                </div>
                <p className="set-help-text mb-4">Upgrade to a paid plan to add your full logo, custom favicon and more.</p>

                <div className="set-branding-item">
                    <h4 className="set-mini-label">Logos</h4>
                    <div className="set-upload-square">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <p className="set-help-text-sm">Your logo will be used in place of the text logo and profile icon, including on the white background of your homepage. For the cover logo, use a light/white logo with a transparent background for best display. <span className="text-teal">Learn more</span></p>
                </div>

                <div className="set-branding-item mt-4">
                    <h4 className="set-mini-label">Favicon</h4>
                    <div className="set-upload-square">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </div>
                    <p className="set-help-text-sm">You can upload a GIF, PNG or ICO file up to 32x32 pixels. <span className="text-teal">Learn more</span></p>
                </div>

                <div className="set-branding-item mt-4">
                    <h4 className="set-mini-label">Pixieset Branding</h4>
                    <div className="set-toggle-row">
                        <button className={`set-toggle ${pToggle ? 'on' : 'off'}`} onClick={() => setPToggle(!pToggle)}>
                            <div className="set-toggle-handle"></div>
                        </button>
                        <span className="set-toggle-label">{pToggle ? 'On' : 'Off'}</span>
                    </div>
                    <p className="set-help-text-sm mt-2">Switching this off will hide Pixieset branding from your collections and homepage.</p>
                </div>
            </div>
        </div>
    );
};

const WatermarkTab = () => {
    const [wToggle, setWToggle] = useState(false);
    return (
        <div className="set-tab-content">
            <div className="set-section">
                <h3 className="set-section-title">Watermark</h3>
                <div className="set-upload-square large">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                </div>
                <p className="set-help-text">Protect your photos with custom watermarks. Watermarks will not appear on prints ordered through Store. <span className="text-teal">Learn more</span></p>
            </div>

            <div className="set-section">
                <h3 className="set-section-title">Apply watermark to web size downloads</h3>
                <div className="set-toggle-row">
                    <button className={`hp-toggle ${wToggle ? 'on' : 'off'}`} onClick={() => setWToggle(!wToggle)}>
                        <div className="hp-toggle-handle"></div>
                    </button>
                    <span className="hp-toggle-label">{wToggle ? 'On' : 'Off'}</span>
                </div>
                <p className="set-help-text">Enable to apply watermark to web size downloads from your collections and web size downloads sold through Store.</p>
            </div>
        </div>
    );
};

const PresetsTab = () => (
    <div className="set-tab-content">
        <div className="set-section">
            <h3 className="set-section-title">Collection Presets</h3>
            <div className="set-action-text mt-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8BDFDD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                Add Preset
            </div>
            <p className="set-help-text mt-4">Collection presets allow you to apply default settings when creating a new collection so you don't have to make changes every time. <span className="text-teal">Learn more</span></p>
        </div>
    </div>
);

const EmailTemplatesTab = () => (
    <div className="set-tab-content">
        <div className="set-section border-sub">
            <h3 className="set-section-title">Collection Sharing Email</h3>

            <div className="set-list-container mt-2">
                <div className="set-list-item">
                    <span>Wedding Sample Email</span>
                    <span className="set-dots-icon">...</span>
                </div>
                <div className="set-list-item">
                    <span>Newborn Sample Email</span>
                    <span className="set-dots-icon">...</span>
                </div>
            </div>

            <div className="set-action-text mt-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8BDFDD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                Add Email Template
            </div>
            <p className="set-help-text mt-2">Create a custom email template and save time when sharing collections with your clients. <span className="text-teal">Learn more</span></p>
        </div>

        <div className="set-section">
            <h3 className="set-section-title">Auto-expiry Email</h3>

            <div className="set-list-container mt-2">
                <div className="set-list-item">
                    <span>Standard Expiry Email</span>
                    <span className="set-dots-icon">...</span>
                </div>
            </div>

            <div className="set-action-text mt-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8BDFDD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                Add Email Template
            </div>
            <p className="set-help-text mt-2">Email your clients automatically a few days before their collections are set to expire. <span className="text-teal">Learn more</span></p>
        </div>
    </div>
);

const PreferencesTab = () => {
    const [rawToggle, setRawToggle] = useState(false);
    const [cookieToggle, setCookieToggle] = useState(false);

    return (
        <div className="set-tab-content">
            <div className="set-section">
                <h3 className="set-section-title">Default Collection Language</h3>
                <div className="set-select-wrap">
                    <select className="set-select">
                        <option>English</option>
                    </select>
                </div>
                <p className="set-help-text">Select the default language for newly created collections. You can still change it later in each collection's settings.</p>
            </div>

            <div className="set-section">
                <h3 className="set-section-title">Filename Display</h3>
                <div className="set-select-wrap">
                    <select className="set-select">
                        <option>Show</option>
                    </select>
                </div>
                <p className="set-help-text">You can choose to show / hide your filenames on photos in your collections.</p>
            </div>

            <div className="set-section">
                <h3 className="set-section-title">Search Engine Visibility</h3>
                <div className="set-select-wrap">
                    <select className="set-select">
                        <option>Homepage Only</option>
                    </select>
                </div>
                <p className="set-help-text">Choose whether you want your collections to be searchable on search engines (e.g. Google). <span className="text-teal">Learn more</span></p>
            </div>

            <div className="set-section">
                <h3 className="set-section-title">Sharpening Level</h3>
                <div className="set-select-wrap">
                    <select className="set-select">
                        <option>Optimal</option>
                    </select>
                </div>
                <p className="set-help-text">This setting only applies to web display copies of your photos. Your originals are not altered. <span className="text-teal">Learn more</span></p>
            </div>

            <div className="set-section mt-4">
                <div className="set-section-header">
                    <h3 className="set-section-title">RAW Photo Support</h3>
                    <span className="set-rocket-pill">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l.5-.5a5.4 5.4 0 0 0 1-1.5L20.5 6a2.83 2.83 0 0 0-4-4L5 13.5a5.4 5.4 0 0 0-1.5 1Z"></path><path d="m15 5 4 4"></path><path d="m9 15 3 3"></path></svg>
                        UPGRADE
                    </span>
                </div>
                <div className="set-toggle-row">
                    <button className={`set-toggle ${rawToggle ? 'on' : 'off'}`} onClick={() => setRawToggle(!rawToggle)}>
                        <div className="set-toggle-handle"></div>
                    </button>
                    <span className="set-toggle-label">{rawToggle ? 'On' : 'Off'}</span>
                </div>
                <p className="set-help-text"><strong>Pro Feature:</strong> Enable RAW photos to be included in your galleries alongside other file formats.</p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Terms of Service</h3>
                <div className="set-rte-box">
                    <div className="set-rte-toolbar">
                        <button className="rte-btn">B</button>
                        <button className="rte-btn italic">I</button>
                        <button className="rte-btn underline">U</button>
                        <div className="rte-divider"></div>
                        <button className="rte-btn link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        </button>
                        <button className="rte-btn unlink disabled">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                        </button>
                    </div>
                    <div className="set-rte-content"></div>
                </div>
                <p className="set-help-text">Set the Terms of service that your customers are subject to. This will be shown in the footer of your collections.</p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Privacy Policy</h3>
                <div className="set-rte-box">
                    <div className="set-rte-toolbar">
                        <button className="rte-btn">B</button>
                        <button className="rte-btn italic">I</button>
                        <button className="rte-btn underline">U</button>
                        <div className="rte-divider"></div>
                        <button className="rte-btn link">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                        </button>
                        <button className="rte-btn unlink disabled">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                        </button>
                    </div>
                    <div className="set-rte-content"></div>
                </div>
                <p className="set-help-text">Set the Privacy Policy that your customers are subject to. This will be shown in the footer of your collections.</p>
            </div>

            <div className="set-section mt-4">
                <h3 className="set-section-title">Enable Cookie Banner</h3>
                <div className="set-toggle-row">
                    <button className={`set-toggle ${cookieToggle ? 'on' : 'off'}`} onClick={() => setCookieToggle(!cookieToggle)}>
                        <div className="set-toggle-handle"></div>
                    </button>
                    <span className="set-toggle-label">{cookieToggle ? 'On' : 'Off'}</span>
                </div>
                <p className="set-help-text">Enable banner to notify visitors that your site uses cookies. This will only appear for EU visitors.</p>
            </div>
        </div>
    );
};

const IntegrationsTab = () => (
    <div className="set-tab-content">
        <div className="set-integration-card">
            <div className="set-integration-logo lrc-logo">
                <div className="lrc-box">LrC</div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ddd" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                <div className="p-box">P</div>
            </div>
            <div className="set-integration-info">
                <h3>Lightroom Plugin</h3>
                <p>Download the official Pixieset Lightroom Plugin that allows you to upload directly from Lightroom Classic to Pixieset, re-publish new edits easily and sync collections structure for easy organizing. <span className="text-teal">Learn more</span></p>
                <p>You will need to <span className="text-teal">set a password</span> to use the plugin.</p>
                <div className="set-action-text teal-link">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Download Plugin
                </div>
            </div>
        </div>

        <div className="set-integration-card">
            <div className="set-integration-logo ga-logo-wrap">
                <div className="ga-logo-icon">
                    <div className="ga-bar b1"></div>
                    <div className="ga-bar b2"></div>
                    <div className="ga-bar b3"></div>
                </div>
                <div className="ga-text">Google Analytics</div>
            </div>
            <div className="set-integration-info">
                <h3>Google Analytics</h3>
                <p>Enable Google Analytics on your collections by entering your Google Analytics Tracking ID.</p>
                <div className="set-action-text teal-link mt-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
                    Connect Google Analytics
                </div>
            </div>
        </div>
    </div>
);

export default Settings;
