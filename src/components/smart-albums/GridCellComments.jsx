import React from 'react';

export default function GridCellComments({ items, className = '' }) {
    if (!items?.length) return null;
    return (
        <ul className={`ab-grid-cell-comments${className ? ` ${className}` : ''}`}>
            {items.map((c) => (
                <li key={c.id} className="ab-grid-cell-comment">
                    <strong>{c.author_name}</strong>
                    <span>{c.body}</span>
                </li>
            ))}
        </ul>
    );
}
