// Extended icons for screens/* — adds Lucide-style auth/state icons
// to the existing window.Icon (defined in ui_kits/mobile/Icons.jsx).
// Each entry: [path-strokes] and optional E (extra fixed elements).
window.AuthIcon = function AuthIcon({ name, size = 22, color = "currentColor", stroke = 1.75 }) {
  const D = {
    mail: ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z","M22 6l-10 7L2 6"],
    lock: ["M5 11h14v10H5z","M8 11V7a4 4 0 1 1 8 0v4"],
    eye:  ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"],
    "eye-off": ["M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94","M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19","M1 1l22 22","M14.12 14.12a3 3 0 1 1-4.24-4.24"],
    user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"],
    phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"],
    building: ["M3 21h18","M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16","M9 9h.01","M15 9h.01","M9 13h.01","M15 13h.01","M9 17h.01","M15 17h.01"],
    "arrow-right": ["M5 12h14","M12 5l7 7-7 7"],
    "arrow-left": ["M19 12H5","M12 19l-7-7 7-7"],
    back: ["M19 12H5","M12 19l-7-7 7-7"],
    "chev-right": ["M9 6l6 6-6 6"],
    "chev-down": ["M6 9l6 6 6-6"],
    check: ["M20 6 9 17l-5-5"],
    "check-circle": ["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4 12 14.01l-3-3"],
    x: ["M18 6 6 18","M6 6l12 12"],
    "alert-circle": ["M12 8v4","M12 16h.01"],
    "alert-triangle": ["M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"],
    info: ["M12 16v-4","M12 8h.01"],
    "wifi-off": ["M1 1l22 22","M16.72 11.06A10.94 10.94 0 0 1 19 12.55","M5 12.55a10.94 10.94 0 0 1 5.17-2.39","M10.71 5.05A16 16 0 0 1 22.58 9","M1.42 9a15.91 15.91 0 0 1 4.7-2.88","M8.53 16.11a6 6 0 0 1 6.95 0","M12 20h.01"],
    shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
    sparkles: ["M12 3v4","M12 17v4","M5 12H1","M23 12h-4","M5.6 5.6l2.8 2.8","M15.6 15.6l2.8 2.8","M5.6 18.4l2.8-2.8","M15.6 8.4l2.8-2.8"],
    crown: ["M2 20h20","M5 20l-2-8 5 3 4-7 4 7 5-3-2 8"],
    plus: ["M12 5v14","M5 12h14"],
    cam: ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"],
    upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M17 8l-5-5-5 5","M12 3v12"],
    image: ["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z","M21 15l-5-5L5 21"],
    file: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z","M14 3v5h5"],
    download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
    refresh: ["M23 4v6h-6","M1 20v-6h6","M3.51 9a9 9 0 0 1 14.85-3.36L23 10","M1 14l4.64 4.36A9 9 0 0 0 20.49 15"],
    search: ["M21 21l-4.3-4.3"],
    pen: ["M12 20h9","M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"],
    trash: ["M3 6h18","M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2","M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"],
    map: ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"],
    star: ["M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"],
    cal: ["M3 10h18","M8 3v4","M16 3v4"],
    clock: ["M12 6v6l4 2"],
    msg: ["M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"],
    whatsapp: ["M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9z","M8 13.5a4 4 0 0 0 4 3 4 4 0 0 0 3-1.5"],
    pdf: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z","M14 3v5h5"],
    bolt: ["M13 2L3 14h9l-1 8 10-12h-9z"],
    "credit-card": ["M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z","M2 11h20"],
    "more": ["M5 12h.01","M12 12h.01","M19 12h.01"],
    fingerprint: ["M12 4a8 8 0 0 0-8 8v2","M20 14v-2a8 8 0 0 0-3-6.21","M9 21c-2-3-2-6-2-9a5 5 0 0 1 10 0","M12 11v5","M8 21c-1-2-1-4-1-6","M16 21c1-2 1-4 1-6"],
    package: ["M21 16V8l-9-5-9 5v8l9 5z","M3.3 7 12 12l8.7-5","M12 22V12"],
    settings: ["M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
    signature: ["M3 17c2 0 4-3 4-6s-1-5-2-5-1 3 0 7 4 6 7 6 5-3 5-3","M14 17h6"],
    "rotate-phone": ["M5 6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z","M19 8v6"],
  };
  const E = {
    user: <circle cx="12" cy="7" r="4"/>,
    eye: <circle cx="12" cy="12" r="3"/>,
    cam: <circle cx="12" cy="13" r="4"/>,
    cal: <rect x="3" y="5" width="18" height="16" rx="2"/>,
    search: <circle cx="11" cy="11" r="7"/>,
    star: null,
    map: <circle cx="12" cy="10" r="3"/>,
    info: <circle cx="12" cy="12" r="10"/>,
    "alert-circle": <circle cx="12" cy="12" r="10"/>,
    clock: <circle cx="12" cy="12" r="10"/>,
    sparkles: null,
    shield: null,
    crown: null,
    fingerprint: null,
  };
  return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round">
    {E[name] || null}
    {(D[name] || []).map((d, i) => <path key={i} d={d} />)}
  </svg>);
};

// Brand mark used inside the dark logo tile (white outline glyph)
window.OrcivoGlyph = function OrcivoGlyph({ size = 28, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M16 4 L26 10 L26 22 L16 28 L6 22 L6 10 Z" stroke={color} strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M16 12 L20 14 L20 18 L16 20 L12 18 L12 14 Z" fill={color}/>
    </svg>
  );
};
