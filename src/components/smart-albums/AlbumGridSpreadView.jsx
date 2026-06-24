import React from 'react';
import './AlbumBook.css';
import './AlbumGridSpreadView.css';

/**
 * Grid preview shell — no pages, spreads, or navigation.
 */
export default function AlbumGridSpreadView() {
    return (
        <div className="ab-root ab-root--preview ab-grid-spread-view">
            <div className="ab-book-stage" aria-hidden="true" />
        </div>
    );
}
