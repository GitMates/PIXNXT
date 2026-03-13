import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CreateCollection.css';

const CreateCollection = () => {
    const navigate = useNavigate();

    const handleCreate = (e) => {
        e.preventDefault();
        // Skip validation for this static prototype and go straight to the dashboard
        navigate('/collections/manage');
    };

    const handleClose = () => {
        navigate('/client-gallery');
    };

    return (
        <div className="cc-page">
            <header className="cc-header">
                <button className="cc-close-btn" onClick={handleClose}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
                <span className="cc-header-title">New Collection</span>
            </header>

            <main className="cc-main">
                <div className="cc-form-container">
                    <h1 className="cc-title">Create New Collection</h1>

                    <form onSubmit={handleCreate}>
                        <div className="cc-form-group">
                            <label className="cc-label">Collection Name</label>
                            <input
                                type="text"
                                className="cc-input"
                                placeholder="e.g. Jessie & Ryan"
                                required
                            />
                        </div>

                        <div className="cc-form-group">
                            <label className="cc-label">Event Date</label>
                            <div className="cc-input-wrapper">
                                <input
                                    type="text"
                                    className="cc-input"
                                    placeholder="Event Date"
                                />
                                <svg className="cc-input-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            </div>
                        </div>

                        <button type="submit" className="cc-submit-btn">
                            Create Collection
                        </button>
                    </form>
                </div>
            </main>

            <button className="cg-chat-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </button>
        </div>
    );
};

export default CreateCollection;
