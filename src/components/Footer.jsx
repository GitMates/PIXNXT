import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-top">
                    <div className="footer-brand">
                        <img src="/Logo_Final-01.png" alt="Pixnxt Logo" className="footer-logo-img" />
                        <p className="footer-tagline">Designed for photographers. Built to help you grow.</p>
                    </div>
                </div>
                <div className="footer-bottom">
                    <p className="copyright">© {new Date().getFullYear()} Pixnxt Inc. All rights reserved.</p>
                    <div className="legal-links">
                        <a href="#">Terms</a>
                        <a href="#">Privacy</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
