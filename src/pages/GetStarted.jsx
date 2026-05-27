import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import './GetStarted.css';

const GetStarted = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);

    // Step 0: Intro Component
    const renderIntro = () => (
        <div className="gs-intro">
            <div className="gs-intro-header">
                <span className="gs-label">Get Started</span>
                <h1 className="gs-title">Create beautiful photo collections in 3 steps</h1>
                <button className="gs-btn" onClick={() => setStep(1)}>
                    Get Started with Sample Photos
                </button>
            </div>

            <div className="gs-mockup-area">
                {/* Reusing the browser mockup from the original hero */}
                <div className="cg-hero-graphic-inner" style={{ transform: 'scale(0.8)', margin: '0 auto', maxWidth: '800px' }}>
                    <div className="browser-mockup mw-back">
                        <div className="mw-topbar"><div className="mw-dots"><span></span><span></span><span></span></div></div>
                        <div className="mw-body"></div>
                    </div>
                    <div className="browser-mockup mw-middle">
                        <div className="mw-topbar"><div className="mw-dots"><span></span><span></span><span></span></div></div>
                        <div className="mw-body"></div>
                    </div>
                    <div className="browser-mockup mw-front">
                        <div className="mw-topbar"><div className="mw-dots"><span></span><span></span><span></span></div></div>
                        <div className="mw-body">
                            <img
                                src="https://galleries.pixieset.com/build/assets/intro-oNB4gbtG.jpg"
                                className="browser-hero-image"
                                alt="Autumn Florals"
                            />
                            <div className="browser-gallery-header">
                                <div className="bg-title-wrap">
                                    <div className="bg-title-main">AUTUMN FLORALS</div>
                                    <div className="bg-title-sub">AVERY WOODWARD PHOTOGRAPHY</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    // Step 1: Name and Date
    const renderStep1 = () => (
        <div className="gs-step">
            <span className="gs-step-label">Step 1 of 3</span>
            <h1 className="gs-title gs-left">Pick a name and date</h1>

            <div className="gs-card">
                <div className="gs-form-group">
                    <label>Collection Name</label>
                    <input type="text" placeholder="e.g. Jessie & Ryan" />
                </div>

                <div className="gs-form-group">
                    <label>Event Date</label>
                    <div className="gs-date-input">
                        <input type="text" placeholder="Select a date (optional)" />
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </div>
                </div>
            </div>

            <button className="gs-btn gs-left" onClick={() => setStep(2)}>Next</button>
        </div>
    );

    // Step 2: Upload Simulation
    const renderStep2 = () => (
        <div className="gs-step">
            <span className="gs-step-label">Step 2 of 3</span>
            <h1 className="gs-title gs-left">Add your photos</h1>

            <div className="gs-card gs-upload-card">
                {['Myphoto-1.jpg', 'Myphoto-2.jpg', 'Myphoto-3.jpg'].map((filename, index) => (
                    <div className="gs-upload-item" key={index}>
                        <div className="gs-upload-info">
                            <span className="gs-filename">{filename}</span>
                        </div>
                        <div className="gs-progress-wrapper">
                            <div className="gs-progress-track">
                                <div className="gs-progress-fill" style={{ animationDelay: `${index * 0.5}s` }}></div>
                            </div>
                            <div className="gs-check-icon" style={{ animationDelay: `${2 + (index * 0.5)}s` }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8BDFDD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button className="gs-btn gs-left" onClick={() => navigate('/collections/manage')}>Next</button>
        </div>
    );

    return (
        <SidebarLayout>
            <main className="gs-main">
                {step === 0 && renderIntro()}
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
            </main>
        </SidebarLayout>
    );
};

export default GetStarted;
