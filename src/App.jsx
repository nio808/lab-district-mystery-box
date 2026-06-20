import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

const THEMES = {
  midnight: { label: 'Sapphire', swatch: '#54c8ff',
    bg: '#080d1c', panel: '#0f1830', border: '#243456', accent: '#54c8ff',
    win: '#ffd34d', winGlow: 'rgba(255,211,77,.5)', tile: '#16233f', tileEdge: '#2e4a7d',
    empty: '#212a3a', emptyEdge: '#374359', text: '#eef4ff', muted: '#8597c0' },
  amethyst: { label: 'Amethyst', swatch: '#b98bff',
    bg: '#120a24', panel: '#1e1140', border: '#392463', accent: '#b98bff',
    win: '#ffd76a', winGlow: 'rgba(255,215,106,.5)', tile: '#271650', tileEdge: '#46307f',
    empty: '#282340', emptyEdge: '#3f395d', text: '#f3ecff', muted: '#a796cb' },
  emerald: { label: 'Emerald', swatch: '#37e0a4',
    bg: '#04140e', panel: '#0a2419', border: '#1c4a35', accent: '#37e0a4',
    win: '#f4d06a', winGlow: 'rgba(244,208,106,.5)', tile: '#0e3324', tileEdge: '#1f6044',
    empty: '#222f29', emptyEdge: '#36473e', text: '#e9fff5', muted: '#88b6a2' },
  rose: { label: 'Ruby', swatch: '#ff8fbf',
    bg: '#1a0a12', panel: '#2e1320', border: '#54293a', accent: '#ff8fbf',
    win: '#ffdf9e', winGlow: 'rgba(255,223,158,.5)', tile: '#3d1c2a', tileEdge: '#6a3146',
    empty: '#342630', emptyEdge: '#4d3a44', text: '#ffeef5', muted: '#d29db1' }
};

const COLS = { 25: 5, 50: 10, 100: 10, 200: 20, 500: 25 };

const DEFAULT_ITEMS = [
  { name: '2.07ct Radiant Diamond', value: '$6,350' },
  { name: '3.02ct Cushion Diamond', value: '$9,250' },
  { name: '1.07ct Emerald Cut Diamond', value: '$3,450' },
  { name: '2.4ct Colombian Emerald', value: '$2,100' },
  { name: '1.8ct Ceylon Sapphire', value: '$1,650' },
  { name: '3.1ct Burma Ruby', value: '$2,800' },
  { name: '0.9ct Pink Diamond', value: '$7,900' },
  { name: 'Mystery Bonus Prize', value: '$500' }
];

function makeTiles(size, roster) {
  const idx = Array.from({ length: size }, (_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const placed = {};
  roster.slice(0, size).forEach((it, k) => { placed[idx[k]] = it; });
  return Array.from({ length: size }, (_, i) => ({ n: i + 1, item: placed[i] || null, revealed: false }));
}

function useAudio(soundOn) {
  const acRef = useRef(null);

  const ac = useCallback(() => {
    if (!acRef.current) {
      const C = window.AudioContext || window.webkitAudioContext;
      acRef.current = new C();
    }
    if (acRef.current.state === 'suspended') acRef.current.resume();
    return acRef.current;
  }, []);

  const tone = useCallback((freq, t0, dur, type = 'sine', peak = 0.2) => {
    const audio = ac();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g);
    g.connect(audio.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  }, [ac]);

  const playClick = useCallback(() => {
    if (!soundOn) return;
    const audio = ac();
    const t = audio.currentTime;
    const o = tone(640, t, 0.07, 'triangle', 0.14);
    o.frequency.exponentialRampToValueAtTime(220, t + 0.07);
  }, [soundOn, ac, tone]);

  const playWin = useCallback(() => {
    if (!soundOn) return;
    const audio = ac();
    const t = audio.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.09, 0.42, 'sine', 0.2));
    tone(1567.98, t + 0.34, 0.5, 'triangle', 0.12);
  }, [soundOn, ac, tone]);

  const playThud = useCallback(() => {
    if (!soundOn) return;
    const audio = ac();
    const t = audio.currentTime;
    const o = tone(150, t, 0.2, 'sine', 0.22);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.2);
  }, [soundOn, ac, tone]);

  return { playClick, playWin, playThud };
}

