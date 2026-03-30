import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLayout from '../components/SidebarLayout';
import './ClientGallery.css';

const ClientGallery = () => {
    const navigate = useNavigate();
    const [collections, setCollections] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDate, setNewDate] = useState('');
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [showViewDropdown, setShowViewDropdown] = useState(false);
    const [activeView, setActiveView] = useState('grid');
    const [activeSort, setActiveSort] = useState('created-new');
    const [selectedCards, setSelectedCards] = useState([]);
    const [contextMenuId, setContextMenuId] = useState(null);
    const [activeFilter, setActiveFilter] = useState(null);
    const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
    const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
    const [starredCollections, setStarredCollections] = useState([]);
    const [showNewCollectionDropdown, setShowNewCollectionDropdown] = useState(false);
    const fileInputRef = useRef(null);
    const sortRef = useRef(null);
    const viewRef = useRef(null);
    const contextRef = useRef(null);
    const filterRef = useRef(null);
    const newCollectionRef = useRef(null);

    useEffect(() => {
        // Load collections from localStorage
        const saved = localStorage.getItem('pixnxt_collections');
        let initialCollections = [];
        if (saved) {
            try { initialCollections = JSON.parse(saved); } catch (e) { }
        }

        const cover = localStorage.getItem('pixnxt_collection_cover');
        const count = localStorage.getItem('pixnxt_collection_photo_count');
        const name = localStorage.getItem('pixnxt_collection_name');
        const photos = localStorage.getItem('pixnxt_photos');
        
        if (name && initialCollections.length > 0) {
            const updated = initialCollections.map(c => {
                if (c.name === name) {
                    // Try to get cover: explicit cover > first photo > existing cover
                    let coverImg = cover || c.cover;
                    if (!coverImg && photos) {
                        try {
                            const photoArr = JSON.parse(photos);
                            if (photoArr.length > 0) coverImg = photoArr[0];
                        } catch (e) {}
                    }
                    return {
                        ...c,
                        cover: coverImg,
                        photoCount: count ? parseInt(count) : c.photoCount
                    };
                }
                return c;
            });
            // Only update if changed
            const hasChanges = updated.some((c, i) =>
                c.cover !== initialCollections[i].cover || c.photoCount !== initialCollections[i].photoCount
            );
            if (hasChanges) {
                setCollections(updated);
                localStorage.setItem('pixnxt_collections', JSON.stringify(updated));
            } else {
                setCollections(initialCollections);
            }
        }
    }, []);

    const handleCreateCollection = () => {
        if (!newName.trim()) return;
        const collection = {
            id: Date.now(),
            name: newName.trim(),
            date: newDate || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            cover: null,
            photoCount: 0,
        };
        const updated = [...collections, collection];
        setCollections(updated);
        localStorage.setItem('pixnxt_collections', JSON.stringify(updated));
        localStorage.setItem('pixnxt_collection_name', collection.name);
        localStorage.setItem('pixnxt_collection_date', collection.date);
        localStorage.removeItem('pixnxt_photos');
        localStorage.removeItem('pixnxt_collection_cover');
        localStorage.setItem('pixnxt_collection_photo_count', '0');
        setNewName('');
        setNewDate('');
        setShowCreateForm(false);
        navigate('/collections/manage');
    };

    const handleCardClick = (collection) => {
        if (selectedCards.length > 0) return; // don't navigate in selection mode
        localStorage.setItem('pixnxt_collection_name', collection.name);
        localStorage.setItem('pixnxt_collection_date', collection.date);
        navigate('/collections/manage');
    };

    const handleCoverUpload = (collectionId, e) => {
        e.stopPropagation();
        const file = e.target.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const updated = collections.map(c =>
                    c.id === collectionId ? { ...c, cover: ev.target.result } : c
                );
                setCollections(updated);
                localStorage.setItem('pixnxt_collections', JSON.stringify(updated));
            };
            reader.readAsDataURL(file);
        }
    };

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (sortRef.current && !sortRef.current.contains(e.target)) setShowSortDropdown(false);
            if (viewRef.current && !viewRef.current.contains(e.target)) setShowViewDropdown(false);
            if (contextRef.current && !contextRef.current.contains(e.target)) setContextMenuId(null);
            if (filterRef.current && !filterRef.current.contains(e.target)) setActiveFilter(null);
            if (newCollectionRef.current && !newCollectionRef.current.contains(e.target)) setShowNewCollectionDropdown(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Toggle a filter dropdown
    const toggleFilter = (filterName) => {
        setActiveFilter(activeFilter === filterName ? null : filterName);
    };

    // Calendar helpers
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const getDaysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();
    const today = new Date();

    const renderCalendarGrid = () => {
        const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
        const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
        const daysInPrevMonth = getDaysInMonth(calendarMonth - 1 < 0 ? 11 : calendarMonth - 1, calendarMonth - 1 < 0 ? calendarYear - 1 : calendarYear);
        const cells = [];
        // Previous month trailing days
        for (let i = firstDay - 1; i >= 0; i--) {
            cells.push(<span key={`prev-${i}`} className="cg-cal-day cg-cal-other">{daysInPrevMonth - i}</span>);
        }
        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday = d === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();
            cells.push(<span key={`cur-${d}`} className={`cg-cal-day${isToday ? ' cg-cal-today' : ''}`}>{d}</span>);
        }
        // Next month leading days
        const remaining = 7 - (cells.length % 7);
        if (remaining < 7) {
            for (let i = 1; i <= remaining; i++) {
                cells.push(<span key={`next-${i}`} className="cg-cal-day cg-cal-other">{i}</span>);
            }
        }
        return cells;
    };

    // Toggle selection of a card
    const toggleSelectCard = (e, collectionId) => {
        e.stopPropagation();
        setContextMenuId(null);
        setSelectedCards(prev => {
            if (prev.includes(collectionId)) {
                return prev.filter(id => id !== collectionId);
            }
            return [...prev, collectionId];
        });
    };

    // Clear selection
    const clearSelection = () => {
        setSelectedCards([]);
    };

    // Open context menu for a card
    const openContextMenu = (e, collectionId) => {
        e.stopPropagation();
        setContextMenuId(contextMenuId === collectionId ? null : collectionId);
    };

    return (
        <SidebarLayout>
            <main className="cg-main cg-collections-view">
                {/* Header */}
                <div className="cg-collections-header">
                    <div className="cg-collections-header-left">
                        <h1 className="cg-collections-title">Collections</h1>
                        <div className="cg-search-box">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            <input type="text" placeholder="Search" className="cg-search-input" />
                        </div>
                    </div>
                    <div className="cg-collections-header-right">
                        <button className="cg-view-presets-btn">View Presets</button>
                        <div className="cg-new-collection-wrapper" ref={newCollectionRef}>
                            <button className="cg-new-collection-btn" onClick={() => setShowCreateForm(true)}>
                                New Collection
                            </button>
                            <button className="cg-new-collection-chevron" onClick={() => setShowNewCollectionDropdown(!showNewCollectionDropdown)}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {showNewCollectionDropdown && (
                                <div className="cg-new-collection-dropdown">
                                    <div className="cg-new-collection-dropdown-item" onClick={() => setShowNewCollectionDropdown(false)}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                                        New Folder
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="cg-filter-bar" ref={filterRef}>
                    <div className="cg-filters-left">
                        {/* Status Filter */}
                        <div className="cg-filter-wrapper">
                            <button className={`cg-filter-chip${activeFilter === 'status' ? ' active' : ''}`} onClick={() => toggleFilter('status')}>
                                Status
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'status' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'status' && (
                                <div className="cg-filter-dropdown">
                                    <div className="cg-filter-dropdown-item" onClick={() => setActiveFilter(null)}>Published</div>
                                    <div className="cg-filter-dropdown-item" onClick={() => setActiveFilter(null)}>Hidden</div>
                                    <div className="cg-filter-dropdown-item" onClick={() => setActiveFilter(null)}>Draft</div>
                                </div>
                            )}
                        </div>
                        {/* Category Tag Filter */}
                        <div className="cg-filter-wrapper">
                            <button className={`cg-filter-chip${activeFilter === 'category' ? ' active' : ''}`} onClick={() => toggleFilter('category')}>
                                Category Tag
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'category' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'category' && (
                                <div className="cg-filter-dropdown">
                                    <div className="cg-filter-dropdown-empty">You don't have category tags yet. <a className="cg-filter-link" href="#">Learn more</a></div>
                                </div>
                            )}
                        </div>
                        {/* Event Date Filter */}
                        <div className="cg-filter-wrapper">
                            <button className={`cg-filter-chip${activeFilter === 'eventdate' ? ' active' : ''}`} onClick={() => toggleFilter('eventdate')}>
                                Event Date
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'eventdate' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'eventdate' && (
                                <div className="cg-filter-dropdown cg-filter-calendar-dropdown">
                                    <div className="cg-cal-section">
                                        <div className="cg-cal-header">
                                            <span className="cg-cal-month">{monthNames[calendarMonth]}</span>
                                            <span className="cg-cal-year">{calendarYear}</span>
                                            <button className="cg-cal-nav" onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else setCalendarMonth(calendarMonth - 1); }}>←</button>
                                            <button className="cg-cal-nav" onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else setCalendarMonth(calendarMonth + 1); }}>→</button>
                                        </div>
                                        <div className="cg-cal-days-header">{dayNames.map((d, i) => <span key={i}>{d}</span>)}</div>
                                        <div className="cg-cal-grid">{renderCalendarGrid()}</div>
                                    </div>
                                    <div className="cg-cal-quick">
                                        <div className="cg-cal-quick-title">QUICK SEARCH</div>
                                        <div className="cg-cal-quick-item">Last week</div>
                                        <div className="cg-cal-quick-item">Last 2 weeks</div>
                                        <div className="cg-cal-quick-item">Last month</div>
                                        <div className="cg-cal-quick-item">Last 6 months</div>
                                        <div className="cg-cal-quick-item">Last year</div>
                                        <div className="cg-cal-quick-item">Next week</div>
                                        <div className="cg-cal-quick-item">Next 2 weeks</div>
                                        <div className="cg-cal-quick-item">Next month</div>
                                        <div className="cg-cal-quick-item">Next 6 months</div>
                                        <div className="cg-cal-quick-item">Next year</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Expiry Date Filter */}
                        <div className="cg-filter-wrapper">
                            <button className={`cg-filter-chip${activeFilter === 'expirydate' ? ' active' : ''}`} onClick={() => toggleFilter('expirydate')}>
                                Expiry Date
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'expirydate' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'expirydate' && (
                                <div className="cg-filter-dropdown cg-filter-calendar-dropdown">
                                    <div className="cg-cal-section">
                                        <div className="cg-cal-header">
                                            <span className="cg-cal-month">{monthNames[calendarMonth]}</span>
                                            <span className="cg-cal-year">{calendarYear}</span>
                                            <button className="cg-cal-nav" onClick={() => { if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(calendarYear - 1); } else setCalendarMonth(calendarMonth - 1); }}>←</button>
                                            <button className="cg-cal-nav" onClick={() => { if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(calendarYear + 1); } else setCalendarMonth(calendarMonth + 1); }}>→</button>
                                        </div>
                                        <div className="cg-cal-days-header">{dayNames.map((d, i) => <span key={i}>{d}</span>)}</div>
                                        <div className="cg-cal-grid">{renderCalendarGrid()}</div>
                                    </div>
                                    <div className="cg-cal-quick">
                                        <div className="cg-cal-quick-title">QUICK SEARCH</div>
                                        <div className="cg-cal-quick-item">Next week</div>
                                        <div className="cg-cal-quick-item">Next 2 weeks</div>
                                        <div className="cg-cal-quick-item">Next month</div>
                                        <div className="cg-cal-quick-item">Next 6 months</div>
                                        <div className="cg-cal-quick-item">Next year</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Starred Filter */}
                        <div className="cg-filter-wrapper">
                            <button className={`cg-filter-chip${activeFilter === 'starred' ? ' active' : ''}`} onClick={() => toggleFilter('starred')}>
                                Starred
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: activeFilter === 'starred' ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            {activeFilter === 'starred' && (
                                <div className="cg-filter-dropdown">
                                    <div className="cg-filter-dropdown-item" onClick={() => setActiveFilter(null)}>Yes</div>
                                    <div className="cg-filter-dropdown-item" onClick={() => setActiveFilter(null)}>No</div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="cg-filters-right">
                        <div className="cg-sort-wrapper" ref={sortRef}>
                            <button className="cg-view-icon-btn" onClick={() => { setShowSortDropdown(!showSortDropdown); setShowViewDropdown(false); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="18" x2="12" y2="18"></line><line x1="3" y1="6" x2="3" y2="18"></line><polyline points="1 15 3 18 5 15"></polyline></svg>
                            </button>
                            {showSortDropdown && (
                                <div className="cg-sort-dropdown">
                                    <div className="cg-dropdown-label">Sort dashboard by</div>
                                    <div className={`cg-dropdown-item${activeSort === 'created-new' ? ' active' : ''}`} onClick={() => { setActiveSort('created-new'); setShowSortDropdown(false); }}>Created: New → Old</div>
                                    <div className={`cg-dropdown-item${activeSort === 'created-old' ? ' active' : ''}`} onClick={() => { setActiveSort('created-old'); setShowSortDropdown(false); }}>Created: Old → New</div>
                                    <div className={`cg-dropdown-item${activeSort === 'event-new' ? ' active' : ''}`} onClick={() => { setActiveSort('event-new'); setShowSortDropdown(false); }}>Event Date: New → Old</div>
                                    <div className={`cg-dropdown-item${activeSort === 'event-old' ? ' active' : ''}`} onClick={() => { setActiveSort('event-old'); setShowSortDropdown(false); }}>Event Date: Old → New</div>
                                    <div className={`cg-dropdown-item${activeSort === 'name-az' ? ' active' : ''}`} onClick={() => { setActiveSort('name-az'); setShowSortDropdown(false); }}>Name: A-Z</div>
                                    <div className={`cg-dropdown-item${activeSort === 'name-za' ? ' active' : ''}`} onClick={() => { setActiveSort('name-za'); setShowSortDropdown(false); }}>Name: Z-A</div>
                                </div>
                            )}
                        </div>
                        <div className="cg-view-wrapper" ref={viewRef}>
                            <button className={`cg-view-icon-btn${activeView === 'grid' ? ' active' : ''}`} onClick={() => { setShowViewDropdown(!showViewDropdown); setShowSortDropdown(false); }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                            </button>
                            {showViewDropdown && (
                                <div className="cg-view-dropdown">
                                    <div className="cg-dropdown-label">View Style</div>
                                    <div className={`cg-dropdown-item${activeView === 'grid' ? ' active' : ''}`} onClick={() => { setActiveView('grid'); setShowViewDropdown(false); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                                        Grid View
                                        {activeView === 'grid' && <span className="cg-check">✓</span>}
                                    </div>
                                    <div className={`cg-dropdown-item${activeView === 'list' ? ' active' : ''}`} onClick={() => { setActiveView('list'); setShowViewDropdown(false); }}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                                        List View
                                        {activeView === 'list' && <span className="cg-check">✓</span>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Collection Cards - Grid View */}
                {collections.length > 0 && activeView === 'grid' ? (
                    <div className="cg-collection-grid">
                        {collections.map(collection => (
                            <div
                                key={collection.id}
                                className={`cg-collection-card${selectedCards.includes(collection.id) ? ' cg-selected' : ''}`}
                                onClick={() => handleCardClick(collection)}
                            >
                                <div className="cg-card-thumb">
                                    {collection.cover ? (
                                        <img src={collection.cover} alt={collection.name} />
                                    ) : (
                                        <div className="cg-card-placeholder">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                        </div>
                                    )}
                                    {/* Selection circle overlay */}
                                    <div className={`cg-select-circle${selectedCards.includes(collection.id) ? ' selected' : ''}`} onClick={(e) => toggleSelectCard(e, collection.id)}>
                                        {selectedCards.includes(collection.id) && (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        )}
                                    </div>
                                    {/* Three-dot menu overlay */}
                                    <div className="cg-card-dots" onClick={(e) => openContextMenu(e, collection.id)}>⋮</div>
                                    {/* Star icon overlay - clickable toggle */}
                                    <svg className={`cg-star-icon${starredCollections.includes(collection.id) ? ' cg-starred' : ''}`} xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill={starredCollections.includes(collection.id) ? '#f5c518' : 'none'} stroke={starredCollections.includes(collection.id) ? '#f5c518' : 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" onClick={(e) => { e.stopPropagation(); setStarredCollections(prev => prev.includes(collection.id) ? prev.filter(id => id !== collection.id) : [...prev, collection.id]); }}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                </div>
                                {/* Context menu - OUTSIDE the thumb */}
                                {contextMenuId === collection.id && (
                                    <div className="cg-context-menu" ref={contextRef} onClick={(e) => e.stopPropagation()}>
                                        <div className="cg-context-item" onClick={() => setContextMenuId(null)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                                            Share
                                        </div>
                                        <div className="cg-context-item" onClick={() => setContextMenuId(null)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                            Preview
                                        </div>
                                        <div className="cg-context-item" onClick={() => setContextMenuId(null)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            Quick edit
                                        </div>
                                        <div className="cg-context-item" onClick={() => setContextMenuId(null)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path><line x1="19" y1="12" x2="19" y2="5"></line></svg>
                                            Move to
                                        </div>
                                        <div className="cg-context-item" onClick={() => setContextMenuId(null)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="8" width="14" height="14" rx="2" ry="2"></rect><path d="M4 16V4a2 2 0 0 1 2-2h12"></path></svg>
                                            Duplicate
                                        </div>
                                        <div className="cg-context-item cg-context-delete" onClick={() => setContextMenuId(null)}>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                            Delete
                                        </div>
                                    </div>
                                )}
                                <div className="cg-card-info">
                                    <h3 className="cg-card-name">{collection.name}</h3>
                                    <div className="cg-card-meta">
                                        <span className="cg-card-dot"></span>
                                        <span className="cg-card-count">{collection.photoCount || 0} items</span>
                                        <span className="cg-card-separator">·</span>
                                        <span className="cg-card-date">{collection.date}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : collections.length > 0 && activeView === 'list' ? (
                    /* List View */
                    <div className="cg-list-view">
                        <div className="cg-list-header">
                            <span className="cg-list-col cg-list-col-name">NAME</span>
                            <span className="cg-list-col cg-list-col-pw">PASSWORD <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>
                            <span className="cg-list-col cg-list-col-pin">DOWNLOAD PIN <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg></span>
                            <span className="cg-list-col cg-list-col-date">DATE CREATED</span>
                            <span className="cg-list-col cg-list-col-actions"></span>
                        </div>
                        {collections.map(collection => (
                            <div
                                key={collection.id}
                                className="cg-list-row"
                                onClick={() => handleCardClick(collection)}
                            >
                                <div className="cg-list-col cg-list-col-name">
                                    <div className="cg-list-thumb">
                                        {collection.cover ? (
                                            <img src={collection.cover} alt={collection.name} />
                                        ) : (
                                            <div className="cg-list-thumb-placeholder">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="cg-list-name-info">
                                        <span className="cg-list-name">{collection.name}</span>
                                        <span className="cg-list-sub">{collection.photoCount || 0} items{collection.date ? ` · ${collection.date}` : ''}</span>
                                    </div>
                                    <span className={`cg-list-badge${collection.photoCount > 0 ? ' published' : ''}`}>{collection.photoCount > 0 ? 'PUBLISHED' : 'DRAFT'}</span>
                                </div>
                                <div className="cg-list-col cg-list-col-pw">
                                    <span className="cg-list-dash">-</span>
                                </div>
                                <div className="cg-list-col cg-list-col-pin">
                                    <span className="cg-list-pin-dots">••••</span>
                                </div>
                                <div className="cg-list-col cg-list-col-date">
                                    {collection.date || 'Mar 12, 2026'}
                                </div>
                                <div className="cg-list-col cg-list-col-actions">
                                    <svg className="cg-list-action-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    <span className="cg-list-dots" onClick={(e) => { e.stopPropagation(); }}>···</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="cg-empty-collections">
                        <div className="cg-empty-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#d0d5d9" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                        </div>
                        <h3 className="cg-empty-title">No collections yet</h3>
                        <p className="cg-empty-text">Create your first collection to get started</p>
                        <button className="cg-empty-create-btn" onClick={() => setShowCreateForm(true)}>
                            Create Collection
                        </button>
                    </div>
                )}

                {/* Selection Action Bar */}
                {selectedCards.length > 0 && (
                    <div className="cg-selection-bar">
                        <div className="cg-selection-bar-left">
                            <button className="cg-selection-close" onClick={clearSelection}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <span className="cg-selection-count">{selectedCards.length} selected</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <div className="cg-selection-bar-right">
                            <button className="cg-selection-action" title="Star">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                            </button>
                            <button className="cg-selection-action" title="Preview">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            </button>
                            <button className="cg-selection-action" title="Tag">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
                            </button>
                            <button className="cg-selection-action" title="Move to">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path><line x1="19" y1="12" x2="19" y2="5"></line></svg>
                            </button>
                            <button className="cg-selection-action" title="Edit">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Create Collection Inline Modal */}
                {showCreateForm && (
                    <div className="cd-modal-overlay" onClick={() => setShowCreateForm(false)}>
                        <div className="cg-create-modal" onClick={(e) => e.stopPropagation()}>
                            <div className="cg-create-modal-header">
                                <h3>New Collection</h3>
                                <button className="cd-modal-close" onClick={() => setShowCreateForm(false)}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                            <div className="cg-create-modal-body">
                                <div className="cg-form-group">
                                    <label>Collection Name</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="e.g. Jessie & Ryan"
                                        autoFocus
                                    />
                                </div>
                                <div className="cg-form-group">
                                    <label>Event Date</label>
                                    <input
                                        type="text"
                                        value={newDate}
                                        onChange={(e) => setNewDate(e.target.value)}
                                        placeholder="e.g. Mar 12, 2026"
                                    />
                                </div>
                                <button className="cg-create-submit" onClick={handleCreateCollection}>
                                    Create Collection
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </SidebarLayout>
    );
};

export default ClientGallery;
