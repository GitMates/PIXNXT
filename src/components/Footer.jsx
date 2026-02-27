import React from 'react';
import './Footer.css';

const Footer = () => {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-top">
                    <div className="footer-brand">
                        <h2 className="footer-logo">P I X N X T</h2>
                        <p className="footer-tagline">Designed for photographers. Built to help you grow.</p>
                    </div>
                    <div className="footer-links">
                        <div className="link-group">
                            <h4>Products</h4>
                            <ul>
                                <li><a href="#">Client Gallery</a></li>
                                <li><a href="#">Website</a></li>
                                <li><a href="#">Studio Manager</a></li>
                                <li><a href="#">Store</a></li>
                            </ul>
                        </div>
                        <div className="link-group">
                            <h4>Resources</h4>
                            <ul>
                                <li><a href="#">Examples</a></li>
                                <li><a href="#">Pricing</a></li>
                                <li><a href="#">Blog</a></li>
                                <li><a href="#">Help Center</a></li>
                            </ul>
                        </div>
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
