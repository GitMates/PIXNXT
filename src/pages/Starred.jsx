import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import './PhotoLibrary.css'; // Reusing for empty state styling
import './Starred.css';

const Starred = () => {
    const { tab } = useParams();
    const navigate = useNavigate();
    const activeTab = tab || 'collections';

    return (
        <SidebarLayout>
            <main className="pl-main">
                <header className="st-header">
                    <h1 className="st-title">Starred</h1>

                    <div className="st-tabs">
                        <button
                            className={`st-tab ${activeTab === 'collections' ? 'active' : ''}`}
                            onClick={() => navigate('/starred/collections')}
                        >
                            Collections
                        </button>
                        <button
                            className={`st-tab ${activeTab === 'photos' ? 'active' : ''}`}
                            onClick={() => navigate('/starred/photos')}
                        >
                            Photos
                        </button>
                    </div>
                </header>

                <div className="st-empty-state">
                    <div className="st-empty-graphic">
                        <svg width="220" height="180" viewBox="0 0 220 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                            {/* Simple line-art character mockup */}
                            <path d="M100 130C100 110 115 95 130 95C145 95 160 110 160 130V150H100V130Z" stroke="#333" strokeWidth="1.5" fill="#fff" />
                            <circle cx="130" cy="75" r="20" stroke="#333" strokeWidth="1.5" fill="#fff" />
                            <path d="M125 55C125 55 120 45 130 40C140 45 135 55 135 55" stroke="#333" strokeWidth="1.5" />
                            <path d="M110 75L95 65L100 50" stroke="#333" strokeWidth="1.5" fill="none" /> {/* Arm scratching head */}
                            <path d="M160 90C175 80 185 95 180 110" stroke="#333" strokeWidth="1.5" fill="none" /> {/* Secondary element */}
                            <path d="M40 100L45 110L55 110L48 118L51 128L40 122L29 128L32 118L25 110L35 110L40 100Z" fill="#F0F4F3" stroke="#999" strokeWidth="1" />
                        </svg>
                    </div>
                    {activeTab === 'collections' ? (
                        <>
                            <h2 className="pl-empty-title">You have no starred collections yet</h2>
                            <p className="pl-empty-text">
                                Track your favorite collections with stars.
                            </p>
                        </>
                    ) : (
                        <>
                            <h2 className="pl-empty-title">You have no starred photos yet</h2>
                            <p className="pl-empty-text">
                                Track your favorite photos with stars.
                            </p>
                        </>
                    )}
                </div>
            </main>
        </SidebarLayout>
    );
};

export default Starred;
