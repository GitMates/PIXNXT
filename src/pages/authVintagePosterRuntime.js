/**
 * Vintage auth poster runtime — ported from auth-vintage.html.
 * @param {Record<string, HTMLElement>} els
 * @returns {{ destroy: () => void, replay: () => void, playEntry: () => void }}
 */
export function initAuthVintagePoster(els) {
  if (!els?.poster || !els?.art || !els?.tl || !els?.fill) {
    return { destroy() {}, replay() {}, playEntry() {} };
  }

  /* ---------- vintage print palette ---------- */
  var M='#8A7866', PAPER='#EEE3CF', INK='#2B231D', T='#B7682A', TD='#8E4A1F', P='#F3B68C', CR='#F6EEDF', B='#5E7E8C', BD='#46626E', S='#D8C6A6', W='#8A5630', WD='#6B3F22';
  var N='M0 5h49v313L358 0h10v412h-49V101L10 418H0z';

  /* riso: speckled ink + hand-cut edges */
  var DEFS = `<defs>
    <filter id="riso" x="-15%" y="-15%" width="130%" height="130%">
      <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.8 1.95" result="m"/>
      <feComposite in="SourceGraphic" in2="m" operator="in" result="s"/>
      <feTurbulence type="fractalNoise" baseFrequency=".02" numOctaves="2" seed="9" result="w"/>
      <feDisplacementMap in="s" in2="w" scale="3.2" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="mottle" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".012" numOctaves="3" seed="2"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .9 -.35"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
  </defs>`;
  function plate(inner){ return `<svg viewBox="0 0 440 380" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${DEFS}<g filter="url(#riso)">${inner}</g></svg>`; }
  /* a filled shape plus a lighter mottled wash over it, like uneven ink */
  function inked(el){ return el + el.replace(/fill="[^"]+"/,'fill="#fff" opacity=".13" filter="url(#mottle)"'); }

  var ART = [
    /* No.1 · film: a roll, its negatives, the contact sheet, a loupe */
    plate(`
      ${inked(`<circle cx="230" cy="170" r="138" fill="${T}"/>`)}
      <g transform="rotate(-7 170 160)">
        <rect x="70" y="40" width="190" height="236" fill="${TD}" opacity=".5" transform="translate(6 7)"/>
        <rect x="70" y="40" width="190" height="236" fill="${CR}"/>
        ${Array.from({length:6},(_,r)=>`<rect x="80" y="${52+r*36}" width="170" height="30" fill="${INK}"/>`+
          `<g fill="${PAPER}" opacity=".55">${Array.from({length:14},(_,k)=>`<rect x="${83+k*12}" y="${53.5+r*36}" width="5" height="3"/><rect x="${83+k*12}" y="${77.5+r*36}" width="5" height="3"/>`).join('')}</g>`+
          Array.from({length:5},(_,c)=>`<g transform="translate(${84+c*33} ${58+r*36})"><rect width="29" height="18" fill="${(r*5+c)%4===1?S:'#9DB1B8'}"/><path d="M0 18V12q8-5 15-2t14-2v10z" fill="${(r*5+c)%3?'#6E5A48':BD}"/></g>`).join('')).join('')}
        <ellipse cx="166.5" cy="103" rx="20" ry="15" fill="none" stroke="${T}" stroke-width="2.6"/>
        <text x="80" y="268" font-family="Courier New,monospace" font-weight="700" font-size="9" fill="${M}">ROLL 12 · 36 EXP</text>
      </g>
      <g class="pull">
        <g transform="rotate(-3 250 300)">
          <rect x="118" y="270" width="218" height="58" fill="#000" opacity=".25" transform="translate(5 6)"/>
          <rect x="118" y="270" width="218" height="58" fill="#5B3416"/>
          <g fill="${PAPER}">${Array.from({length:15},(_,k)=>`<rect x="${122+k*14.4}" y="274" width="7" height="5" rx="1"/><rect x="${122+k*14.4}" y="319" width="7" height="5" rx="1"/>`).join('')}</g>
          ${[0,1,2].map(i=>`<g transform="translate(${126+i*70} 284)"><rect width="62" height="30" fill="#8A5A34"/><circle cx="44" cy="11" r="6" fill="#3A200E"/><path d="M0 30V20q14-9 30-3t32-3v16z" fill="#C49A6C"/></g>`).join('')}
          <text x="130" y="281" font-family="Jost" font-weight="600" font-size="5.5" letter-spacing="1" fill="#E8A860">▸ 23A        ▸ 24A        ▸ 25A</text>
        </g>
      </g>
      <g transform="rotate(-3 350 300)">
        <rect x="312" y="262" width="20" height="80" rx="4" fill="#000" opacity=".3" transform="translate(5 6)"/>
        <rect x="330" y="268" width="92" height="68" rx="3" fill="#000" opacity=".3" transform="translate(5 6)"/>
        <rect x="330" y="268" width="92" height="68" rx="3" fill="${CR}"/>
        <rect x="330" y="282" width="92" height="12" fill="${T}"/><rect x="330" y="300" width="92" height="5" fill="${B}"/>
        <text x="352" y="327" font-family="Jost" font-weight="700" font-size="17" fill="${INK}">36</text>
        <text x="378" y="327" font-family="Jost" font-weight="600" font-size="7" letter-spacing="1.2" fill="${M}">ISO 200</text>
        <rect x="318" y="262" width="16" height="80" rx="4" fill="${INK}"/>
        <rect x="420" y="262" width="12" height="80" rx="4" fill="${INK}"/>
        <rect x="430" y="286" width="10" height="32" rx="2" fill="${S}"/>
        <rect x="330" y="270" width="6" height="64" fill="#1A1410"/>
      </g>
      <g class="drift">
        <circle cx="190" cy="168" r="48" fill="${TD}" opacity=".5" transform="translate(5 7)"/>
        <circle cx="190" cy="168" r="48" fill="${B}"/>
        <circle cx="190" cy="168" r="37" fill="${CR}"/>
        <clipPath id="lens"><circle cx="190" cy="168" r="35"/></clipPath>
        <g clip-path="url(#lens)"><rect x="146" y="132" width="88" height="72" fill="#9DB1B8"/><circle cx="206" cy="152" r="9" fill="${T}"/><path d="M146 204v-22q26-16 46-6t42-6v34z" fill="#6E5A48"/></g>
        <path d="M160 140a37 37 0 0 1 20-9" stroke="${CR}" stroke-width="4" fill="none" stroke-linecap="round" opacity=".8"/>
      </g>`),

    /* No.2 · a disc, spinning slowly */
    plate(`
      <g transform="translate(70 40)">
        <rect width="176" height="176" fill="${S}" transform="translate(5 6)" opacity=".7"/>
        <rect width="176" height="176" fill="${CR}"/>
        <rect x="14" y="14" width="148" height="104" fill="${T}"/>
        <circle cx="122" cy="52" r="16" fill="${P}"/>
        <path d="M14 118V92q34-18 72-6t76-6v38z" fill="${WD}"/>
        <path d="M18 148h70M18 158h46" stroke="${INK}" stroke-width="3"/>
      </g>
      ${inked(`<circle cx="262" cy="214" r="136" fill="${T}" transform="translate(9 10)"/>`)}
      <g class="spin">
        <circle cx="262" cy="214" r="136" fill="${B}"/>
        ${Array.from({length:13},(_,i)=>`<circle cx="262" cy="214" r="${52+i*6.6}" fill="none" stroke="${CR}" stroke-width=".9" stroke-opacity="${.25+(i%3)*.15}" stroke-dasharray="${30+i*7} ${8+i%4*6}" stroke-dashoffset="${i*17}"/>`).join('')}
        <path d="M200 140a96 96 0 0 1 60-24" stroke="${CR}" stroke-width="14" stroke-opacity=".16" fill="none"/>
        <circle cx="262" cy="214" r="44" fill="${S}"/>
        <circle cx="262" cy="214" r="44" fill="none" stroke="${BD}" stroke-width="1.5"/>
        <circle cx="262" cy="214" r="15" fill="${PAPER}"/>
        <text x="236" y="190" font-family="Fraunces" font-style="italic" font-size="16" fill="${INK}" transform="rotate(-14 262 214)">Wedding ’04</text>
      </g>`),

    /* No.3 · a pen drive kept in a box */
    plate(`
      ${inked(`<circle cx="214" cy="186" r="140" fill="${B}"/>`)}
      <g transform="rotate(-9 150 120)">
        <rect x="60" y="50" width="190" height="120" rx="5" fill="${WD}" transform="translate(6 7)" opacity=".55"/>
        <rect x="60" y="50" width="190" height="120" rx="5" fill="${W}"/>
        <path d="M70 72q60-8 120 0t52-4M70 98q70 6 110-2t62 4M70 128q50-6 100 2t72-2M70 152q80 4 120-4t52 2" stroke="${WD}" stroke-width="1.6" fill="none" opacity=".7"/>
        <text x="155" y="118" text-anchor="middle" font-family="Fraunces" font-style="italic" font-size="22" fill="${WD}">Forever</text>
      </g>
      <g class="bob">
        <rect x="150" y="176" width="236" height="150" rx="6" fill="${WD}" transform="translate(7 8)" opacity=".6"/>
        <rect x="150" y="176" width="236" height="150" rx="6" fill="${W}"/>
        <path d="M160 190q70-6 130 2t86-2M160 312q90 6 140-2t76 2" stroke="${WD}" stroke-width="1.6" fill="none" opacity=".7"/>
        <rect x="170" y="196" width="196" height="110" rx="4" fill="#5A2416"/>
        <g transform="translate(206 238)"><g class="plug">
          <rect width="104" height="26" rx="6" fill="${CR}"/><rect class="led" x="88" y="10" width="6" height="6" rx="3" fill="${T}"/>
          <rect x="12" y="7" width="30" height="12" rx="2" fill="${T}"/>
          <rect x="104" y="5" width="26" height="16" rx="1.5" fill="${S}"/>
          <rect x="112" y="10" width="4" height="4" fill="${INK}"/><rect x="120" y="10" width="4" height="4" fill="${INK}"/>
        </g></g>
      </g>`),

    /* No.4 · a folder of loose files, a link on a slip, and the stamp that comes later */
    plate(`
      ${inked(`<circle cx="226" cy="182" r="140" fill="${B}"/>`)}
      <g class="bob">
        <path d="M96 118h70l14 16h170v196H96z" fill="${TD}" opacity=".45" transform="translate(7 8)"/>
        <path d="M96 118h70l14 16h170v196H96z" fill="#C9AE84"/>
        <g>
          <g transform="rotate(-11 160 140)"><rect x="118" y="78" width="96" height="74" fill="${CR}"/><rect x="125" y="85" width="82" height="52" fill="#9DB1B8"/><path d="M125 137v-16q20-12 40-3t42-5v24z" fill="#6E5A48"/></g>
          <g class="shuffle"><g transform="rotate(7 250 120)"><rect x="198" y="64" width="96" height="74" fill="${CR}"/><rect x="205" y="71" width="82" height="52" fill="${T}"/><circle cx="268" cy="88" r="9" fill="${P}"/><path d="M205 123v-14q20-10 40-2t42-4v20z" fill="${WD}"/></g></g>
          <g transform="rotate(-3 300 140)"><rect x="262" y="96" width="84" height="64" fill="${CR}"/><rect x="268" y="102" width="72" height="44" fill="${S}"/><path d="M268 146v-12q18-10 36-3t36-4v19z" fill="${BD}"/></g>
          <g transform="rotate(16 140 170)"><rect x="96" y="128" width="80" height="60" fill="${CR}"/><rect x="102" y="134" width="68" height="40" fill="${P}"/></g>
        </g>
        <path d="M90 164h266l-8 172H98z" fill="#E1CDA6"/>
        <path d="M110 186h96" stroke="${WD}" stroke-width="2" opacity=".6"/>
        <text x="112" y="208" font-family="Courier New,monospace" font-weight="700" font-size="11" fill="${WD}">PHOTOS_ALL (3)</text>
      </g>
      <g transform="rotate(-4 250 300)">
        <rect x="128" y="276" width="262" height="40" fill="${S}" opacity=".7" transform="translate(5 6)"/>
        <rect x="128" y="276" width="262" height="40" fill="${CR}"/>
        <text x="142" y="301" font-family="Courier New,monospace" font-size="12.5" fill="${INK}">share.link/f/8Kq2xZ7Lm…&amp;id=1aX9</text>
        <path d="M142 305h232" stroke="${T}" stroke-width="1.2"/>
        <path d="M120 262v30a8 8 0 0 0 16 0v-34a5 5 0 0 0-10 0v28" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>
      </g>
      <g transform="rotate(-16 318 214)" opacity=".92"><g class="stamp">
        <rect x="252" y="190" width="134" height="46" rx="6" fill="none" stroke="${T}" stroke-width="3.4"/>
        <rect x="258" y="196" width="122" height="34" rx="3" fill="none" stroke="${T}" stroke-width="1.2"/>
        <text x="319" y="221" text-anchor="middle" font-family="Jost" font-weight="700" font-size="21" letter-spacing="3" fill="${T}">EXPIRED</text>
      </g></g>`),

    /* No.5 · the gallery, arriving */
    plate(`
      ${inked(`<circle cx="250" cy="176" r="136" fill="${T}"/>`)}
      ${inked(`<circle cx="122" cy="276" r="62" fill="${B}"/>`)}
      <g class="bob"><g transform="rotate(8 220 200)">
        <rect x="160" y="34" width="132" height="292" rx="22" fill="${TD}" opacity=".5" transform="translate(7 8)"/>
        <rect x="160" y="34" width="132" height="292" rx="22" fill="${INK}"/>
        <rect x="168" y="42" width="116" height="276" rx="16" fill="${CR}"/>
        <path transform="translate(178 56) scale(.026)" d="${N}" fill="${T}"/>
        <rect x="178" y="74" width="96" height="66" fill="${T}"/>
        <circle cx="248" cy="96" r="11" fill="${P}"/>
        <path d="M178 140v-20q22-14 46-4t50-6v30z" fill="${WD}"/>
        <path d="M178 154h56M178 163h34" stroke="${INK}" stroke-width="2.4"/>
        ${Array.from({length:12},(_,i)=>`<rect class="arrive tile" style="animation-delay:${.3+i*.16}s" x="${178+(i%3)*33}" y="${174+Math.floor(i/3)*33}" width="30" height="30" fill="${[P,S,T,'#9DB1B8'][(i*7)%4]}"/>`).join('')}
      </g></g>`)
  ];

  var ERAS = [
    {y:1985, name:'Contact print', meta:'36 EXP.', poem:['Wait','for the','prints'], sw:[T,'#9DB1B8',INK]},
    {y:2004, name:'Compact disc',  meta:'700 MB',  poem:['Burn','sleeve','send'],    sw:[B,T,S]},
    {y:2012, name:'Pen drive',     meta:'16 GB',   poem:['Copy','lend','lose'],      sw:[W,B,CR]},
    {y:2018, name:'Shared link',   meta:'1,288 FILES', poem:['Share','forward','expire'], sw:[B,INK,T]},
    {y:2026, name:'The gallery',   meta:'EVERY FRAME', poem:['Deliver','view','keep'], sw:[T,P,B]}
  ];

  /* ---------- timeline ---------- */
  var POS=[4,26,48,70,94], tl=els.tl, fill=els.fill;
  var marks=ERAS.map(function(e,i){
    var b=document.createElement('button'); b.type='button'; b.style.left=POS[i]+'%';
    if(i<4){ b.className='dot'; b.innerHTML='<i></i><span>'+e.y+'</span>'; }
    else { b.className='mk'; b.innerHTML='<svg viewBox="0 0 368 418"><path d="'+N+'"/></svg><span>'+e.y+'</span>'; }
    b.setAttribute('aria-label','Plate '+(i+1)+', '+e.y);
    b.onclick=function(){ stop(); go(i); };
    tl.appendChild(b); return b;
  });

  var poster=els.poster, art=els.art;
  var el={no:els.no,name:els.name,meta:els.meta,poem:els.poem};
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches, cur=-1, timer=null;

  function fireMark(){ tl.classList.remove('fire'); void tl.offsetWidth; tl.classList.add('fire'); }
  function flash(k){ poster.classList.remove('fire','soft'); void poster.offsetWidth; poster.classList.add(k); }

  /* No.5: once the tiles have arrived, they keep changing — new frames landing, others viewed */
  var tileTimer=null, TILE=[P,S,T,'#9DB1B8','#E8C9A8',BD,'#C79E74'];
  function stopTiles(){ clearInterval(tileTimer); tileTimer=null; }
  function startTiles(){
    stopTiles(); if(reduce) return;
    setTimeout(function(){
      if(cur!==4) return;
      tileTimer=setInterval(function(){
        var t=[].slice.call(art.querySelectorAll('.tile')); if(!t.length) return;
        if(Math.random()<.35){                       // rearrange: two frames swap places
          var a=t[Math.floor(Math.random()*t.length)], b=t[Math.floor(Math.random()*t.length)];
          var fa=a.getAttribute('fill'); a.setAttribute('fill',b.getAttribute('fill')); b.setAttribute('fill',fa);
        } else {                                     // recolour: a new frame lands
          var x=t[Math.floor(Math.random()*t.length)], c;
          do{ c=TILE[Math.floor(Math.random()*TILE.length)]; }while(c===x.getAttribute('fill'));
          x.setAttribute('fill',c);
        }
      },650);
    },2400);
  }

  function go(i){
    if(i===cur) return;
    stopTiles();
    var first=cur<0;
    poster.classList.add('out');
    setTimeout(function(){
      cur=i; var e=ERAS[i];
      art.innerHTML=ART[i];
      el.no.textContent=e.y; el.name.textContent=e.name; el.meta.textContent=e.meta;
      el.poem.innerHTML=e.poem.join('<br>');
      fill.style.transition=reduce?'none':'width 1s cubic-bezier(.4,0,.2,1)'; fill.style.width=(tl.clientWidth*POS[i]/100)+'px';
      marks.forEach(function(m,k){ m.classList.toggle('done',k<=i); m.classList.toggle('on',k===i); });
      marks[4].classList.toggle('lit',i===4);
      poster.classList.remove('out');
      if(i===4){ startTiles(); if(!reduce) setTimeout(function(){ fireMark(); flash('soft'); },700); }
    }, first?0:560);
  }

  var DWELL=3000;
  function stop(){ clearTimeout(timer); timer=null; }
  function play(){ stop(); cur=-1; fill.style.transition='none'; fill.style.width='0px'; go(0); var k=0;
    (function next(){ if(k>=4) return; timer=setTimeout(function(){ k++; go(k); next(); }, DWELL); })(); }
  reduce ? go(4) : play();
  marks[4].addEventListener('pointerenter',function(ev){ if(ev.pointerType==='mouse' && cur===4){ fireMark(); } });

  
  function destroy() {
    stop();
    stopTiles();
    marks.forEach(function (m) { m.remove(); });
  }
  function playEntry() {
    stop();
    function show() {
      flash('fire');
      fireMark();
      setTimeout(function () {
        el.meta.textContent = 'SINCE YOUR LAST VISIT';
        el.poem.innerHTML = '38 views<br>2 approved<br>14 saved';
      }, 160);
    }
    if (cur !== 4) {
      go(4);
      setTimeout(show, 1000);
    } else show();
  }
  return { destroy: destroy, replay: play, playEntry: playEntry };
}
