// Tiny Lucide-style icon library, only what the kit uses.
window.Icon = function Icon({ name, size = 18, stroke = 1.75, color = "currentColor", style = {} }) {
  const P = {
    home: "M3 9.5 12 3l9 6.5 M5 9v11h14V9",
    users: "M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2 M22 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5 M9 13h6 M9 17h6",
    clip: "M9 12h.01 M9 16h.01 M13 12h4 M13 16h4 M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2",
    cal: "M3 10h18 M8 3v4 M16 3v4",
    money: "M12 2v20 M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
    pkg: "M21 16V8l-9-5-9 5v8l9 5z M3.3 7 12 12l8.7-5 M12 22V12",
    cog: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
    search: "M21 21l-4.3-4.3",
    plus: "M12 5v14 M5 12h14",
    chev: "M9 6l6 6-6 6",
    bell: "M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9 M13.73 21a2 2 0 0 1-3.46 0",
    check: "M22 4 12 14.01l-3-3 M22 11.08V12a10 10 0 1 1-5.93-9.14",
    alert: "M12 8v4 M12 16h.01",
    x: "M15 9l-6 6 M9 9l6 6",
    lock: "M7 11V7a5 5 0 0 1 10 0v4",
    dots: "M12 5v.01 M12 12v.01 M12 19v.01",
    pdf: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z M14 3v5h5",
    share: "M3 12v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M16 6l-4-4-4 4 M12 2v13",
    cam: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z",
    filter: "M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
    msg: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z",
    phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
    info: "M12 16v-4 M12 8h.01",
    building: "M3 21h18 M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16 M9 9h.01 M15 9h.01 M9 13h.01 M15 13h.01 M9 17h.01 M15 17h.01",
    image: "M21 15l-5-5L5 21 M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  };
  const C = {
    home: null, users: <circle cx="9" cy="7" r="4" />,
    file: null, clip: <rect x="8" y="3" width="8" height="4" rx="1" />,
    cal: <rect x="3" y="5" width="18" height="16" rx="2" />,
    money: null, pkg: null, cog: <circle cx="12" cy="12" r="3" />,
    search: <circle cx="11" cy="11" r="7" />, plus: null, chev: null, bell: null,
    check: null, alert: <circle cx="12" cy="12" r="10" />,
    x: <circle cx="12" cy="12" r="10" />, lock: <rect x="3" y="11" width="18" height="11" rx="2" />,
    dots: <circle cx="12" cy="12" r="9" />, pdf: null, share: null,
    cam: <circle cx="12" cy="13" r="4" />, filter: null,
    msg: null, phone: null, building: null, image: null, shield: null,
    info: <circle cx="12" cy="12" r="10" />,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
      {C[name] || null}
      {P[name] ? P[name].split(" M").map((d, i) => <path key={i} d={i === 0 ? d : "M" + d} />) : null}
    </svg>
  );
};

// Money formatter pt-BR
window.fmtMoney = function (str) {
  const n = typeof str === "string" ? parseFloat(str.replace(",", ".")) : str;
  return "R$\u00A0" + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
