import React from 'react';
import './Hero.css';

const Hero = () => {
    return (
        <section className="hero">
            {/* 
        Video Background 
        User should place auto-playing video in public or assets
        If no video, it falls back to a dark background color
      */}
            <div className="video-overlay"></div>
            <video
                className="hero-video"
                autoPlay
                loop
                muted
                playsInline
            >
                <source src="/hero-video.mp4" type="video/mp4" />
                {/* Fallback image if video fails to load or provide one */}
            </video>

            <div className="hero-content container">
                <p className="hero-subtitle">PIXNXT PHOTOGRAPHER PLATFORM</p>
                <h1 className="hero-title">
                    Designed for photographers.<br />
                    Built to help you grow.
                </h1>
                <p className="hero-description">
                    Industry-leading photo galleries, website and business tools to streamline your workflow and grow your photography business.
                </p>
                <div className="hero-cta">
                    <button className="btn-primary">Get Started</button>
                </div>
            </div>
        </section>
    );
};

export default Hero;
