import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { initAuthVintagePoster } from './authVintagePosterRuntime';
import './AuthVintagePoster.css';

const N_MARK = 'M0 5h49v313L358 0h10v412h-49V101L10 418H0z';

const WORDMARK_PATHS = [
  'M17 22h153c85 0 140 38 140 121v14c0 83-55 121-140 121H66v150H17zM66 67v167h99c60 0 95-27 95-79v-10c0-52-35-78-95-78z',
  'M489 22h50v407h-50z',
  'M708 22h60l110 153 110-153h60L907 214l157 215h-60L876 253 752 429h-60l156-215z',
  'M1217 22h49v313l309-318h10v412h-49V118l-309 317h-10z',
  'M1754 22h60l110 153 110-153h60l-141 192 157 215h-60l-128-176-124 176h-60l156-215z',
  'M2219 22h338v46h-144v361h-50V68h-144z',
];

/**
 * Left-panel vintage “studies in delivering photographs” poster.
 */
export const AuthVintagePoster = forwardRef(function AuthVintagePoster(_props, ref) {
  const posterRef = useRef(null);
  const artRef = useRef(null);
  const noRef = useRef(null);
  const nameRef = useRef(null);
  const metaRef = useRef(null);
  const poemRef = useRef(null);
  const tlRef = useRef(null);
  const fillRef = useRef(null);
  const apiRef = useRef(null);

  useImperativeHandle(ref, () => ({
    replay: () => apiRef.current?.replay?.(),
    playEntry: () => apiRef.current?.playEntry?.(),
  }));

  useEffect(() => {
    const api = initAuthVintagePoster({
      poster: posterRef.current,
      art: artRef.current,
      no: noRef.current,
      name: nameRef.current,
      meta: metaRef.current,
      poem: poemRef.current,
      tl: tlRef.current,
      fill: fillRef.current,
    });
    apiRef.current = api;
    return () => {
      api.destroy();
      apiRef.current = null;
    };
  }, []);

  return (
    <aside
      className="poster"
      ref={posterRef}
      aria-label="Studies in delivering photographs"
    >
      <div className="flash" aria-hidden="true" />

      <div className="plate-t">
        <div className="series">The hand-over</div>
        <div className="no" ref={noRef}>
          1985
        </div>
        <div className="name" ref={nameRef}>
          Contact print
        </div>
      </div>

      <div className="stage">
        <div className="meta" ref={metaRef}>
          36 EXP.
        </div>
        <div className="art" ref={artRef} />
        <div className="poem" ref={poemRef}>
          Wait
          <br />
          for the
          <br />
          prints
        </div>
      </div>

      <div className="foot">
        <div className="brand">
          <svg viewBox="0 0 368 418" aria-hidden="true">
            <path d={N_MARK} />
          </svg>
          <svg className="wm" viewBox="0 0 2576 452" aria-hidden="true">
            <path fillRule="evenodd" d={WORDMARK_PATHS[0]} />
            {WORDMARK_PATHS.slice(1).map((d) => (
              <path key={d} d={d} />
            ))}
          </svg>
        </div>
        <div className="study">Studies in delivering photographs</div>
        {/* Empty third cell keeps the study label centered (palette removed). */}
        <div aria-hidden="true" />
      </div>

      <div className="tl" ref={tlRef}>
        <div className="track" />
        <div className="fillwrap">
          <div className="fill" ref={fillRef} />
        </div>
      </div>
    </aside>
  );
});