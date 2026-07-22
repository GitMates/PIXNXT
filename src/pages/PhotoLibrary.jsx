import React from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import './PhotoLibrary.css';

const PhotoLibrary = () => {
    const navigate = useNavigate();

    return (
        <SidebarLayout>
            <main className="pl-main">
                <header className="pl-header">
                    <h1 className="pl-title">Photo Library</h1>
                    <div className="pl-header-actions">
                        <div className="pl-search-container">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="Search 'bride and groom walking'" />
                            <div className="pl-search-divider"></div>
                            <svg className="pl-calendar-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                        </div>
                    </div>
                </header>

                <div className="pl-empty-state">
                    <div className="pl-empty-graphic">
                        <svg width="160" height="140" viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M120 160H20C8.9543 160 0 151.046 0 140V40C0 28.9543 8.9543 20 20 20H60L80 40H120C131.046 40 140 48.9543 140 60V140C140 151.046 131.046 160 120 160Z" fill="#eafaf6" />
                            <path d="M110 50H40C28.9543 50 20 58.9543 20 70V130C20 141.046 28.9543 150 40 150H110C121.046 150 130 141.046 130 130V70C130 58.9543 121.046 50 110 50Z" fill="#ffffff" stroke="#333" strokeWidth="4" />
                            <path d="M40 110L60 90L80 110M70 100L90 80L110 100" stroke="#333" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="55" cy="75" r="8" fill="#333" />
                            {/* Abstract user interacting */}
                            <path d="M160 160V120C160 108.954 151.046 100 140 100H100" stroke="#333" strokeWidth="4" strokeLinecap="round" />
                            <circle cx="130" cy="70" r="15" fill="#f4f4f4" stroke="#333" strokeWidth="4" />
                        </svg>
                    </div>
                    <h2 className="pl-empty-title">You have no photos yet</h2>
                    <p className="pl-empty-text">
                        All photos added to your collections will appear here. Get<br />
                        started by creating a collection.
                    </p>
                    <button className="pl-new-btn" onClick={() => navigate('/collections/get-started')}>
                        New Collection
                    </button>
                </div>
            </main>
        </SidebarLayout>
    );
};

export default PhotoLibrary;
