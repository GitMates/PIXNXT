import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Header.css';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  // If not on the homepage, always show scrolled (solid) state
  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const headerClass = `header ${scrolled || !isHome ? 'header-scrolled' : ''}`;

  return (
    <header className={headerClass}>
      <div className="header-container">
        <div className="logo">
          <Link to="/">
            <img src="/Logo_Final-01.png" alt="Pixnxt Logo" className="logo-img" />
          </Link>
        </div>

        <div className="header-actions">
          <a href="#login" className="login-btn">Log In</a>
          <a href="#signup" className="signup-btn">Get Started</a>
        </div>
      </div>
    </header>
  );
};

export default Header;
