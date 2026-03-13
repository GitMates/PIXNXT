import React, { useState } from 'react';
import SidebarLayout from '../components/SidebarLayout';
import './Homepage.css';

const Homepage = () => {
    const [statusOn, setStatusOn] = useState(true);
    const [password, setPassword] = useState('');
    const [bio, setBio] = useState('');

    return (
        <SidebarLayout>
            <main className="hp-main">
                <header className="hp-header">
                    <h1 className="hp-title">Homepage</h1>
                    <button className="hp-view-btn">View Site</button>
                </header>

                <div className="hp-content">
                    <div className="hp-left-col">

                        <div className="hp-form-group">
                            <label className="hp-label">Homepage Status</label>
                            <div className="hp-toggle-row">
                                <button
                                    className={`hp-toggle ${statusOn ? 'on' : 'off'}`}
                                    onClick={() => setStatusOn(!statusOn)}
                                >
                                    <div className="hp-toggle-handle"></div>
                                </button>
                                <span className="hp-toggle-label">{statusOn ? 'On' : 'Off'}</span>
                            </div>
                            <p className="hp-help-text">
                                Your Homepage is a public page where your collections are listed. You can also select which collections will be shown here under each collection's setting. <a href="#">Learn more</a>
                            </p>
                        </div>

                        <div className="hp-form-group">
                            <label className="hp-label">Homepage URL</label>
                            <div className="hp-input-wrap">
                                <div className="hp-input-read">https://dfvb.pixieset.com</div>
                                <button className="hp-input-action-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                    Copy
                                </button>
                            </div>
                        </div>

                        <div className="hp-form-group">
                            <label className="hp-label">Homepage Password</label>
                            <div className="hp-input-wrap">
                                <input
                                    type="text"
                                    className="hp-input"
                                    placeholder="Add a password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button className="hp-input-action-btn">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                                    Generate
                                </button>
                            </div>
                            <p className="hp-help-text">Protect your Homepage with a password</p>
                        </div>

                        <div className="hp-form-group">
                            <label className="hp-label">Biography</label>
                            <div className="hp-textarea-wrap">
                                <textarea
                                    className="hp-textarea"
                                    maxLength="500"
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                ></textarea>
                                <div className="hp-char-count">{bio.length} / 500</div>
                            </div>
                        </div>

                        <div className="hp-form-group">
                            <label className="hp-label">Homepage Info</label>
                            <div className="hp-checkbox-list">
                                <label className="hp-checkbox-item">
                                    <input type="checkbox" defaultChecked />
                                    <span className="chk-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </span>
                                    Biography
                                </label>
                                <label className="hp-checkbox-item">
                                    <input type="checkbox" defaultChecked />
                                    <span className="chk-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </span>
                                    Social Links
                                </label>
                                <label className="hp-checkbox-item">
                                    <input type="checkbox" />
                                    <span className="chk-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </span>
                                    Website
                                </label>
                                <label className="hp-checkbox-item">
                                    <input type="checkbox" defaultChecked />
                                    <span className="chk-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </span>
                                    Contact Email
                                </label>
                                <label className="hp-checkbox-item">
                                    <input type="checkbox" defaultChecked />
                                    <span className="chk-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </span>
                                    Phone Number
                                </label>
                                <label className="hp-checkbox-item">
                                    <input type="checkbox" defaultChecked />
                                    <span className="chk-box">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </span>
                                    Business Address
                                </label>
                            </div>
                            <p className="hp-help-text mt-2">
                                To update any of the above details, please go to your <a href="#">profile</a>. Any information left blank will not appear on your homepage
                            </p>
                        </div>

                        <div className="hp-form-group">
                            <label className="hp-label">Collection Sort Order</label>
                            <div className="set-select-wrap">
                                <select className="set-select">
                                    <option>Date created: New to Old</option>
                                    <option>Date created: Old to New</option>
                                </select>
                            </div>
                            <p className="hp-help-text mt-2">Select the order you wish your collections to appear</p>
                        </div>

                    </div>

                    <div className="hp-right-col">
                        <div className="hp-mockup-bg">
                            <div className="hp-mockup-card">
                                <div className="hp-mockup-header">
                                    <div className="hp-mockup-social">
                                        <div className="social-dot"></div>
                                        <div className="social-dot"></div>
                                        <div className="social-dot"></div>
                                        <div className="social-dot"></div>
                                    </div>
                                </div>

                                <h3 className="hp-mockup-title">DFVB</h3>

                                <div className="hp-mockup-contact">
                                    <div className="hp-mockup-line">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                        <span>email@pixieset.com</span>
                                    </div>
                                    <div className="hp-mockup-line">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                                        <span>101 Main Street</span>
                                    </div>
                                    <div className="hp-mockup-line">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                        <span>123-456-7890</span>
                                    </div>
                                </div>

                                <div className="hp-mockup-grid">
                                    {[1, 2, 3, 4, 5, 6].map(i => (
                                        <div key={i} className="hp-mockup-item">
                                            <div className="hp-mockup-img"></div>
                                            <div className="hp-mockup-text-1"></div>
                                            <div className="hp-mockup-text-2"></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </SidebarLayout>
    );
};

export default Homepage;