function Confetti({ burst }) {
  if (!burst) return null;
  return (
    <div key={burst.id} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 62, overflow: 'hidden' }}>
      {burst.parts.map(p => (
        <div key={p.i} style={{
          position: 'absolute', left: p.x + '%', top: p.y + '%',
          width: p.w + 'px', height: p.h + 'px',
          background: p.color, borderRadius: '1px', opacity: 1,
          '--dx': p.dx + 'px', '--dy': p.dy + 'px', '--rot': p.rot + 'deg',
          animation: `tld-confDrop ${p.dur}ms cubic-bezier(.15,.55,.3,1) ${p.delay}ms forwards`
        }} />
      ))}
    </div>
  );
}

export default function App() {
  const [themeKey, setThemeKey] = useState('midnight');
  const [size, setSize] = useState(25);
  const [roster, setRoster] = useState(() => DEFAULT_ITEMS.map(x => ({ ...x })));
  const [tiles, setTiles] = useState(() => makeTiles(25, DEFAULT_ITEMS));
  const [showValues, setShowValues] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [banner, setBanner] = useState(null);
  const [burst, setBurst] = useState(null);
  const [toast, setToast] = useState(null);
  const [lastWinner, setLastWinner] = useState('—');
  const [fitView, setFitView] = useState(true);
  const [fitH, setFitH] = useState(null);
  const [draftName, setDraftName] = useState('');
  const [draftValue, setDraftValue] = useState('');

  const gridRef = useRef(null);
  const bannerTimer = useRef(null);
  const confettiTimer = useRef(null);
  const toastTimer = useRef(null);

  const { playClick, playWin, playThud } = useAudio(soundOn);
  const t = THEMES[themeKey] || THEMES.midnight;
  const cols = COLS[size];
  const rows = Math.ceil(size / cols);

  useEffect(() => {
    const onResize = () => { if (fitView) setFitH(null); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [fitView]);

  useEffect(() => {
    if (fitView && gridRef.current) {
      const avail = window.innerHeight - gridRef.current.getBoundingClientRect().top - 92;
      if (avail > 120 && (fitH == null || Math.abs(fitH - avail) > 2)) setFitH(avail);
    }
  });

  useEffect(() => () => {
    clearTimeout(bannerTimer.current);
    clearTimeout(confettiTimer.current);
    clearTimeout(toastTimer.current);
  }, []);

  const flashToast = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }, []);

  const spawnBurst = useCallback(() => {
    const colors = ['var(--win)', 'var(--accent)', '#ffffff', '#ff7eb3', '#7ad8ff', '#c9a8ff'];
    const parts = [];
    for (let i = 0; i < 44; i++) {
      parts.push({ i, x: 44 + Math.random() * 12, y: 42, w: 6 + Math.random() * 7, h: 6 + Math.random() * 7, color: colors[i % colors.length], dx: (Math.random() - 0.5) * 680, dy: 40 + Math.random() * 560, rot: (Math.random() - 0.5) * 1000, delay: Math.random() * 130, dur: 1100 + Math.random() * 1000 });
    }
    for (let i = 0; i < 50; i++) {
      const st = i % 4 === 0;
      parts.push({ i: 200 + i, x: Math.random() * 100, y: -6, w: st ? 3 : 5 + Math.random() * 6, h: st ? 16 + Math.random() * 16 : 5 + Math.random() * 6, color: colors[i % colors.length], dx: (Math.random() - 0.5) * 190, dy: 580 + Math.random() * 400, rot: (Math.random() - 0.5) * 760, delay: Math.random() * 580, dur: 1700 + Math.random() * 1100 });
    }
    const id = Date.now();
    setBurst({ id, parts });
    clearTimeout(confettiTimer.current);
    confettiTimer.current = setTimeout(() => setBurst(null), 3000);
  }, []);

  const closeBanner = useCallback(() => {
    clearTimeout(bannerTimer.current);
    setBanner(null);
  }, []);

  const armBanner = useCallback(() => {
    clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setBanner(null), 3400);
  }, []);

  const reveal = useCallback((n) => {
    setTiles(prev => {
      const tile = prev.find(tl => tl.n === n);
      if (!tile || tile.revealed) return prev;

      if (tile.item) {
        playWin();
        setLastWinner(tile.item.name + '  ' + tile.item.value);
        setBanner({ win: true, kicker: 'WINNER!', title: tile.item.name, value: tile.item.value, sub: 'Item claimed — congrats to the winner!' });
        spawnBurst();
      } else {
        playThud();
        setBanner({ win: false, kicker: 'SO CLOSE', title: 'Try Again', value: '', sub: 'No gem in this one — pick another tile!' });
      }
      armBanner();

      return prev.map(tl => tl.n === n ? { ...tl, revealed: true } : tl);
    });
  }, [playWin, playThud, spawnBurst, armBanner]);

  const shuffle = useCallback(() => {
    playClick();
    setTiles(makeTiles(size, roster));
    setBanner(null);
    flashToast('Board Shuffled — Let\u2019s Play!');
  }, [playClick, size, roster, flashToast]);

  const reset = useCallback(() => {
    setTiles(prev => prev.map(tl => ({ ...tl, revealed: false })));
    setBanner(null);
    setLastWinner('—');
    flashToast('Board Reset — Ready!');
  }, [flashToast]);

  const setBoardSize = useCallback((n) => {
    setSize(n);
    setTiles(makeTiles(n, roster));
    setBanner(null);
  }, [roster]);

  const addItem = useCallback(() => {
    const name = draftName.trim();
    if (!name) return;
    let value = draftValue.trim();
    if (value && !/^\$/.test(value)) value = '$' + value;
    const item = { name, value: value || '' };

    setRoster(prev => [...prev, item]);
    setTiles(prev => {
      const empties = prev.map((tl, i) => (!tl.item && !tl.revealed) ? i : -1).filter(i => i >= 0);
      if (!empties.length) return prev;
      const pick = empties[Math.floor(Math.random() * empties.length)];
      return prev.map((tl, i) => i === pick ? { ...tl, item } : tl);
    });
    setDraftName('');
    setDraftValue('');
  }, [draftName, draftValue]);

  const removeItem = useCallback((idx) => {
    setRoster(prev => {
      const target = prev[idx];
      setTiles(tls => tls.map(tl => tl.item === target ? { ...tl, item: null } : tl));
      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const toggleFit = useCallback(() => {
    setFitView(f => {
      if (f) setAdminOpen(false);
      return !f;
    });
    setFitH(null);
  }, []);

  const placed = tiles.filter(tl => tl.item).length;
  const claimed = tiles.filter(tl => tl.revealed && tl.item).length;
  const revealedCount = tiles.filter(tl => tl.revealed).length;
  const pct = size ? Math.round(revealedCount / size * 100) : 0;

  const numSize = cols <= 5 ? 'clamp(16px,2.4vw,30px)' : cols <= 10 ? 'clamp(11px,1.5vw,18px)' : cols <= 20 ? '10px' : '7px';
  const titleSize = cols <= 5 ? '13px' : cols <= 10 ? '10px' : '7px';
  const valSize = cols <= 5 ? '15px' : cols <= 10 ? '11px' : '8px';
  const gap = cols > 20 ? '4px' : cols > 10 ? '5px' : '7px';
  const radius = cols > 20 ? '5px' : '9px';

  const faceBase = {
    position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', borderRadius: radius,
    backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
    overflow: 'hidden', boxSizing: 'border-box', padding: '4px'
  };

  const btnBase = {
    display: 'inline-flex', alignItems: 'center', gap: '7px',
    padding: '9px 15px', borderRadius: '11px', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: '13px', fontWeight: 700,
    border: '1px solid var(--border)'
  };

  const sparkles = useMemo(() =>
    Array.from({ length: 16 }, (_, i) => {
      const sd = (i * 37) % 100;
      const top = (i * 53) % 100;
      const sz = 1 + (i % 3);
      return {
        key: i,
        style: {
          position: 'absolute', left: sd + '%', top: top + '%',
          width: sz + 'px', height: sz + 'px', borderRadius: '50%',
          background: i % 4 === 0 ? t.win : t.accent,
          animation: `tld-twinkle ${2.4 + (i % 5) * 0.6}s ease-in-out ${i * 0.3}s infinite`
        }
      };
    }), [t.win, t.accent]);

  const rootStyle = {
    '--bg': t.bg, '--panel': t.panel, '--border': t.border, '--accent': t.accent,
    '--win': t.win, '--winGlow': t.winGlow, '--tile': t.tile, '--tileEdge': t.tileEdge,
    '--empty': t.empty, '--emptyEdge': t.emptyEdge, '--text': t.text, '--muted': t.muted,
    minHeight: '100dvh', width: '100%',
    background: `radial-gradient(1200px 620px at 50% -8%, ${t.panel}, ${t.bg} 62%)`,
    color: t.text, fontFamily: "'DM Sans', sans-serif", position: 'relative', overflowX: 'hidden'
  };

  return (
    <div style={rootStyle}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}>
        {sparkles.map(s => <div key={s.key} style={s.style} />)}
      </div>

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'radial-gradient(135% 100% at 50% -6%, transparent 52%, rgba(0,0,0,.5))' }} />

      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,.06)', zIndex: 40 }}>
        <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,var(--accent),var(--win))', transition: 'width .5s ease', boxShadow: '0 0 12px var(--winGlow)' }} />
      </div>

      <div className="tld-main" style={{ position: 'relative', zIndex: 10, maxWidth: '1320px', margin: '0 auto', padding: '26px 20px 80px' }}>
        <header className="tld-header">
          <div className="tld-brand-row">
            <div style={{ width: 50, height: 50, borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(150deg,var(--panel),var(--bg))', border: '1px solid var(--border)', boxShadow: '0 0 18px rgba(0,0,0,.4)' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M5 3h14l3 5-10 13L2 8z" fill="var(--accent)" opacity=".25" />
                <path d="M5 3h14l3 5-10 13L2 8z" stroke="var(--accent)" strokeWidth="1.3" strokeLinejoin="round" />
                <path d="M2 8h20M9 3 7 8l5 13M15 3l2 5-5 13M7 8l5 0 5 0" stroke="var(--accent)" strokeWidth="1" strokeLinejoin="round" opacity=".7" />
              </svg>
            </div>
            <div>
              <div className="tld-brand-title" style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 24, letterSpacing: '.04em', lineHeight: 1, color: 'var(--text)' }}>THE LAB DISTRICT</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 5, letterSpacing: '.02em' }}>MEGA PRIZES · Click a tile to reveal your item</div>
            </div>
          </div>
          <div className="tld-header-actions">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'var(--panel)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--win)', boxShadow: '0 0 8px var(--winGlow)' }} />
              <span style={{ color: 'var(--win)' }}>{Math.max(0, placed - claimed)}</span>
              <span style={{ color: 'var(--muted)' }}>left to claim</span>
            </div>
            <button type="button" onClick={() => setSoundOn(s => !s)} style={{ ...btnBase, padding: '9px 12px', background: 'var(--panel)', color: 'var(--text)' }} title="Toggle sound" aria-label={soundOn ? 'Mute sound' : 'Enable sound'}>
              {soundOn ? <span>🔊</span> : <span style={{ opacity: 0.5 }}>🔇</span>}
            </button>
            <button type="button" onClick={toggleFit} style={{ ...btnBase, padding: '9px 13px', background: fitView ? 'var(--accent)' : 'var(--panel)', color: fitView ? '#06121d' : 'var(--text)' }} title="Fit the whole board in one view">
              <span style={{ fontSize: 15 }}>⛶</span> {fitView ? 'Exit Fit' : 'Fit Board'}
            </button>
            <button type="button" onClick={() => setAdminOpen(s => !s)} style={{ ...btnBase, background: adminOpen ? 'var(--accent)' : 'var(--panel)', color: adminOpen ? '#06121d' : 'var(--text)' }}>
              <span style={{ fontSize: 15 }}>⚙</span> Host Controls
            </button>
          </div>
        </header>

        <div className="tld-stats">
          {[
            ['TOTAL ITEMS', roster.length, 'var(--text)'],
            ['CLAIMED', claimed, 'var(--accent)'],
            ['REMAINING', Math.max(0, placed - claimed), 'var(--text)'],
            ['LAST WINNER', lastWinner, 'var(--win)', true]
          ].map(([label, value, color, isWinner]) => (
            <div key={label} className="tld-stat-card" style={{ padding: '15px 18px', borderRadius: 14, background: label === 'LAST WINNER' ? 'linear-gradient(140deg,var(--panel),var(--bg))' : 'var(--panel)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, letterSpacing: '.12em', color: 'var(--muted)', fontWeight: 600 }}>{label}</div>
              <div className="tld-stat-value" style={{
                fontFamily: isWinner ? 'inherit' : "'Playfair Display',serif",
                fontWeight: isWinner ? 700 : 800,
                fontSize: isWinner ? 15 : 30,
                marginTop: isWinner ? 7 : 4,
                color,
                whiteSpace: isWinner ? 'nowrap' : undefined,
                overflow: isWinner ? 'hidden' : undefined,
                textOverflow: isWinner ? 'ellipsis' : undefined
              }}>{value}</div>
            </div>
          ))}
        </div>

        {adminOpen && (
          <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 18, padding: 20, marginBottom: 20, boxShadow: '0 18px 50px rgba(0,0,0,.35)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
              <div style={{ flex: '1 1 280px', minWidth: 260 }}>
                <div style={{ fontSize: 12, letterSpacing: '.1em', color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>ADD AN ITEM</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input value={draftName} onChange={e => setDraftName(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="Item name (e.g. 2.07ct Radiant Diamond)" style={{ flex: '1 1 160px', minWidth: 140, padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                  <input value={draftValue} onChange={e => setDraftValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && addItem()} placeholder="$ value" style={{ width: 96, padding: '11px 13px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
                  <button type="button" onClick={addItem} style={{ padding: '11px 16px', borderRadius: 10, border: 'none', background: 'var(--accent)', color: '#06121d', fontWeight: 700, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>Add</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 12, maxHeight: 96, overflow: 'auto' }}>
                  {roster.map((it, i) => (
                    <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 999, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 12 }}>
                      <span style={{ color: 'var(--text)' }}>{it.name}</span>
                      <span style={{ color: 'var(--win)', fontWeight: 600 }}>{it.value}</span>
                      <button type="button" onClick={() => removeItem(i)} style={{ cursor: 'pointer', color: 'var(--muted)', fontWeight: 700, background: 'none', border: 'none', padding: 0, fontSize: 14, lineHeight: 1 }} aria-label={`Remove ${it.name}`}>&times;</button>
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ flex: '0 0 auto' }}>
                <div style={{ fontSize: 12, letterSpacing: '.1em', color: 'var(--muted)', fontWeight: 700, marginBottom: 10 }}>BOARD SIZE</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[25, 50, 100, 200, 500].map(n => (
                    <button key={n} type="button" onClick={() => setBoardSize(n)} style={{ padding: '9px 12px', borderRadius: 9, border: '1px solid var(--border)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, background: n === size ? 'var(--accent)' : 'transparent', color: n === size ? '#06121d' : 'var(--text)' }}>{n}</button>
                  ))}
                </div>
                <div style={{ fontSize: 12, letterSpacing: '.1em', color: 'var(--muted)', fontWeight: 700, margin: '16px 0 10px' }}>THEME</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {Object.entries(THEMES).map(([k, th]) => (
                    <button key={k} type="button" onClick={() => setThemeKey(k)} title={th.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, background: k === themeKey ? 'var(--bg)' : 'transparent', border: k === themeKey ? '1px solid var(--accent)' : '1px solid var(--border)', color: 'var(--text)' }}>
                      <span style={{ width: 12, height: 12, borderRadius: '50%', background: th.swatch, boxShadow: '0 0 6px ' + th.swatch }} />{th.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ flex: '0 0 auto', display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'flex-start' }}>
                <div style={{ fontSize: 12, letterSpacing: '.1em', color: 'var(--muted)', fontWeight: 700 }}>ACTIONS</div>
                <button type="button" onClick={shuffle} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', borderRadius: 11, border: 'none', background: 'linear-gradient(135deg,var(--win),#ffdf7e)', color: '#2c2100', fontWeight: 700, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer', boxShadow: '0 8px 22px var(--winGlow)' }}>🎲 Randomize &amp; Shuffle</button>
                <button type="button" onClick={reset} style={{ padding: '11px 18px', borderRadius: 11, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 600, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer' }}>↺ Reset Board</button>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4, fontSize: 13, color: 'var(--text)' }}>
                  <span onClick={() => setShowValues(s => !s)} role="switch" aria-checked={showValues} tabIndex={0} onKeyDown={e => (e.key === ' ' || e.key === 'Enter') && setShowValues(s => !s)} style={{ width: 40, height: 22, borderRadius: 999, background: showValues ? 'var(--accent)' : 'var(--border)', position: 'relative', flex: '0 0 auto', transition: 'background .2s', cursor: 'pointer' }}>
                    <span style={{ position: 'absolute', top: 2, left: showValues ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.4)' }} />
                  </span>
                  Show values before reveal
                </label>
              </div>
            </div>
          </div>
        )}

        <div ref={gridRef} style={fitView
          ? { display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gridTemplateRows: `repeat(${rows},1fr)`, gap, height: fitH ? fitH + 'px' : '68vh', maxWidth: '100%' }
          : { display: 'grid', gridTemplateColumns: `repeat(${cols},1fr)`, gap, maxWidth: '100%' }
        }>
          {tiles.map(tl => {
            const won = tl.revealed && !!tl.item;
            const anim = won ? 'tld-flip .5s ease, tld-pulse 1.8s ease-in-out .5s infinite' : (tl.revealed ? 'tld-flip .5s ease' : 'none');
            const faceSwap = { transition: 'opacity 0s linear .25s' };
            return (
              <div
                key={tl.n}
                role="button"
                tabIndex={tl.revealed ? -1 : 0}
                onClick={() => !tl.revealed && reveal(tl.n)}
                onKeyDown={e => !tl.revealed && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), reveal(tl.n))}
                title={tl.revealed ? undefined : 'Click to reveal'}
                aria-label={tl.revealed ? `Tile ${tl.n} revealed` : `Reveal tile ${tl.n}`}
                style={{
                  position: 'relative', cursor: tl.revealed ? 'default' : 'pointer',
                  ...(fitView ? { minHeight: 0, minWidth: 0 } : { aspectRatio: '.8' }),
                  transition: 'transform .18s ease, filter .18s ease'
                }}
                onMouseEnter={e => { if (!tl.revealed) { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.filter = 'brightness(1.12)'; e.currentTarget.style.zIndex = '5'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.filter = ''; e.currentTarget.style.zIndex = ''; }}
              >
                <div style={{ position: 'relative', width: '100%', height: '100%', animation: anim, borderRadius: radius }}>
                  <div style={{ ...faceBase, ...faceSwap, opacity: tl.revealed ? 0 : 1, background: 'linear-gradient(160deg, var(--tileEdge), var(--tile))', border: '1px solid var(--tileEdge)', color: 'var(--text)', fontSize: numSize, fontWeight: 700, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07)' }}>
                    <span style={{ position: 'absolute', inset: 0, overflow: 'hidden', borderRadius: radius, pointerEvents: 'none' }}>
                      <span style={{ position: 'absolute', top: 0, left: 0, width: '46%', height: '100%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.16), transparent)', transform: 'translateX(-130%)' }} />
                    </span>
                    <span style={{ position: 'relative', zIndex: 1 }}>{tl.n}</span>
                    {showValues && tl.item && !tl.revealed && (
                      <span style={{ position: 'absolute', bottom: 4, left: 4, right: 4, textAlign: 'center', fontSize: 8, fontWeight: 700, color: 'var(--win)', zIndex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tl.item.value}</span>
                    )}
                  </div>
                  <div style={{ ...faceBase, ...faceSwap, opacity: tl.revealed ? 1 : 0, background: won ? 'linear-gradient(150deg,#fff0bf,var(--win))' : 'var(--empty)', border: won ? '1px solid #fff6d6' : '1px solid var(--emptyEdge)', color: won ? '#3a2a05' : 'var(--text)', boxShadow: won ? 'inset 0 0 14px rgba(255,255,255,.45)' : 'none' }}>
                    <span style={{ fontSize: titleSize, fontWeight: 700, textAlign: 'center', lineHeight: 1.15, padding: '0 2px', maxWidth: '100%', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{tl.item ? tl.item.name : 'Try Again'}</span>
                    {tl.item && (
                      <span style={{ fontSize: valSize, fontWeight: 800, marginTop: 2, fontFamily: "'Playfair Display',serif", opacity: won ? 1 : 0.6 }}>{tl.item.value}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 55, animation: 'tld-toastIn .35s ease', padding: '13px 24px', borderRadius: 999, background: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 700, fontSize: 14, boxShadow: '0 14px 40px rgba(0,0,0,.4)' }} role="status">{toast}</div>
      )}

      {banner && (
        <div onClick={closeBanner} style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,8,18,.62)', backdropFilter: 'blur(4px)', padding: 24 }} role="dialog" aria-modal="true">
          {banner.win && (
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 45%, var(--winGlow), transparent 62%)', animation: 'tld-flash .85s ease-out forwards' }} />
          )}
          <div onClick={e => e.stopPropagation()} style={{
            position: 'relative', overflow: 'visible', textAlign: 'center', maxWidth: 470, width: '100%',
            padding: '40px 36px', borderRadius: 24, animation: 'tld-bannerPop .5s cubic-bezier(.2,.9,.3,1.2)',
            background: banner.win ? 'linear-gradient(160deg,#fff6da,var(--win))' : 'var(--panel)',
            color: banner.win ? '#3a2a05' : 'var(--text)',
            border: banner.win ? '2px solid #fff' : '1px solid var(--border)',
            boxShadow: banner.win ? '0 24px 80px var(--winGlow)' : '0 24px 70px rgba(0,0,0,.5)'
          }}>
            {banner.win && (
              <span style={{ position: 'absolute', inset: -26, borderRadius: 34, background: 'radial-gradient(circle, var(--winGlow), transparent 70%)', filter: 'blur(16px)', animation: 'tld-ring 1.8s ease-in-out infinite', zIndex: 0, pointerEvents: 'none' }} />
            )}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={banner.win
                ? { fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 56, letterSpacing: '.02em', lineHeight: 1, background: 'linear-gradient(100deg,#9a7400 0%,#5a4205 32%,#fff7d6 50%,#5a4205 68%,#9a7400 100%)', backgroundSize: '220% 100%', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent', color: 'transparent', animation: 'tld-shine 1.9s linear infinite' }
                : { fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 13, letterSpacing: '.22em', opacity: 0.85 }
              }>{banner.kicker}</div>
              <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: banner.win ? 24 : 40, marginTop: banner.win ? 8 : 10, lineHeight: 1.12 }}>{banner.title}</div>
              {banner.value && (
                <div style={{ fontFamily: "'Playfair Display',serif", fontWeight: 900, fontSize: 46, marginTop: 6, lineHeight: 1 }}>{banner.value}</div>
              )}
              <div style={{ marginTop: 14, fontSize: 14, opacity: 0.82 }}>{banner.sub}</div>
              <button type="button" onClick={closeBanner} style={{ marginTop: 20, padding: '11px 26px', borderRadius: 11, border: 'none', background: 'rgba(0,0,0,.18)', color: 'inherit', fontWeight: 700, fontFamily: 'inherit', fontSize: 14, cursor: 'pointer' }}>Continue</button>
            </div>
          </div>
        </div>
      )}

      <Confetti burst={burst} />
    </div>
  );
}
