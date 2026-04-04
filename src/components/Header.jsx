import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Header.css';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

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
          {user ? (
            <>
              <Link to="/dashboard" className="login-btn">Dashboard</Link>
              <button 
                onClick={logout} 
                className="signup-btn"
                style={{ cursor: 'pointer', border: 'none' }}
              >
                Log Out
              </button>
            </>
          ) : (
            <>
              <Link to="/auth" className="login-btn">Log In</Link>
              <Link to="/auth" className="signup-btn">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
