import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './Home.css';

const ROTATOR_LINES = [
  'beautifully delivered.',
  'proofed in one place.',
  'found by every guest.',
  'printed to last.',
];

const WORDMARK_PATHS = [
  'M17 22h153c85 0 140 38 140 121v14c0 83-55 121-140 121H66v150H17zM66 67v167h99c60 0 95-27 95-79v-10c0-52-35-78-95-78z',
  'M489 22h50v407h-50z',
  'M708 22h60l110 153 110-153h60L907 214l157 215h-60L876 253 752 429h-60l156-215z',
  'M1217 22h49v313l309-318h10v412h-49V118l-309 317h-10z',
  'M1754 22h60l110 153 110-153h60l-141 192 157 215h-60l-128-176-124 176h-60l156-215z',
  'M2219 22h338v46h-144v361h-50V68h-144z',
];

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const Home = () => {
  const { user, loading: authLoading } = useAuth();
  const [lineIndex, setLineIndex] = useState(0);
  const [leavingIndex, setLeavingIndex] = useState(-1);
  const [firing, setFiring] = useState(false);
  const flashRef = useRef(null);
  const beamRef = useRef(null);
  const markRef = useRef(null);
  const lastShotRef = useRef(0);
  const hasSession = Boolean(user);

  const fire = useCallback(() => {
    setFiring(false);
    requestAnimationFrame(() => setFiring(true));
  }, []);

  const shoot = useCallback(() => {
    const now = Date.now();
    if (now - lastShotRef.current < 450) return;
    lastShotRef.current = now;
    fire();
  }, [fire]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'PIXNXT — Private beta';
    document.documentElement.classList.add('beta-home-lock');
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove('beta-home-lock');
    };
  }, []);

  useEffect(() => {
    if (ROTATOR_LINES.length < 2 || prefersReducedMotion()) return undefined;
    const id = window.setInterval(() => {
      setLineIndex((current) => {
        setLeavingIndex(current);
        return (current + 1) % ROTATOR_LINES.length;
      });
      window.setTimeout(() => setLeavingIndex(-1), 750);
    }, 2800);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const flash = flashRef.current;
    const beam = beamRef.current;
    const mark = markRef.current;
    if (!flash || !beam || prefersReducedMotion()) return undefined;

    const widthPct = 24;
    const run = 3000;
    const rest = 1200;
    let start = null;
    let fired = false;
    let firedAt = 0;
    let frameId = 0;

    const markPct = () => (mark ? (mark.offsetLeft / flash.offsetWidth) * 100 : 70);
    const ease = (p) => -(Math.cos(Math.PI * p) - 1) / 2;

    const frame = (t) => {
      if (start === null) start = t;
      const elapsed = t - start;
      const p = elapsed / run;
      if (p <= 1) {
        const head = ease(p) * (100 + widthPct);
        beam.style.left = `${head - widthPct}%`;
        if (!fired && head >= markPct()) {
          fired = true;
          firedAt = p;
          fire();
        }
        beam.style.opacity = String(fired ? 1 - 0.75 * ((p - firedAt) / (1 - firedAt)) : 0.45);
      } else {
        beam.style.opacity = '0';
        if (elapsed > run + rest) {
          start = t;
          fired = false;
        }
      }
      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [fire]);

  return (
    <main className="beta-home">
      <div className="beta-home__glow" aria-hidden="true" />
      <div className="beta-home__grain" aria-hidden="true" />
      <div className="beta-home__page">
        <header className="beta-home__header">
          <Link className="beta-home__wordmark" to="/" aria-label="PIXNXT">
            <svg viewBox="0 0 2576 452" aria-hidden="true">
              <path fillRule="evenodd" d={WORDMARK_PATHS[0]} />
              {WORDMARK_PATHS.slice(1).map((d) => (
                <path key={d} d={d} />
              ))}
            </svg>
          </Link>
          <Link
            className="beta-home__signin"
            to={hasSession ? '/dashboard' : '/auth'}
            aria-busy={authLoading ? 'true' : undefined}
          >
            {hasSession ? 'Dashboard' : 'Beta sign in'}
          </Link>
        </header>

        <div className="beta-home__main">
          <div className="beta-home__status">Private beta · Invite only</div>
          <h1 className="beta-home__headline">
            Every frame,
            <br />
            <span className="beta-home__sr">
              beautifully delivered, proofed, shared and printed.
            </span>
            <span className="beta-home__rotator" aria-hidden="true">
              {ROTATOR_LINES.map((line, index) => (
                <b
                  key={line}
                  className={
                    `beta-home__rotator-line${
                      index === lineIndex ? ' is-on' : ''
                    }${index === leavingIndex ? ' is-off' : ''}`
                  }
                >
                  {line}
                </b>
              ))}
            </span>
          </h1>
          <p className="beta-home__sub">
            Galleries, album proofing, guest delivery and prints — one place to hand over your work.
          </p>

          <div
            className={`beta-home__flash${firing ? ' is-firing' : ''}`}
            id="flash"
            ref={flashRef}
            aria-hidden="true"
          >
            <div className="beta-home__track">
              <i className="beta-home__beam" ref={beamRef} />
            </div>
            <span
              className="beta-home__mark"
              ref={markRef}
              title="Take a shot"
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') shoot();
              }}
              onPointerDown={shoot}
            >
              <i className="beta-home__hit" />
              <svg viewBox="0 0 368 418">
                <path d="M0 5h49v313L358 0h10v412h-49V101L10 418H0z" />
              </svg>
            </span>
          </div>
          <p className="beta-home__flash-note">In private beta with working photographers</p>
        </div>

        <footer className="beta-home__footer">
          <span>© 2026 Pixnxt</span>
          <span>
            Photographer?{' '}
            <a href="mailto:hello@pixnxt.in?subject=PIXNXT%20beta%20invite">Request an invite</a>
          </span>
        </footer>
      </div>
    </main>
  );
};

export default Home;
