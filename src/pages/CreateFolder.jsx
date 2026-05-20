import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DatePicker } from '../components/ui/DatePicker';
import { useAuth } from '../hooks/useAuth';
import { galleryService } from '../services/gallery.service';
import './CreateCollection.css';
import './CreateFolder.css';

const CreateFolder = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [name, setName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [showOnHomepage, setShowOnHomepage] = useState(true);
    const [passwordEnabled, setPasswordEnabled] = useState(false);
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('You must be logged in to create a folder.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const created = await galleryService.createFolder(user.id, {
                name,
                eventDate: eventDate || null,
                showOnHomepage,
                passwordEnabled,
                password: passwordEnabled ? password : null,
            });
            navigate(`/folders/${created.id}`);
        } catch (err) {
            console.error('Error creating folder:', err);
            setError(err.message || 'Failed to create folder. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        navigate('/client-gallery');
    };

    return (
        <div className="cc-page cf-page">
            <header className="cc-header">
                <div className="cc-header-left">
                    <button type="button" className="cc-back-btn" onClick={handleClose} title="Close" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                    <h1 className="cc-header-title">New Folder</h1>
                </div>
            </header>

            <main className="cc-main">
                <div className="cc-form-container">
                    <h2 className="cc-form-title cf-form-title">Create New Folder</h2>

                    {error && <div className="cf-error">{error}</div>}

                    <form onSubmit={handleCreate}>
                        <div className="cc-form-group">
                            <label className="cc-label" htmlFor="folder-name">Folder Name</label>
                            <input
                                id="folder-name"
                                type="text"
                                className="cc-input"
                                placeholder="e.g. Dance Recital"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="cc-form-group">
                            <label className="cc-label" htmlFor="folder-event-date">Event Date</label>
                            <DatePicker
                                value={eventDate}
                                onChange={setEventDate}
                                placeholder="Event Date"
                            />
                        </div>

                        <div className="cf-toggle-group">
                            <div className="cf-toggle-row">
                                <span className="cf-toggle-label">
                                    Show on Homepage
                                    <span className="cf-info" title="When enabled, this folder can appear on your public homepage.">i</span>
                                </span>
                                <div className="cf-toggle-control">
                                    <label className="cf-toggle">
                                        <input
                                            type="checkbox"
                                            checked={showOnHomepage}
                                            onChange={() => setShowOnHomepage((v) => !v)}
                                        />
                                        <span className="cf-toggle-slider" />
                                    </label>
                                    <span className="cf-toggle-state">{showOnHomepage ? 'On' : 'Off'}</span>
                                </div>
                            </div>

                            <div className="cf-toggle-row">
                                <span className="cf-toggle-label">
                                    Global Folder Password
                                    <span className="cf-info" title="When enabled, visitors need this password to open any collection in the folder.">i</span>
                                </span>
                                <div className="cf-toggle-control">
                                    <label className="cf-toggle">
                                        <input
                                            type="checkbox"
                                            checked={passwordEnabled}
                                            onChange={() => setPasswordEnabled((v) => !v)}
                                        />
                                        <span className="cf-toggle-slider" />
                                    </label>
                                    <span className="cf-toggle-state">{passwordEnabled ? 'On' : 'Off'}</span>
                                </div>
                            </div>
                        </div>

                        {passwordEnabled && (
                            <div className="cc-form-group">
                                <label className="cc-label" htmlFor="folder-password">Folder Password</label>
                                <input
                                    id="folder-password"
                                    type="password"
                                    className="cc-input"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required={passwordEnabled}
                                    autoComplete="new-password"
                                />
                            </div>
                        )}

                        <div className="cc-actions cf-actions">
                            <button type="submit" className="cc-submit-btn cf-submit-btn" disabled={isSubmitting}>
                                {isSubmitting ? 'Creating…' : 'Create Folder'}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateFolder;
