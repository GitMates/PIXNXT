import React, { useState } from 'react';
import './WorkflowSection.css';

const categories = [
    { id: 'wedding', name: 'Wedding', image: '/workflow-wedding.jpg', alt: 'Wedding Photography' },
    { id: 'portrait', name: 'Portrait', image: '/workflow-portrait.jpg', alt: 'Portrait Photography' },
    { id: 'family', name: 'Family', image: '/workflow-family.jpg', alt: 'Family Photography' },
    { id: 'seniors', name: 'Seniors', image: '/workflow-seniors.jpg', alt: 'Senior Photography' },
    { id: 'events', name: 'Events', image: '/workflow-events.jpg', alt: 'Event Photography' },
    { id: 'adventure', name: 'Adventure', image: '/workflow-adventure.jpg', alt: 'Adventure Photography' },
    { id: 'commercial', name: 'Commercial', image: '/workflow-commercial.jpg', alt: 'Commercial Photography' },
];

const WorkflowSection = () => {
    const [activeCategory, setActiveCategory] = useState(categories[0]);

    return (
        <section className="workflow-section">
            <div className="container workflow-container">
                <div className="workflow-header">
                    <h4 className="workflow-subtitle">DESIGNED FOR EVERY WORKFLOW</h4>
                    <h2 className="workflow-title">Made for all photographers.</h2>
                    <p className="workflow-description">
                        From weddings to landscapes and everything in between, Pixnxt is built to elevate your business—and make your work look its best.
                    </p>
                </div>

                <div className="workflow-content">
                    <div className="workflow-image-wrapper">
                        <img
                            key={activeCategory.id} // Forces re-render for potential CSS transitions
                            src={activeCategory.image}
                            alt={activeCategory.alt}
                            className="workflow-image"
                        />
                    </div>
                    <div className="workflow-list">
                        <ul>
                            {categories.map((category) => (
                                <li
                                    key={category.id}
                                    className={activeCategory.id === category.id ? 'active' : ''}
                                    onMouseEnter={() => setActiveCategory(category)}
                                >
                                    {category.name}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default WorkflowSection;
