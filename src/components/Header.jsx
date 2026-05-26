import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';
import { Container } from './ui/Container';
import { Button } from './ui/Button';

const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();

  const isHome = location.pathname === '/';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 z-[100] w-full transition-all duration-700 h-20 flex items-center border-b border-transparent",
        scrolled || !isHome 
          ? "bg-white/80 backdrop-blur-md border-zinc-100 h-16" 
          : "bg-transparent text-white"
      )}
    >
      <Container className="flex items-center justify-between">
        <div className="flex items-center">
          <Link to="/" className="group flex items-center gap-2">
            <span className={cn(
              "text-lg font-bold tracking-tightest uppercase transition-colors",
              scrolled || !isHome ? "text-zinc-950" : "text-white"
            )}>
              PIXNXT
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors",
                  scrolled || !isHome ? "text-zinc-600 hover:text-zinc-950" : "text-white/70 hover:text-white"
                )}
              >
                Dashboard
              </Link>
              <Button 
                onClick={logout} 
                variant={scrolled || !isHome ? "primary" : "outline"} 
                size="sm"
                className={cn(
                  "rounded-none h-8 px-6 text-[10px] font-bold uppercase tracking-widest",
                  !scrolled && isHome && "border-white/30 text-white hover:bg-white hover:text-black"
                )}
              >
                Log Out
              </Button>
            </>
          ) : (
            <>
              <Link 
                to="/auth" 
                className={cn(
                  "text-[10px] font-bold uppercase tracking-widest transition-colors",
                  scrolled || !isHome ? "text-zinc-600 hover:text-zinc-950" : "text-white/70 hover:text-white"
                )}
              >
                Log In
              </Link>
              <Button 
                asChild 
                variant={scrolled || !isHome ? "primary" : "outline"} 
                size="sm"
                className={cn(
                  "rounded-none h-8 px-6 text-[10px] font-bold uppercase tracking-widest",
                  !scrolled && isHome && "border-white/30 text-white hover:bg-white hover:text-black"
                )}
              >
                <Link to="/auth">Get Started</Link>
              </Button>
            </>
          )}
        </div>
      </Container>
    </header>
  );
};

export default Header;
