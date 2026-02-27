import React from 'react';
import './FeatureArea.css';

const FeatureArea = ({ title, subtitle, description, imageUrl, imageAlt, reverse, id }) => {
    return (
        <section id={id} className={`feature-area ${reverse ? 'feature-reverse' : ''}`}>
            <div className="container feature-container">
                <div className="feature-content">
                    <h4 className="feature-subtitle">{subtitle}</h4>
                    <h2 className="feature-title">{title}</h2>
                    <p className="feature-description">{description}</p>
                    <a href="#" className="feature-link">Learn more <span className="arrow">→</span></a>
                </div>
                <div className="feature-image-wrapper">
                    <img src={imageUrl} alt={imageAlt} className="feature-image" />
                </div>
            </div>
        </section>
    );
};

export default FeatureArea;
