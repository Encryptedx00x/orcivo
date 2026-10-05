/* @ds-bundle: {"format":3,"namespace":"OrcivoDesignSystem_019e14","components":[],"sourceHashes":{"android-frame.jsx":"26b6e42067a7","design-canvas.jsx":"c9095ef15594","screens/AuthIcons.jsx":"f7ef1e30e22d","screens/AuthMobile.jsx":"43c7e7ac0557","screens/AuthWeb.jsx":"c193a9668446","screens/FormsMobile.jsx":"bc4f2f53c11d","screens/FormsWeb.jsx":"bd4da3eaa698","screens/Public.jsx":"21c41ad53cbd","screens/States.jsx":"a6ddce465c29","ui_kits/mobile/Icons.jsx":"1329e720f555","ui_kits/mobile/Mobile.jsx":"184cbc09e308","ui_kits/mobile/Operations.jsx":"60e974898b47","ui_kits/mobile/android-frame.jsx":"26b6e42067a7","ui_kits/mobile/ios-frame.jsx":"d67eb3ffe562","ui_kits/web/App.jsx":"b186f98f2a85","ui_kits/web/CustomersAndQuotes.jsx":"57654ac2d70d","ui_kits/web/Dashboard.jsx":"4d98d6977cba","ui_kits/web/Icons.jsx":"3210c657d72f","ui_kits/web/Operations.jsx":"50b96756b1c5","ui_kits/web/OtherPages.jsx":"07bbc9968f82","ui_kits/web/QuoteEditor.jsx":"7d3a7b82cf94","ui_kits/web/Sidebar.jsx":"ad070366ae66","ui_kits/web/TopBar.jsx":"5b1de8f557f9"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.OrcivoDesignSystem_019e14 = window.OrcivoDesignSystem_019e14 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// android-frame.jsx
try { (() => {
// Android.jsx — Simplified Android (Material 3) device frame
// Status bar + top app bar + content + gesture nav + keyboard.
// Based on Figma M3 spec. No dependencies, no image assets.

const MD_C = {
  surface: '#f4fbf8',
  surfaceVariant: '#dae5e1',
  inverseOnSurface: '#ecf2ef',
  secondaryContainer: '#cde8e1',
  primaryFixedDim: '#83d5c6',
  onSurface: '#171d1b',
  onSurfaceVar: '#49454f',
  onPrimaryContainer: '#00201c',
  primary: '#006a60',
  frameBorder: 'rgba(116,119,117,0.5)'
};

// ─────────────────────────────────────────────────────────────
// Status bar (time left, wifi/cell/battery right)
// ─────────────────────────────────────────────────────────────
function AndroidStatusBar({
  dark = false
}) {
  const c = dark ? '#fff' : MD_C.onSurface;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'relative',
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 128,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 0.25,
      lineHeight: '20px',
      color: c
    }
  }, "9:30")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: 8,
      transform: 'translateX(-50%)',
      width: 24,
      height: 24,
      borderRadius: 100,
      background: '#2e2e2e'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      paddingRight: 2
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    style: {
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 13.3L.67 5.97a10.37 10.37 0 0114.66 0L8 13.3z",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    style: {
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14.67 14.67V1.33L1.33 14.67h13.34z",
    fill: c
  }))), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3.75",
    y: "2",
    width: "8.5",
    height: "13",
    rx: "1.5",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "0.9",
    width: "5",
    height: "2",
    rx: "0.5",
    fill: c
  }))));
}

// ─────────────────────────────────────────────────────────────
// Top app bar (Material 3 small/medium)
// ─────────────────────────────────────────────────────────────
function AndroidAppBar({
  title = 'Title',
  large = false
}) {
  const iconDot = /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: MD_C.onSurfaceVar,
      opacity: 0.3
    }
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: MD_C.surface,
      padding: '4px 4px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, iconDot, !large && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 22,
      fontWeight: 400,
      color: MD_C.onSurface,
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, title), large && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), iconDot), large && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 16px 20px',
      fontSize: 28,
      fontWeight: 400,
      color: MD_C.onSurface,
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// List item (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidListItem({
  headline,
  supporting,
  leading
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '12px 16px',
      minHeight: 56,
      boxSizing: 'border-box',
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, leading && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: MD_C.primary,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 500,
      flexShrink: 0
    }
  }, leading), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: MD_C.onSurface,
      lineHeight: '24px'
    }
  }, headline), supporting && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: MD_C.onSurfaceVar,
      lineHeight: '20px'
    }
  }, supporting)));
}

// ─────────────────────────────────────────────────────────────
// Gesture nav bar (pill)
// ─────────────────────────────────────────────────────────────
function AndroidNavBar({
  dark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 108,
      height: 4,
      borderRadius: 2,
      background: dark ? '#fff' : MD_C.onSurface,
      opacity: 0.4
    }
  }));
}

// ─────────────────────────────────────────────────────────────
// Device frame — wraps everything
// ─────────────────────────────────────────────────────────────
function AndroidDevice({
  children,
  width = 412,
  height = 892,
  dark = false,
  title,
  large = false,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 18,
      overflow: 'hidden',
      background: dark ? '#1d1b20' : MD_C.surface,
      border: `8px solid ${MD_C.frameBorder}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(AndroidStatusBar, {
    dark: dark
  }), title !== undefined && /*#__PURE__*/React.createElement(AndroidAppBar, {
    title: title,
    large: large
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(AndroidKeyboard, null), /*#__PURE__*/React.createElement(AndroidNavBar, {
    dark: dark
  }));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — Gboard (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidKeyboard() {
  let _k = 0;
  const key = (l, {
    flex = 1,
    bg = MD_C.surface,
    r = 6,
    minW,
    fs = 21
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: _k++,
    style: {
      height: 46,
      borderRadius: r,
      flex,
      minWidth: minW,
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Roboto, system-ui',
      fontSize: fs,
      color: MD_C.onPrimaryContainer
    }
  }, l);
  const row = (keys, style = {}) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      justifyContent: 'center',
      ...style
    }
  }, keys.map(l => key(l)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: MD_C.inverseOnSurface,
      padding: '0 8px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], {
    padding: '0 20px'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, key('', {
    bg: MD_C.surfaceVariant
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flex: 7,
      minWidth: 274
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l))), key('', {
    bg: MD_C.surfaceVariant
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, key('?123', {
    bg: MD_C.secondaryContainer,
    r: 100,
    minW: 58,
    fs: 14
  }), key(',', {
    bg: MD_C.surfaceVariant
  }), key('', {
    flex: 3,
    minW: 154
  }), key('.', {
    bg: MD_C.surfaceVariant
  }), key('', {
    bg: MD_C.primaryFixedDim,
    r: 100,
    minW: 58
  }))));
}
Object.assign(window, {
  AndroidDevice,
  AndroidStatusBar,
  AndroidAppBar,
  AndroidListItem,
  AndroidNavBar,
  AndroidKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "android-frame.jsx", error: String((e && e.message) || e) }); }

// design-canvas.jsx
try { (() => {
// DesignCanvas.jsx — Figma-ish design canvas wrapper
// Warm gray grid bg + Sections + Artboards + PostIt notes.
// Artboards are reorderable (grip-drag), deletable, labels/titles are
// inline-editable, and any artboard can be opened in a fullscreen focus
// overlay (←/→/Esc). State persists to a .design-canvas.state.json sidecar
// via the host bridge. No assets, no deps.
//
// Usage:
//   <DesignCanvas>
//     <DCSection id="onboarding" title="Onboarding" subtitle="First-run variants">
//       <DCArtboard id="a" label="A · Dusk" width={260} height={480}>…</DCArtboard>
//       <DCArtboard id="b" label="B · Minimal" width={260} height={480}>…</DCArtboard>
//     </DCSection>
//   </DesignCanvas>

const DC = {
  bg: '#f0eee9',
  grid: 'rgba(0,0,0,0.06)',
  label: 'rgba(60,50,40,0.7)',
  title: 'rgba(40,30,20,0.85)',
  subtitle: 'rgba(60,50,40,0.6)',
  postitBg: '#fef4a8',
  postitText: '#5a4a2a',
  font: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
};

// One-time CSS injection (classes are dc-prefixed so they don't collide with
// the hosted design's own styles).
if (typeof document !== 'undefined' && !document.getElementById('dc-styles')) {
  const s = document.createElement('style');
  s.id = 'dc-styles';
  s.textContent = ['.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}', '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}', '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}', '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}', '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}',
  // isolation:isolate contains artboard content's z-indexes so a
  // z-indexed child (sticky navbar etc.) can't paint over .dc-header or
  // the .dc-menu popover that drops into the top of the card.
  '.dc-card{isolation:isolate;transition:box-shadow .15s,transform .15s}', '.dc-card *{scrollbar-width:none}', '.dc-card *::-webkit-scrollbar{display:none}',
  // Per-artboard header: grip + label on the left, delete/expand on the
  // right. Single flex row; when the artboard's on-screen width is too
  // narrow for both the label yields (ellipsis, then hidden entirely below
  // ~4ch via the container query) and the buttons stay on the row.
  '.dc-header{position:absolute;bottom:100%;left:-4px;margin-bottom:calc(4px * var(--dc-inv-zoom,1));z-index:2;', '  display:flex;align-items:center;container-type:inline-size}', '.dc-labelrow{display:flex;align-items:center;gap:4px;height:24px;flex:1 1 auto;min-width:0}', '.dc-grip{flex:0 0 auto;cursor:grab;display:flex;align-items:center;padding:5px 4px;border-radius:4px;transition:background .12s,opacity .12s}', '.dc-grip:hover{background:rgba(0,0,0,.08)}', '.dc-grip:active{cursor:grabbing}', '.dc-labeltext{flex:1 1 auto;min-width:0;cursor:pointer;border-radius:4px;padding:3px 6px;', '  display:flex;align-items:center;transition:background .12s;overflow:hidden}',
  // Below ~4ch of label room: hide the label entirely, and drop the grip to
  // hover-only (same reveal rule as .dc-btns) so a narrow header is clean
  // until the card is moused.
  '@container (max-width: 110px){', '  .dc-labeltext{display:none}', '  .dc-grip{opacity:0}', '  [data-dc-slot]:hover .dc-grip{opacity:1}', '}', '.dc-labeltext:hover{background:rgba(0,0,0,.05)}', '.dc-labeltext .dc-editable{overflow:hidden;text-overflow:ellipsis;max-width:100%}', '.dc-labeltext .dc-editable:focus{overflow:visible;text-overflow:clip}', '.dc-btns{flex:0 0 auto;margin-left:auto;display:flex;gap:2px;opacity:0;transition:opacity .12s}', '[data-dc-slot]:hover .dc-btns,.dc-btns:has(.dc-menu){opacity:1}', '.dc-expand,.dc-kebab{width:22px;height:22px;border-radius:5px;border:none;cursor:pointer;padding:0;', '  background:transparent;color:rgba(60,50,40,.7);display:flex;align-items:center;justify-content:center;', '  font:inherit;transition:background .12s,color .12s}', '.dc-expand:hover,.dc-kebab:hover{background:rgba(0,0,0,.06);color:#2a251f}',
  // Slot hosting an open menu floats above later siblings (which otherwise
  // paint on top — same z-index:auto, later DOM order) so the popup isn't
  // clipped by the next card.
  '[data-dc-slot]:has(.dc-menu){z-index:10}', '.dc-menu{position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border-radius:8px;', '  box-shadow:0 8px 28px rgba(0,0,0,.18),0 0 0 1px rgba(0,0,0,.05);padding:4px;min-width:160px;z-index:10}', '.dc-menu button{display:block;width:100%;padding:7px 10px;border:0;background:transparent;', '  border-radius:5px;font-family:inherit;font-size:13px;font-weight:500;line-height:1.2;', '  color:#29261b;cursor:pointer;text-align:left;transition:background .12s;white-space:nowrap}', '.dc-menu button:hover{background:rgba(0,0,0,.05)}', '.dc-menu hr{border:0;border-top:1px solid rgba(0,0,0,.08);margin:4px 2px}', '.dc-menu .dc-danger{color:#c96442}', '.dc-menu .dc-danger:hover{background:rgba(201,100,66,.1)}',
  // Chrome (titles / labels / buttons) counter-scales against the viewport
  // zoom so it stays a constant on-screen size. --dc-inv-zoom is set by
  // DCViewport on every transform update and inherits to all descendants —
  // any overlay inside the world (e.g. a TweaksPanel on an artboard) can use
  // it the same way.
  //
  // The header uses transform:scale (out-of-flow, so layout impact doesn't
  // matter) with its world-space width set to card-width / inv-zoom so that
  // after counter-scaling its on-screen width exactly matches the card's —
  // that's what lets the container query + text-overflow behave against the
  // card's visible edge at every zoom level.
  //
  // The section head uses CSS zoom instead of transform so its layout box
  // grows with the counter-scale, pushing the card row down — otherwise the
  // constant-screen-size title would overflow into the (shrinking) world-
  // space gap and overlap the artboard headers at low zoom.
  '.dc-header{width:calc((100% + 4px) / var(--dc-inv-zoom,1));', '  transform:scale(var(--dc-inv-zoom,1));transform-origin:bottom left}', '.dc-sectionhead{zoom:var(--dc-inv-zoom,1)}'].join('\n');
  document.head.appendChild(s);
}
const DCCtx = React.createContext(null);

// Recursively unwrap React.Fragment so <>…</> grouping doesn't hide
// DCSection/DCArtboard children from the type-based walks below.
function dcFlatten(children) {
  const out = [];
  React.Children.forEach(children, c => {
    if (c && c.type === React.Fragment) out.push(...dcFlatten(c.props.children));else out.push(c);
  });
  return out;
}

// ─────────────────────────────────────────────────────────────
// DesignCanvas — stateful wrapper around the pan/zoom viewport.
// Owns runtime state (per-section order, renamed titles/labels, hidden
// artboards, focused artboard). Order/titles/labels/hidden persist to a
// .design-canvas.state.json
// sidecar next to the HTML. Reads go via plain fetch() so the saved
// arrangement is visible anywhere the HTML + sidecar are served together
// (omelette preview, direct link, downloaded zip). Writes go through the
// host's window.omelette bridge — editing requires the omelette runtime.
// Focus is ephemeral.
// ─────────────────────────────────────────────────────────────
const DC_STATE_FILE = '.design-canvas.state.json';
function DesignCanvas({
  children,
  minScale,
  maxScale,
  style
}) {
  const [state, setState] = React.useState({
    sections: {},
    focus: null
  });
  // Hold rendering until the sidecar read settles so the saved order/titles
  // appear on first paint (no source-order flash). didRead gates writes until
  // the read settles so the empty initial state can't clobber a slow read;
  // skipNextWrite suppresses the one echo-write that would otherwise follow
  // hydration.
  const [ready, setReady] = React.useState(false);
  const didRead = React.useRef(false);
  const skipNextWrite = React.useRef(false);
  React.useEffect(() => {
    let off = false;
    fetch('./' + DC_STATE_FILE).then(r => r.ok ? r.json() : null).then(saved => {
      if (off || !saved || !saved.sections) return;
      skipNextWrite.current = true;
      setState(s => ({
        ...s,
        sections: saved.sections
      }));
    }).catch(() => {}).finally(() => {
      didRead.current = true;
      if (!off) setReady(true);
    });
    const t = setTimeout(() => {
      if (!off) setReady(true);
    }, 150);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, []);
  React.useEffect(() => {
    if (!didRead.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const t = setTimeout(() => {
      window.omelette?.writeFile(DC_STATE_FILE, JSON.stringify({
        sections: state.sections
      })).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [state.sections]);

  // Build registries synchronously from children so FocusOverlay can read
  // them in the same render. Fragments are flattened; wrapping in other
  // elements still opts out of focus/reorder.
  const registry = {}; // slotId -> { sectionId, artboard }
  const sectionMeta = {}; // sectionId -> { title, subtitle, slotIds[] }
  const sectionOrder = [];
  dcFlatten(children).forEach(sec => {
    if (!sec || sec.type !== DCSection) return;
    const sid = sec.props.id ?? sec.props.title;
    if (!sid) return;
    sectionOrder.push(sid);
    const persisted = state.sections[sid] || {};
    const abs = [];
    dcFlatten(sec.props.children).forEach(ab => {
      if (!ab || ab.type !== DCArtboard) return;
      const aid = ab.props.id ?? ab.props.label;
      if (aid) abs.push([aid, ab]);
    });
    // hidden is scoped to one source revision — when the agent regenerates
    // (artboard-ID set changes), prior deletes don't apply to new content.
    const srcKey = abs.map(([k]) => k).join('\x1f');
    const hidden = persisted.srcKey === srcKey ? persisted.hidden || [] : [];
    const srcIds = [];
    abs.forEach(([aid, ab]) => {
      if (hidden.includes(aid)) return;
      registry[`${sid}/${aid}`] = {
        sectionId: sid,
        artboard: ab
      };
      srcIds.push(aid);
    });
    const kept = (persisted.order || []).filter(k => srcIds.includes(k));
    sectionMeta[sid] = {
      title: persisted.title ?? sec.props.title,
      subtitle: sec.props.subtitle,
      slotIds: [...kept, ...srcIds.filter(k => !kept.includes(k))]
    };
  });
  const api = React.useMemo(() => ({
    state,
    section: id => state.sections[id] || {},
    patchSection: (id, p) => setState(s => ({
      ...s,
      sections: {
        ...s.sections,
        [id]: {
          ...s.sections[id],
          ...(typeof p === 'function' ? p(s.sections[id] || {}) : p)
        }
      }
    })),
    setFocus: slotId => setState(s => ({
      ...s,
      focus: slotId
    }))
  }), [state]);

  // Esc exits focus; any outside pointerdown commits an in-progress rename.
  React.useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape') api.setFocus(null);
    };
    const onPd = e => {
      const ae = document.activeElement;
      if (ae && ae.isContentEditable && !ae.contains(e.target)) ae.blur();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPd, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPd, true);
    };
  }, [api]);
  return /*#__PURE__*/React.createElement(DCCtx.Provider, {
    value: api
  }, /*#__PURE__*/React.createElement(DCViewport, {
    minScale: minScale,
    maxScale: maxScale,
    style: style
  }, ready && children), state.focus && registry[state.focus] && /*#__PURE__*/React.createElement(DCFocusOverlay, {
    entry: registry[state.focus],
    sectionMeta: sectionMeta,
    sectionOrder: sectionOrder
  }));
}

// ─────────────────────────────────────────────────────────────
// DCViewport — transform-based pan/zoom (internal)
//
// Input mapping (Figma-style):
//   • trackpad pinch  → zoom   (ctrlKey wheel; Safari gesture* events)
//   • trackpad scroll → pan    (two-finger)
//   • mouse wheel     → zoom   (notched; distinguished from trackpad scroll)
//   • middle-drag / primary-drag-on-bg → pan
//
// Transform state lives in a ref and is written straight to the DOM
// (translate3d + will-change) so wheel ticks don't go through React —
// keeps pans at 60fps on dense canvases.
// ─────────────────────────────────────────────────────────────
function DCViewport({
  children,
  minScale = 0.1,
  maxScale = 8,
  style = {}
}) {
  const vpRef = React.useRef(null);
  const worldRef = React.useRef(null);
  const tf = React.useRef({
    x: 0,
    y: 0,
    scale: 1
  });
  // Persist viewport across reloads so the user lands back where they were
  // after an agent edit or browser refresh. The sandbox origin is already
  // per-project; pathname keeps multiple canvas files in one project apart.
  const tfKey = 'dc-viewport:' + location.pathname;
  const saveT = React.useRef(0);
  const lastPostedScale = React.useRef();
  const apply = React.useCallback(() => {
    const {
      x,
      y,
      scale
    } = tf.current;
    const el = worldRef.current;
    if (!el) return;
    el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;
    // Exposed for zoom-invariant chrome (labels, buttons, TweaksPanel).
    el.style.setProperty('--dc-inv-zoom', String(1 / scale));
    // Keep the host toolbar's % readout in sync with the canvas scale. Pan
    // ticks leave scale unchanged — skip the cross-frame post for those.
    if (lastPostedScale.current !== scale) {
      lastPostedScale.current = scale;
      window.parent.postMessage({
        type: '__dc_zoom',
        scale
      }, '*');
    }
    clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    }, 200);
  }, [tfKey]);
  React.useLayoutEffect(() => {
    const flush = () => {
      clearTimeout(saveT.current);
      try {
        localStorage.setItem(tfKey, JSON.stringify(tf.current));
      } catch {}
    };
    try {
      const s = JSON.parse(localStorage.getItem(tfKey) || 'null');
      if (s && Number.isFinite(s.x) && Number.isFinite(s.y) && Number.isFinite(s.scale)) {
        tf.current = {
          x: s.x,
          y: s.y,
          scale: Math.min(maxScale, Math.max(minScale, s.scale))
        };
        apply();
      }
    } catch {}
    // Flush on pagehide and unmount so a reload within the 200ms debounce
    // window doesn't drop the last pan/zoom.
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, []);
  React.useEffect(() => {
    const vp = vpRef.current;
    if (!vp) return;
    const zoomAt = (cx, cy, factor) => {
      const r = vp.getBoundingClientRect();
      const px = cx - r.left,
        py = cy - r.top;
      const t = tf.current;
      const next = Math.min(maxScale, Math.max(minScale, t.scale * factor));
      const k = next / t.scale;
      // --dc-inv-zoom consumers (.dc-sectionhead's CSS zoom, each section's
      // marginBottom) reflow on every scale change, vertically shifting the
      // world layout — so a world point mathematically pinned under the cursor
      // drifts as you zoom (content creeps up on zoom-in, down on zoom-out).
      // Anchor the DOM element under the cursor instead: record its screen Y,
      // apply the transform + --dc-inv-zoom, then cancel whatever vertical
      // drift the reflow introduced so it stays put on screen.
      let marker = null,
        markerY0 = 0;
      if (k !== 1) {
        const hit = document.elementFromPoint(cx, cy);
        marker = hit && hit.closest ? hit.closest('[data-dc-slot],[data-dc-section]') : null;
        if (marker) markerY0 = marker.getBoundingClientRect().top;
      }
      // keep the world point under the cursor fixed
      t.x = px - (px - t.x) * k;
      t.y = py - (py - t.y) * k;
      t.scale = next;
      apply();
      if (marker) {
        // A pure zoom around (cx, cy) maps screen Y → cy + (Y - cy) * k. Any
        // departure after the --dc-inv-zoom reflow is the layout drift.
        const drift = marker.getBoundingClientRect().top - (cy + (markerY0 - cy) * k);
        if (Math.abs(drift) > 0.1) {
          t.y -= drift;
          apply();
        }
      }
    };

    // Mouse-wheel vs trackpad-scroll heuristic. A physical wheel sends
    // line-mode deltas (Firefox) or large integer pixel deltas with no X
    // component (Chrome/Safari, typically multiples of 100/120). Trackpad
    // two-finger scroll sends small/fractional pixel deltas, often with
    // non-zero deltaX. ctrlKey is set by the browser for trackpad pinch.
    const isMouseWheel = e => e.deltaMode !== 0 || e.deltaX === 0 && Number.isInteger(e.deltaY) && Math.abs(e.deltaY) >= 40;
    const onWheel = e => {
      e.preventDefault();
      if (isGesturing) return; // Safari: gesture* owns the pinch — discard concurrent wheels
      if ((e.ctrlKey || e.metaKey) && !isMouseWheel(e)) {
        // trackpad pinch, or ctrl/cmd + smooth-scroll mouse. Notched
        // wheels fall through to the fixed-step branch below.
        zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01));
      } else if (isMouseWheel(e)) {
        // notched mouse wheel — fixed-ratio step per click
        zoomAt(e.clientX, e.clientY, Math.exp(-Math.sign(e.deltaY) * 0.18));
      } else {
        // trackpad two-finger scroll — pan
        tf.current.x -= e.deltaX;
        tf.current.y -= e.deltaY;
        apply();
      }
    };

    // Safari sends native gesture* events for trackpad pinch with a smooth
    // e.scale; preferring these over the ctrl+wheel fallback gives a much
    // better feel there. No-ops on other browsers. Safari also fires
    // ctrlKey wheel events during the same pinch — isGesturing makes
    // onWheel drop those entirely so they neither zoom nor pan.
    let gsBase = 1;
    let isGesturing = false;
    const onGestureStart = e => {
      e.preventDefault();
      isGesturing = true;
      gsBase = tf.current.scale;
    };
    const onGestureChange = e => {
      e.preventDefault();
      zoomAt(e.clientX, e.clientY, gsBase * e.scale / tf.current.scale);
    };
    const onGestureEnd = e => {
      e.preventDefault();
      isGesturing = false;
    };

    // Drag-pan: middle button anywhere, or primary button on canvas
    // background (anything that isn't an artboard or an inline editor).
    let drag = null;
    const onPointerDown = e => {
      const onBg = !e.target.closest('[data-dc-slot], .dc-editable');
      if (!(e.button === 1 || e.button === 0 && onBg)) return;
      e.preventDefault();
      vp.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        lx: e.clientX,
        ly: e.clientY
      };
      vp.style.cursor = 'grabbing';
    };
    const onPointerMove = e => {
      if (!drag || e.pointerId !== drag.id) return;
      tf.current.x += e.clientX - drag.lx;
      tf.current.y += e.clientY - drag.ly;
      drag.lx = e.clientX;
      drag.ly = e.clientY;
      apply();
    };
    const onPointerUp = e => {
      if (!drag || e.pointerId !== drag.id) return;
      vp.releasePointerCapture(e.pointerId);
      drag = null;
      vp.style.cursor = '';
    };

    // Host-driven zoom (toolbar % menu). Zooms around viewport centre so the
    // visible midpoint stays fixed — matching the host's iframe-zoom feel.
    const onHostMsg = e => {
      const d = e.data;
      if (d && d.type === '__dc_set_zoom' && typeof d.scale === 'number') {
        const r = vp.getBoundingClientRect();
        zoomAt(r.left + r.width / 2, r.top + r.height / 2, d.scale / tf.current.scale);
      } else if (d && d.type === '__dc_probe') {
        // Host's [readyGen] reset asks whether a canvas is present; it
        // fires on the iframe's native 'load', which for canvases with
        // images/fonts is after our mount-time announce, so re-announce.
        // Clear the pan-tick guard so apply() re-posts the current scale
        // even if it's unchanged — the host just reset dcScale to 1.
        window.parent.postMessage({
          type: '__dc_present'
        }, '*');
        lastPostedScale.current = undefined;
        apply();
      }
    };
    window.addEventListener('message', onHostMsg);
    // Announce canvas mode so the host toolbar proxies its % control here
    // instead of scaling the iframe element (which would just shrink the
    // viewport window of an infinite canvas). The apply() that follows emits
    // the initial __dc_zoom so the toolbar % is correct before first pinch.
    // lastPostedScale reset mirrors the __dc_probe handler: the layout
    // effect's restore-path apply() may already have posted the restored
    // scale (before __dc_present), so clear the guard to re-post it in order.
    window.parent.postMessage({
      type: '__dc_present'
    }, '*');
    lastPostedScale.current = undefined;
    apply();
    vp.addEventListener('wheel', onWheel, {
      passive: false
    });
    vp.addEventListener('gesturestart', onGestureStart, {
      passive: false
    });
    vp.addEventListener('gesturechange', onGestureChange, {
      passive: false
    });
    vp.addEventListener('gestureend', onGestureEnd, {
      passive: false
    });
    vp.addEventListener('pointerdown', onPointerDown);
    vp.addEventListener('pointermove', onPointerMove);
    vp.addEventListener('pointerup', onPointerUp);
    vp.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('message', onHostMsg);
      vp.removeEventListener('wheel', onWheel);
      vp.removeEventListener('gesturestart', onGestureStart);
      vp.removeEventListener('gesturechange', onGestureChange);
      vp.removeEventListener('gestureend', onGestureEnd);
      vp.removeEventListener('pointerdown', onPointerDown);
      vp.removeEventListener('pointermove', onPointerMove);
      vp.removeEventListener('pointerup', onPointerUp);
      vp.removeEventListener('pointercancel', onPointerUp);
    };
  }, [apply, minScale, maxScale]);
  const gridSvg = `url("data:image/svg+xml,%3Csvg width='120' height='120' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M120 0H0v120' fill='none' stroke='${encodeURIComponent(DC.grid)}' stroke-width='1'/%3E%3C/svg%3E")`;
  return /*#__PURE__*/React.createElement("div", {
    ref: vpRef,
    className: "design-canvas",
    style: {
      height: '100vh',
      width: '100vw',
      background: DC.bg,
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none',
      position: 'relative',
      fontFamily: DC.font,
      boxSizing: 'border-box',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: worldRef,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      transformOrigin: '0 0',
      willChange: 'transform',
      width: 'max-content',
      minWidth: '100%',
      minHeight: '100%',
      padding: '60px 0 80px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: -6000,
      backgroundImage: gridSvg,
      backgroundSize: '120px 120px',
      pointerEvents: 'none',
      zIndex: -1
    }
  }), children));
}

// ─────────────────────────────────────────────────────────────
// DCSection — editable title + h-row of artboards in persisted order
// ─────────────────────────────────────────────────────────────
function DCSection({
  id,
  title,
  subtitle,
  children,
  gap = 48
}) {
  const ctx = React.useContext(DCCtx);
  const sid = id ?? title;
  const all = React.Children.toArray(dcFlatten(children));
  const artboards = all.filter(c => c && c.type === DCArtboard);
  const rest = all.filter(c => !(c && c.type === DCArtboard));
  const sec = ctx && sid && ctx.section(sid) || {};
  // Must match DesignCanvas's srcKey computation exactly (it filters falsy
  // IDs), or onDelete persists a srcKey that DesignCanvas never recognizes.
  const allIds = artboards.map(a => a.props.id ?? a.props.label).filter(Boolean);
  const srcKey = allIds.join('\x1f');
  const hidden = sec.srcKey === srcKey ? sec.hidden || [] : [];
  const srcOrder = allIds.filter(k => !hidden.includes(k));
  const order = React.useMemo(() => {
    const kept = (sec.order || []).filter(k => srcOrder.includes(k));
    return [...kept, ...srcOrder.filter(k => !kept.includes(k))];
  }, [sec.order, srcOrder.join('|')]);
  const byId = Object.fromEntries(artboards.map(a => [a.props.id ?? a.props.label, a]));

  // marginBottom counter-scales so the on-screen gap between sections stays
  // constant — otherwise at low zoom the (world-space) gap collapses while
  // the screen-constant sectionhead below it doesn't, and the title reads as
  // belonging to the section above. paddingBottom below is just enough for
  // the 24px artboard-header (abs-positioned above each card) plus ~8px, so
  // the title sits tight against its own row at every zoom.
  return /*#__PURE__*/React.createElement("div", {
    "data-dc-section": sid,
    style: {
      marginBottom: 'calc(80px * var(--dc-inv-zoom, 1))',
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 60px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-sectionhead",
    style: {
      paddingBottom: 36
    }
  }, /*#__PURE__*/React.createElement(DCEditable, {
    tag: "div",
    value: sec.title ?? title,
    onChange: v => ctx && sid && ctx.patchSection(sid, {
      title: v
    }),
    style: {
      fontSize: 28,
      fontWeight: 600,
      color: DC.title,
      letterSpacing: -0.4,
      marginBottom: 6,
      display: 'inline-block'
    }
  }), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: DC.subtitle
    }
  }, subtitle))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap,
      padding: '0 60px',
      alignItems: 'flex-start',
      width: 'max-content'
    }
  }, order.map(k => /*#__PURE__*/React.createElement(DCArtboardFrame, {
    key: k,
    sectionId: sid,
    artboard: byId[k],
    order: order,
    label: (sec.labels || {})[k] ?? byId[k].props.label,
    onRename: v => ctx && ctx.patchSection(sid, x => ({
      labels: {
        ...x.labels,
        [k]: v
      }
    })),
    onReorder: next => ctx && ctx.patchSection(sid, {
      order: next
    }),
    onDelete: () => ctx && ctx.patchSection(sid, x => ({
      hidden: [...(x.srcKey === srcKey ? x.hidden || [] : []), k],
      srcKey
    })),
    onFocus: () => ctx && ctx.setFocus(`${sid}/${k}`)
  }))), rest);
}

// DCArtboard — marker; rendered by DCArtboardFrame via DCSection.
function DCArtboard() {
  return null;
}

// Per-artboard export (kind: 'png' | 'html'). Both paths share the same
// self-contained clone: computed styles baked in, @font-face / <img> /
// inline-style background-image urls inlined as data URIs. PNG wraps the
// clone in foreignObject→canvas at 3× the artboard's natural width×height
// (same pipeline the host uses for page captures); HTML wraps it in a
// minimal standalone document. Both are independent of viewport zoom.
async function dcExport(node, w, h, name, kind) {
  try {
    await document.fonts.ready;
  } catch {}
  const toDataURL = url => fetch(url).then(r => r.blob()).then(b => new Promise(res => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => res(url);
    fr.readAsDataURL(b);
  })).catch(() => url);

  // Collect @font-face rules. ss.cssRules throws SecurityError on
  // cross-origin sheets (e.g. fonts.googleapis.com) — in that case fetch
  // the CSS text directly (those endpoints send ACAO:*) and regex-extract
  // the blocks. @import and @media/@supports are walked so nested
  // @font-face rules aren't missed.
  const fontRules = [],
    pending = [],
    seen = new Set();
  const scrapeCss = href => {
    if (seen.has(href)) return;
    seen.add(href);
    pending.push(fetch(href).then(r => r.text()).then(css => {
      for (const m of css.match(/@font-face\s*{[^}]*}/g) || []) fontRules.push({
        css: m,
        base: href
      });
      for (const m of css.matchAll(/@import\s+(?:url\()?['"]?([^'")\s;]+)/g)) scrapeCss(new URL(m[1], href).href);
    }).catch(() => {}));
  };
  const walk = (rules, base) => {
    for (const r of rules) {
      if (r.type === CSSRule.FONT_FACE_RULE) fontRules.push({
        css: r.cssText,
        base
      });else if (r.type === CSSRule.IMPORT_RULE && r.styleSheet) {
        const ibase = r.styleSheet.href || base;
        try {
          walk(r.styleSheet.cssRules, ibase);
        } catch {
          scrapeCss(ibase);
        }
      } else if (r.cssRules) walk(r.cssRules, base);
    }
  };
  for (const ss of document.styleSheets) {
    const base = ss.href || location.href;
    try {
      walk(ss.cssRules, base);
    } catch {
      if (ss.href) scrapeCss(ss.href);
    }
  }
  while (pending.length) await pending.shift();
  const fontCss = (await Promise.all(fontRules.map(async rule => {
    let out = rule.css,
      m;
    const re = /url\((['"]?)([^'")]+)\1\)/g;
    while (m = re.exec(rule.css)) {
      if (m[2].indexOf('data:') === 0) continue;
      let abs;
      try {
        abs = new URL(m[2], rule.base).href;
      } catch {
        continue;
      }
      out = out.split(m[0]).join('url("' + (await toDataURL(abs)) + '")');
    }
    return out;
  }))).join('\n');
  const cloneStyled = src => {
    if (src.nodeType === 8 || src.nodeType === 1 && src.tagName === 'SCRIPT') return document.createTextNode('');
    const dst = src.cloneNode(false);
    if (src.nodeType === 1) {
      const cs = getComputedStyle(src);
      let txt = '';
      for (let i = 0; i < cs.length; i++) txt += cs[i] + ':' + cs.getPropertyValue(cs[i]) + ';';
      dst.setAttribute('style', txt + 'animation:none;transition:none;');
      if (src.tagName === 'CANVAS') try {
        const im = document.createElement('img');
        im.src = src.toDataURL();
        im.setAttribute('style', txt);
        return im;
      } catch {}
    }
    for (let c = src.firstChild; c; c = c.nextSibling) dst.appendChild(cloneStyled(c));
    return dst;
  };
  const clone = cloneStyled(node);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
  // Drop the card's own shadow/radius so the export is a flush w×h rect;
  // the artboard's own background (if any) is already in the computed style.
  clone.style.boxShadow = 'none';
  clone.style.borderRadius = '0';
  const jobs = [];
  clone.querySelectorAll('img').forEach(el => {
    const s = el.getAttribute('src');
    if (s && s.indexOf('data:') !== 0) jobs.push(toDataURL(el.src).then(d => el.setAttribute('src', d)));
  });
  [clone, ...clone.querySelectorAll('*')].forEach(el => {
    const bg = el.style.backgroundImage;
    if (!bg) return;
    let m;
    const re = /url\(["']?([^"')]+)["']?\)/g;
    while (m = re.exec(bg)) {
      const tok = m[0],
        url = m[1];
      if (url.indexOf('data:') === 0) continue;
      jobs.push(toDataURL(url).then(d => {
        el.style.backgroundImage = el.style.backgroundImage.split(tok).join('url("' + d + '")');
      }));
    }
  });
  await Promise.all(jobs);
  const xml = new XMLSerializer().serializeToString(clone);
  const save = (blob, ext) => {
    if (!blob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '.' + ext;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  if (kind === 'html') {
    const html = '<!doctype html><html><head><meta charset="utf-8"><title>' + name + '</title>' + (fontCss ? '<style>' + fontCss + '</style>' : '') + '</head><body style="margin:0">' + xml + '</body></html>';
    return save(new Blob([html], {
      type: 'text/html'
    }), 'html');
  }

  // PNG: the SVG's own width/height must be the output resolution — an
  // <img>-loaded SVG rasterizes at its intrinsic size, so sizing it at 1×
  // and ctx.scale()-ing up would just upscale a 1× bitmap. viewBox maps the
  // w×h foreignObject onto the px·w × px·h SVG canvas so the browser renders
  // the HTML at full resolution.
  const px = 3;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w * px + '" height="' + h * px + '" viewBox="0 0 ' + w + ' ' + h + '"><foreignObject width="' + w + '" height="' + h + '">' + (fontCss ? '<style><![CDATA[' + fontCss + ']]></style>' : '') + xml + '</foreignObject></svg>';
  const img = new Image();
  await new Promise((res, rej) => {
    img.onload = res;
    img.onerror = () => rej(new Error('svg load failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  const cv = document.createElement('canvas');
  cv.width = w * px;
  cv.height = h * px;
  cv.getContext('2d').drawImage(img, 0, 0);
  cv.toBlob(blob => save(blob, 'png'), 'image/png');
}
function DCArtboardFrame({
  sectionId,
  artboard,
  label,
  order,
  onRename,
  onReorder,
  onFocus,
  onDelete
}) {
  const {
    id: rawId,
    label: rawLabel,
    width = 260,
    height = 480,
    children,
    style = {}
  } = artboard.props;
  const id = rawId ?? rawLabel;
  const ref = React.useRef(null);
  const cardRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  // ⋯ menu: close on any outside pointerdown. Two-click delete lives inside
  // the menu — first click arms the row, second commits; closing disarms.
  React.useEffect(() => {
    if (!menuOpen) {
      setConfirming(false);
      return;
    }
    const off = e => {
      if (!menuRef.current || !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', off, true);
    return () => document.removeEventListener('pointerdown', off, true);
  }, [menuOpen]);
  const doExport = kind => {
    setMenuOpen(false);
    if (!cardRef.current) return;
    const name = String(label || id || 'artboard').replace(/[^\w\s.-]+/g, '_');
    dcExport(cardRef.current, width, height, name, kind).catch(e => console.error('[design-canvas] export failed:', e));
  };

  // Live drag-reorder: dragged card sticks to cursor; siblings slide into
  // their would-be slots in real time via transforms. DOM order only
  // changes on drop.
  const onGripDown = e => {
    e.preventDefault();
    e.stopPropagation();
    const me = ref.current;
    // translateX is applied in local (pre-scale) space but pointer deltas and
    // getBoundingClientRect().left are screen-space — divide by the viewport's
    // current scale so the dragged card tracks the cursor at any zoom level.
    const scale = me.getBoundingClientRect().width / me.offsetWidth || 1;
    const peers = Array.from(document.querySelectorAll(`[data-dc-section="${sectionId}"] [data-dc-slot]`));
    const homes = peers.map(el => ({
      el,
      id: el.dataset.dcSlot,
      x: el.getBoundingClientRect().left
    }));
    const slotXs = homes.map(h => h.x);
    const startIdx = order.indexOf(id);
    const startX = e.clientX;
    let liveOrder = order.slice();
    me.classList.add('dc-dragging');
    const layout = () => {
      for (const h of homes) {
        if (h.id === id) continue;
        const slot = liveOrder.indexOf(h.id);
        h.el.style.transform = `translateX(${(slotXs[slot] - h.x) / scale}px)`;
      }
    };
    const move = ev => {
      const dx = ev.clientX - startX;
      me.style.transform = `translateX(${dx / scale}px)`;
      const cur = homes[startIdx].x + dx;
      let nearest = 0,
        best = Infinity;
      for (let i = 0; i < slotXs.length; i++) {
        const d = Math.abs(slotXs[i] - cur);
        if (d < best) {
          best = d;
          nearest = i;
        }
      }
      if (liveOrder.indexOf(id) !== nearest) {
        liveOrder = order.filter(k => k !== id);
        liveOrder.splice(nearest, 0, id);
        layout();
      }
    };
    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      const finalSlot = liveOrder.indexOf(id);
      me.classList.remove('dc-dragging');
      me.style.transform = `translateX(${(slotXs[finalSlot] - homes[startIdx].x) / scale}px)`;
      // After the settle transition, kill transitions + clear transforms +
      // commit the reorder in the same frame so there's no visual snap-back.
      setTimeout(() => {
        for (const h of homes) {
          h.el.style.transition = 'none';
          h.el.style.transform = '';
        }
        if (liveOrder.join('|') !== order.join('|')) onReorder(liveOrder);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          for (const h of homes) h.el.style.transition = '';
        }));
      }, 180);
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    "data-dc-slot": id,
    style: {
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-header",
    "data-noncommentable": "",
    style: {
      color: DC.label
    },
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-labelrow"
  }, /*#__PURE__*/React.createElement("div", {
    className: "dc-grip",
    onPointerDown: onGripDown,
    title: "Drag to reorder"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "9",
    height: "13",
    viewBox: "0 0 9 13",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "2",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "6.5",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "2",
    cy: "11",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "7",
    cy: "11",
    r: "1.1"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-labeltext",
    onClick: onFocus,
    title: "Click to focus"
  }, /*#__PURE__*/React.createElement(DCEditable, {
    value: label,
    onChange: onRename,
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 15,
      fontWeight: 500,
      color: DC.label,
      lineHeight: 1
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "dc-btns"
  }, /*#__PURE__*/React.createElement("div", {
    ref: menuRef,
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "dc-kebab",
    title: "More",
    onClick: () => setMenuOpen(o => !o)
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "2.5",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "6",
    r: "1.1"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9.5",
    cy: "6",
    r: "1.1"
  }))), menuOpen && /*#__PURE__*/React.createElement("div", {
    className: "dc-menu",
    onPointerDown: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('png')
  }, "Download PNG"), /*#__PURE__*/React.createElement("button", {
    onClick: () => doExport('html')
  }, "Download HTML"), /*#__PURE__*/React.createElement("hr", null), /*#__PURE__*/React.createElement("button", {
    className: "dc-danger",
    onClick: () => {
      if (confirming) {
        setMenuOpen(false);
        onDelete();
      } else setConfirming(true);
    }
  }, confirming ? 'Click again to delete' : 'Delete'))), /*#__PURE__*/React.createElement("button", {
    className: "dc-expand",
    onClick: onFocus,
    title: "Focus"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M7 1h4v4M5 11H1V7M11 1L7.5 4.5M1 11l3.5-3.5"
  }))))), /*#__PURE__*/React.createElement("div", {
    ref: cardRef,
    className: "dc-card",
    style: {
      borderRadius: 2,
      boxShadow: '0 1px 3px rgba(0,0,0,.08),0 4px 16px rgba(0,0,0,.06)',
      overflow: 'hidden',
      width,
      height,
      background: '#fff',
      ...style
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb',
      fontSize: 13,
      fontFamily: DC.font
    }
  }, id)));
}

// Inline rename — commits on blur or Enter.
function DCEditable({
  value,
  onChange,
  style,
  tag = 'span',
  onClick
}) {
  const T = tag;
  return /*#__PURE__*/React.createElement(T, {
    className: "dc-editable",
    contentEditable: true,
    suppressContentEditableWarning: true,
    onClick: onClick,
    onPointerDown: e => e.stopPropagation(),
    onBlur: e => onChange && onChange(e.currentTarget.textContent),
    onKeyDown: e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.currentTarget.blur();
      }
    },
    style: style
  }, value);
}

// ─────────────────────────────────────────────────────────────
// Focus mode — overlay one artboard; ←/→ within section, ↑/↓ across
// sections, Esc or backdrop click to exit.
// ─────────────────────────────────────────────────────────────
function DCFocusOverlay({
  entry,
  sectionMeta,
  sectionOrder
}) {
  const ctx = React.useContext(DCCtx);
  const {
    sectionId,
    artboard
  } = entry;
  const sec = ctx.section(sectionId);
  const meta = sectionMeta[sectionId];
  const peers = meta.slotIds;
  const aid = artboard.props.id ?? artboard.props.label;
  const idx = peers.indexOf(aid);
  const secIdx = sectionOrder.indexOf(sectionId);
  const go = d => {
    const n = peers[(idx + d + peers.length) % peers.length];
    if (n) ctx.setFocus(`${sectionId}/${n}`);
  };
  const goSection = d => {
    // Sections whose artboards are all deleted have slotIds:[] — step past
    // them to the next non-empty section so ↑/↓ doesn't dead-end.
    const n = sectionOrder.length;
    for (let i = 1; i < n; i++) {
      const ns = sectionOrder[((secIdx + d * i) % n + n) % n];
      const first = sectionMeta[ns] && sectionMeta[ns].slotIds[0];
      if (first) {
        ctx.setFocus(`${ns}/${first}`);
        return;
      }
    }
  };
  React.useEffect(() => {
    const k = e => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goSection(-1);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goSection(1);
      }
    };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  });
  const {
    width = 260,
    height = 480,
    children
  } = artboard.props;
  const [vp, setVp] = React.useState({
    w: window.innerWidth,
    h: window.innerHeight
  });
  React.useEffect(() => {
    const r = () => setVp({
      w: window.innerWidth,
      h: window.innerHeight
    });
    window.addEventListener('resize', r);
    return () => window.removeEventListener('resize', r);
  }, []);
  const scale = Math.max(0.1, Math.min((vp.w - 200) / width, (vp.h - 260) / height, 2));
  const [ddOpen, setDd] = React.useState(false);
  const Arrow = ({
    dir,
    onClick
  }) => /*#__PURE__*/React.createElement("button", {
    onClick: e => {
      e.stopPropagation();
      onClick();
    },
    style: {
      position: 'absolute',
      top: '50%',
      [dir]: 28,
      transform: 'translateY(-50%)',
      border: 'none',
      background: 'rgba(255,255,255,.08)',
      color: 'rgba(255,255,255,.9)',
      width: 44,
      height: 44,
      borderRadius: 22,
      fontSize: 18,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'background .15s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.18)',
    onMouseLeave: e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 18 18",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: dir === 'left' ? 'M11 3L5 9l6 6' : 'M7 3l6 6-6 6'
  })));

  // Portal to body so position:fixed is the real viewport regardless of any
  // transform on DesignCanvas's ancestors (including the canvas zoom itself).
  return ReactDOM.createPortal(/*#__PURE__*/React.createElement("div", {
    onClick: () => ctx.setFocus(null),
    onWheel: e => e.preventDefault(),
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      background: 'rgba(24,20,16,.6)',
      backdropFilter: 'blur(14px)',
      fontFamily: DC.font,
      color: '#fff'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 72,
      display: 'flex',
      alignItems: 'flex-start',
      padding: '16px 20px 0',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setDd(o => !o),
    style: {
      border: 'none',
      background: 'transparent',
      color: '#fff',
      cursor: 'pointer',
      padding: '6px 8px',
      borderRadius: 6,
      textAlign: 'left',
      fontFamily: 'inherit'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 18,
      fontWeight: 600,
      letterSpacing: -0.3
    }
  }, meta.title), /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "11",
    viewBox: "0 0 11 11",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.8",
    strokeLinecap: "round",
    style: {
      opacity: .7
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M2 4l3.5 3.5L9 4"
  }))), meta.subtitle && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      fontSize: 13,
      opacity: .6,
      fontWeight: 400,
      marginTop: 2
    }
  }, meta.subtitle)), ddOpen && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '100%',
      left: 0,
      marginTop: 4,
      background: '#2a251f',
      borderRadius: 8,
      boxShadow: '0 8px 32px rgba(0,0,0,.4)',
      padding: 4,
      minWidth: 200,
      zIndex: 10
    }
  }, sectionOrder.filter(sid => sectionMeta[sid].slotIds.length).map(sid => /*#__PURE__*/React.createElement("button", {
    key: sid,
    onClick: () => {
      setDd(false);
      const f = sectionMeta[sid].slotIds[0];
      if (f) ctx.setFocus(`${sid}/${f}`);
    },
    style: {
      display: 'block',
      width: '100%',
      textAlign: 'left',
      border: 'none',
      cursor: 'pointer',
      background: sid === sectionId ? 'rgba(255,255,255,.1)' : 'transparent',
      color: '#fff',
      padding: '8px 12px',
      borderRadius: 5,
      fontSize: 14,
      fontWeight: sid === sectionId ? 600 : 400,
      fontFamily: 'inherit'
    }
  }, sectionMeta[sid].title)))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    onClick: () => ctx.setFocus(null),
    onMouseEnter: e => e.currentTarget.style.background = 'rgba(255,255,255,.12)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    style: {
      border: 'none',
      background: 'transparent',
      color: 'rgba(255,255,255,.7)',
      width: 32,
      height: 32,
      borderRadius: 16,
      fontSize: 20,
      cursor: 'pointer',
      lineHeight: 1,
      transition: 'background .12s'
    }
  }, "\xD7")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 64,
      bottom: 56,
      left: 100,
      right: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      width: width * scale,
      height: height * scale,
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      transform: `scale(${scale})`,
      transformOrigin: 'top left',
      background: '#fff',
      borderRadius: 2,
      overflow: 'hidden',
      boxShadow: '0 20px 80px rgba(0,0,0,.4)'
    }
  }, children || /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#bbb'
    }
  }, aid))), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      fontSize: 14,
      fontWeight: 500,
      opacity: .85,
      textAlign: 'center'
    }
  }, (sec.labels || {})[aid] ?? artboard.props.label, /*#__PURE__*/React.createElement("span", {
    style: {
      opacity: .5,
      marginLeft: 10,
      fontVariantNumeric: 'tabular-nums'
    }
  }, idx + 1, " / ", peers.length))), /*#__PURE__*/React.createElement(Arrow, {
    dir: "left",
    onClick: () => go(-1)
  }), /*#__PURE__*/React.createElement(Arrow, {
    dir: "right",
    onClick: () => go(1)
  }), /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: 8
    }
  }, peers.map((p, i) => /*#__PURE__*/React.createElement("button", {
    key: p,
    onClick: () => ctx.setFocus(`${sectionId}/${p}`),
    style: {
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      width: 6,
      height: 6,
      borderRadius: 3,
      background: i === idx ? '#fff' : 'rgba(255,255,255,.3)'
    }
  })))), document.body);
}

// ─────────────────────────────────────────────────────────────
// Post-it — absolute-positioned sticky note
// ─────────────────────────────────────────────────────────────
function DCPostIt({
  children,
  top,
  left,
  right,
  bottom,
  rotate = -2,
  width = 180
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top,
      left,
      right,
      bottom,
      width,
      background: DC.postitBg,
      padding: '14px 16px',
      fontFamily: '"Comic Sans MS", "Marker Felt", "Segoe Print", cursive',
      fontSize: 14,
      lineHeight: 1.4,
      color: DC.postitText,
      boxShadow: '0 2px 8px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
      transform: `rotate(${rotate}deg)`,
      zIndex: 5
    }
  }, children);
}
Object.assign(window, {
  DesignCanvas,
  DCSection,
  DCArtboard,
  DCPostIt
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "design-canvas.jsx", error: String((e && e.message) || e) }); }

// screens/AuthIcons.jsx
try { (() => {
// Extended icons for screens/* — adds Lucide-style auth/state icons
// to the existing window.Icon (defined in ui_kits/mobile/Icons.jsx).
// Each entry: [path-strokes] and optional E (extra fixed elements).
window.AuthIcon = function AuthIcon({
  name,
  size = 22,
  color = "currentColor",
  stroke = 1.75
}) {
  const D = {
    mail: ["M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z", "M22 6l-10 7L2 6"],
    lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 1 1 8 0v4"],
    eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"],
    "eye-off": ["M17.94 17.94A10.94 10.94 0 0 1 12 19c-6.5 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94", "M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19", "M1 1l22 22", "M14.12 14.12a3 3 0 1 1-4.24-4.24"],
    user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"],
    phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"],
    building: ["M3 21h18", "M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16", "M9 9h.01", "M15 9h.01", "M9 13h.01", "M15 13h.01", "M9 17h.01", "M15 17h.01"],
    "arrow-right": ["M5 12h14", "M12 5l7 7-7 7"],
    "arrow-left": ["M19 12H5", "M12 19l-7-7 7-7"],
    back: ["M19 12H5", "M12 19l-7-7 7-7"],
    "chev-right": ["M9 6l6 6-6 6"],
    "chev-down": ["M6 9l6 6 6-6"],
    check: ["M20 6 9 17l-5-5"],
    "check-circle": ["M22 11.08V12a10 10 0 1 1-5.93-9.14", "M22 4 12 14.01l-3-3"],
    x: ["M18 6 6 18", "M6 6l12 12"],
    "alert-circle": ["M12 8v4", "M12 16h.01"],
    "alert-triangle": ["M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z", "M12 9v4", "M12 17h.01"],
    info: ["M12 16v-4", "M12 8h.01"],
    "wifi-off": ["M1 1l22 22", "M16.72 11.06A10.94 10.94 0 0 1 19 12.55", "M5 12.55a10.94 10.94 0 0 1 5.17-2.39", "M10.71 5.05A16 16 0 0 1 22.58 9", "M1.42 9a15.91 15.91 0 0 1 4.7-2.88", "M8.53 16.11a6 6 0 0 1 6.95 0", "M12 20h.01"],
    shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
    sparkles: ["M12 3v4", "M12 17v4", "M5 12H1", "M23 12h-4", "M5.6 5.6l2.8 2.8", "M15.6 15.6l2.8 2.8", "M5.6 18.4l2.8-2.8", "M15.6 8.4l2.8-2.8"],
    crown: ["M2 20h20", "M5 20l-2-8 5 3 4-7 4 7 5-3-2 8"],
    plus: ["M12 5v14", "M5 12h14"],
    cam: ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"],
    upload: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M17 8l-5-5-5 5", "M12 3v12"],
    image: ["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M21 15l-5-5L5 21"],
    file: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5"],
    download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "M7 10l5 5 5-5", "M12 15V3"],
    refresh: ["M23 4v6h-6", "M1 20v-6h6", "M3.51 9a9 9 0 0 1 14.85-3.36L23 10", "M1 14l4.64 4.36A9 9 0 0 0 20.49 15"],
    search: ["M21 21l-4.3-4.3"],
    pen: ["M12 20h9", "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4z"],
    trash: ["M3 6h18", "M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2", "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"],
    map: ["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"],
    star: ["M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14l-5-4.87 6.91-1.01z"],
    cal: ["M3 10h18", "M8 3v4", "M16 3v4"],
    clock: ["M12 6v6l4 2"],
    msg: ["M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"],
    whatsapp: ["M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9z", "M8 13.5a4 4 0 0 0 4 3 4 4 0 0 0 3-1.5"],
    pdf: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5"],
    bolt: ["M13 2L3 14h9l-1 8 10-12h-9z"],
    "credit-card": ["M2 7a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z", "M2 11h20"],
    "more": ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
    fingerprint: ["M12 4a8 8 0 0 0-8 8v2", "M20 14v-2a8 8 0 0 0-3-6.21", "M9 21c-2-3-2-6-2-9a5 5 0 0 1 10 0", "M12 11v5", "M8 21c-1-2-1-4-1-6", "M16 21c1-2 1-4 1-6"],
    package: ["M21 16V8l-9-5-9 5v8l9 5z", "M3.3 7 12 12l8.7-5", "M12 22V12"],
    settings: ["M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
    signature: ["M3 17c2 0 4-3 4-6s-1-5-2-5-1 3 0 7 4 6 7 6 5-3 5-3", "M14 17h6"],
    "rotate-phone": ["M5 6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z", "M19 8v6"]
  };
  const E = {
    user: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "7",
      r: "4"
    }),
    eye: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }),
    cam: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "13",
      r: "4"
    }),
    cal: /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "5",
      width: "18",
      height: "16",
      rx: "2"
    }),
    search: /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }),
    star: null,
    map: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "10",
      r: "3"
    }),
    info: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    "alert-circle": /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    clock: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    sparkles: null,
    shield: null,
    crown: null,
    fingerprint: null
  };
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, E[name] || null, (D[name] || []).map((d, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: d
  })));
};

// Brand mark used inside the dark logo tile (white outline glyph)
window.OrcivoGlyph = function OrcivoGlyph({
  size = 28,
  color = "#fff"
}) {
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 4 L26 10 L26 22 L16 28 L6 22 L6 10 Z",
    stroke: color,
    strokeWidth: "2.5",
    strokeLinejoin: "round"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 12 L20 14 L20 18 L16 20 L12 18 L12 14 Z",
    fill: color
  }));
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens/AuthIcons.jsx", error: String((e && e.message) || e) }); }

// screens/AuthMobile.jsx
try { (() => {
// Lote A — Auth & Onboarding · Mobile screens
// 5 screens: Login, Cadastro, Esqueci senha, Selecionar empresa, Criar empresa.
// Each is rendered inside an <AndroidDevice> via a wrapper in the canvas.

const {
  useState
} = React;
const I = props => /*#__PURE__*/React.createElement(AuthIcon, props);

// ─────────────────────────────────────────────────────────────
// 1 · Login
// ─────────────────────────────────────────────────────────────
function MobLogin() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top",
    style: {
      minHeight: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-logo"
  }, /*#__PURE__*/React.createElement(OrcivoGlyph, {
    size: 28
  })), /*#__PURE__*/React.createElement("h1", null, "Entrar no Orcivo"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Acesse sua conta para continuar."), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Email"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "mail",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    placeholder: "voce@exemplo.com.br",
    defaultValue: "joao@ribeiroeletrica.com.br"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Senha"), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 12
    }
  }, "Esqueci minha senha")), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "lock",
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "eye",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    type: "password",
    className: "auth-input has-leading has-trailing",
    placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
    defaultValue: "passwordpassword"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Entrar"), /*#__PURE__*/React.createElement("div", {
    className: "auth-divider"
  }, "ou"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline"
  }, /*#__PURE__*/React.createElement(I, {
    name: "fingerprint",
    size: 20,
    color: "var(--purple-700)"
  }), " Entrar com biometria"), /*#__PURE__*/React.createElement("div", {
    className: "auth-footer-link"
  }, "Ainda n\xE3o tem conta? ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link"
  }, "Criar conta"))), /*#__PURE__*/React.createElement("div", {
    className: "auth-tos"
  }, "Ao continuar voc\xEA aceita os ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 12
    }
  }, "Termos"), " e a ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 12
    }
  }, "Pol\xEDtica de privacidade"), "."));
}

// ─────────────────────────────────────────────────────────────
// 2 · Cadastro
// ─────────────────────────────────────────────────────────────
function MobSignup() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "back",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body"
  }, /*#__PURE__*/React.createElement("h1", null, "Crie sua conta"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Comece gr\xE1tis. Sem cart\xE3o de cr\xE9dito."), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Nome completo"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "user",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    placeholder: "Jo\xE3o da Silva",
    defaultValue: "Jo\xE3o Ribeiro"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Email"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "mail",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    placeholder: "voce@exemplo.com.br",
    defaultValue: "joao@ribeiroeletrica.com.br"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Celular"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "phone",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    placeholder: "(11) 90000-0000",
    defaultValue: "(11) 98123-4521"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-helper"
  }, "Usado para recuperar sua conta e notifica\xE7\xF5es.")), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Senha"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "lock",
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "eye-off",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "auth-input has-leading has-trailing",
    defaultValue: "Eletro@2026!"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pwd-strength"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pwd-bar on"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pwd-bar on"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pwd-bar on"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pwd-bar"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-helper",
    style: {
      color: "var(--success)"
    }
  }, "Senha forte \xB7 11 caracteres, s\xEDmbolo e n\xFAmero")), /*#__PURE__*/React.createElement("div", {
    className: "auth-check checked",
    style: {
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "box"
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 14
  })), /*#__PURE__*/React.createElement("div", null, "Concordo com os ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Termos de uso"), " e a ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Pol\xEDtica de privacidade"), " do Orcivo.")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Criar minha conta"), /*#__PURE__*/React.createElement("div", {
    className: "auth-footer-link"
  }, "J\xE1 tem conta? ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link"
  }, "Entrar"))));
}

// ─────────────────────────────────────────────────────────────
// 3 · Esqueci senha (variant: sent state on right of canvas)
// ─────────────────────────────────────────────────────────────
function MobForgot() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "back",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body"
  }, /*#__PURE__*/React.createElement("h1", null, "Recuperar acesso"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Informe o email cadastrado. Enviaremos um link para criar uma nova senha."), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Email"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "mail",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    placeholder: "voce@exemplo.com.br",
    defaultValue: "joao@ribeiroeletrica.com.br"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Enviar link de recupera\xE7\xE3o"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn ghost",
    style: {
      marginTop: 8
    }
  }, "Voltar para entrar"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 32,
      padding: "16px",
      background: "var(--slate-50)",
      border: "1px solid var(--border-1)",
      borderRadius: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: "var(--purple-100)",
      color: "var(--purple-700)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "shield",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-2)",
      lineHeight: "18px"
    }
  }, "Por seguran\xE7a, sempre retornamos a mesma mensagem, mesmo que o email n\xE3o esteja cadastrado.")))));
}

// 3b · Esqueci senha — estado pós-envio
function MobForgotSent() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "back",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body",
    style: {
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 72,
      height: 72,
      borderRadius: 18,
      background: "var(--success-bg)",
      color: "var(--success)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "mail",
    size: 32,
    stroke: 1.8
  })), /*#__PURE__*/React.createElement("h1", null, "Verifique seu email"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Enviamos um link de recupera\xE7\xE3o para ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, "j***@ribeiroeletrica.com.br"), ". Abra o email e clique no bot\xE3o para criar uma nova senha."), /*#__PURE__*/React.createElement("div", {
    className: "code-card",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(I, {
    name: "info",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-2)",
      lineHeight: "18px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--ink)",
      marginBottom: 2
    }
  }, "O link expira em 30 minutos"), "Caso n\xE3o receba, verifique a caixa de spam.")), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline"
  }, "Reenviar em ", /*#__PURE__*/React.createElement("strong", {
    style: {
      marginLeft: 4
    }
  }, "0:47")), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn ghost",
    style: {
      marginTop: 8
    }
  }, "Tentar outro email")));
}

// ─────────────────────────────────────────────────────────────
// 4 · Selecionar empresa
// ─────────────────────────────────────────────────────────────
function MobSelectCompany() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Sair")), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body"
  }, /*#__PURE__*/React.createElement("h1", null, "Qual empresa hoje?"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Voc\xEA pertence a 3 empresas. Escolha uma para continuar; voc\xEA pode trocar depois."), /*#__PURE__*/React.createElement("div", {
    className: "company-row selected"
  }, /*#__PURE__*/React.createElement("div", {
    className: "company-logo dark"
  }, "RE"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Ribeiro El\xE9trica"), /*#__PURE__*/React.createElement("span", {
    className: "m-badge b-brand",
    style: {
      padding: "2px 7px",
      fontSize: 10
    }
  }, "ORCIVO MAIS")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, "CNPJ \xB7 Voc\xEA \xE9 dono \xB7 3 t\xE9cnicos")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 24,
      height: 24,
      borderRadius: "50%",
      background: "var(--purple-600)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 14
  }))), /*#__PURE__*/React.createElement("div", {
    className: "company-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "company-logo"
  }, "MS"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Marcos Solar"), /*#__PURE__*/React.createElement("span", {
    className: "m-badge b-slate",
    style: {
      padding: "2px 7px",
      fontSize: 10
    }
  }, "LIVRE")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, "CNPJ \xB7 Voc\xEA \xE9 t\xE9cnico"))), /*#__PURE__*/React.createElement("div", {
    className: "company-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "company-logo soft"
  }, "JR"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Jo\xE3o Ribeiro \xB7 MEI")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, "CPF \xB7 Conta pessoal \xB7 Sem assinatura"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "add-company-row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "company-logo",
    style: {
      background: "transparent",
      border: "1.5px dashed var(--purple-300)",
      color: "var(--purple-700)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "plus",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontWeight: 600,
      fontSize: 14
    }
  }, "Criar nova empresa"), /*#__PURE__*/React.createElement(I, {
    name: "chev-right",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Continuar como Ribeiro El\xE9trica")));
}

// ─────────────────────────────────────────────────────────────
// 5 · Criar empresa (wizard step 1 of 3)
// ─────────────────────────────────────────────────────────────
function MobCreateCompany() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "back",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13,
      color: "var(--fg-3)",
      textAlign: "center",
      fontWeight: 500
    }
  }, "Passo 1 de 3"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body"
  }, /*#__PURE__*/React.createElement("h1", null, "Sobre sua empresa"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Esses dados aparecem nos seus or\xE7amentos. Voc\xEA pode editar depois."), /*#__PURE__*/React.createElement("div", {
    className: "seg"
  }, /*#__PURE__*/React.createElement("button", {
    className: "active"
  }, "CNPJ"), /*#__PURE__*/React.createElement("button", null, "CPF / aut\xF4nomo")), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "CNPJ"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    placeholder: "00.000.000/0000-00",
    defaultValue: "12.345.678/0001-90"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trailing",
    style: {
      color: "var(--success)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "check-circle",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-helper",
    style: {
      color: "var(--success)"
    }
  }, "Encontramos: Ribeiro El\xE9trica e Manuten\xE7\xE3o LTDA")), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Nome fantasia"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Ribeiro El\xE9trica"
  }), /*#__PURE__*/React.createElement("div", {
    className: "auth-helper"
  }, "Aparece no or\xE7amento e no PDF.")), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Telefone comercial"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "phone",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "(11) 4002-8922"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Segmento"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-trailing",
    defaultValue: "El\xE9trica e automa\xE7\xE3o"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "chev-down",
    size: 18
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Continuar ", /*#__PURE__*/React.createElement(I, {
    name: "arrow-right",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "wiz-dots"
  }, /*#__PURE__*/React.createElement("div", {
    className: "wiz-dot active"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wiz-dot"
  }), /*#__PURE__*/React.createElement("div", {
    className: "wiz-dot"
  }))));
}

// Export all
Object.assign(window, {
  MobLogin,
  MobSignup,
  MobForgot,
  MobForgotSent,
  MobSelectCompany,
  MobCreateCompany
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens/AuthMobile.jsx", error: String((e && e.message) || e) }); }

// screens/AuthWeb.jsx
try { (() => {
// Lote A — Auth & Onboarding · Web screens
// 3 screens: Login, Cadastro, Criar empresa (wizard).

const I = props => /*#__PURE__*/React.createElement(AuthIcon, props);

// Shared dark "art" panel
function AwArt({
  headline,
  sub,
  quote,
  who,
  role
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "aw-art"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aw-art-grid"
  }), /*#__PURE__*/React.createElement("div", {
    className: "aw-art-mark"
  }, /*#__PURE__*/React.createElement(OrcivoGlyph, {
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    className: "aw-art-words"
  }, headline && /*#__PURE__*/React.createElement("h2", null, headline), sub && /*#__PURE__*/React.createElement("p", null, sub), quote && /*#__PURE__*/React.createElement("div", {
    className: "aw-art-quote"
  }, /*#__PURE__*/React.createElement("div", {
    className: "who"
  }, /*#__PURE__*/React.createElement("div", {
    className: "av"
  }, (who || "").split(" ").map(w => w[0]).slice(0, 2).join("")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, who), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "rgba(255,255,255,0.6)"
    }
  }, role))), /*#__PURE__*/React.createElement("p", null, quote))));
}

// ─────────────────────────────────────────────────────────────
// 1 · Login (web)
// ─────────────────────────────────────────────────────────────
function WebLogin() {
  return /*#__PURE__*/React.createElement("div", {
    className: "aw-shell"
  }, /*#__PURE__*/React.createElement(AwArt, {
    headline: "Or\xE7amentos profissionais. Em minutos.",
    sub: "A plataforma feita para t\xE9cnicos instaladores criarem or\xE7amentos, organizarem servi\xE7os e atenderem melhor seus clientes pelo celular e pelo computador.",
    quote: "Antes eu fazia or\xE7amento no Word \xE0s 22h. Agora eu fa\xE7o no celular dentro do cliente, e ele j\xE1 assina ali.",
    who: "Marcos Pereira",
    role: "El\xE9trica \xB7 S\xE3o Paulo"
  }), /*#__PURE__*/React.createElement("div", {
    className: "aw-form-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aw-form-top"
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", {
    className: "mini-link"
  }, "Novo no Orcivo? ", /*#__PURE__*/React.createElement("a", null, "Criar conta gr\xE1tis"))), /*#__PURE__*/React.createElement("div", {
    className: "aw-form-center"
  }, /*#__PURE__*/React.createElement("h1", null, "Entrar na sua conta"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Bom te ver de novo."), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Email"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "mail",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "joao@ribeiroeletrica.com.br"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline"
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Senha"), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 12
    }
  }, "Esqueci minha senha")), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "lock",
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "eye",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    type: "password",
    className: "auth-input has-leading has-trailing",
    defaultValue: "passwordpassword"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-check checked",
    style: {
      padding: "4px 0 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "box"
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 14
  })), /*#__PURE__*/React.createElement("div", null, "Manter conectado neste computador")), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Entrar")), /*#__PURE__*/React.createElement("div", {
    className: "aw-form-foot"
  }, "\xA9 2026 Orcivo \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 12
    }
  }, "Termos"), " \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 12
    }
  }, "Privacidade"), " \xB7 ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 12
    }
  }, "Suporte"))));
}

// ─────────────────────────────────────────────────────────────
// 2 · Cadastro (web)
// ─────────────────────────────────────────────────────────────
function WebSignup() {
  return /*#__PURE__*/React.createElement("div", {
    className: "aw-shell"
  }, /*#__PURE__*/React.createElement(AwArt, {
    headline: "Comece gr\xE1tis. Cres\xE7a quando precisar.",
    sub: "Comece gr\xE1tis, sem cart\xE3o. Depois, escolha o plano que cabe no seu m\xEAs ou continue no plano Livre.",
    quote: "Migrei do Excel num s\xE1bado e na segunda j\xE1 estava enviando or\xE7amento com a minha marca.",
    who: "Ana Souza",
    role: "Refrigera\xE7\xE3o \xB7 Guarulhos"
  }), /*#__PURE__*/React.createElement("div", {
    className: "aw-form-col"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aw-form-top"
  }, /*#__PURE__*/React.createElement("div", null), /*#__PURE__*/React.createElement("div", {
    className: "mini-link"
  }, "J\xE1 tem conta? ", /*#__PURE__*/React.createElement("a", null, "Entrar"))), /*#__PURE__*/React.createElement("div", {
    className: "aw-form-center",
    style: {
      maxWidth: 420
    }
  }, /*#__PURE__*/React.createElement("h1", null, "Criar sua conta"), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Em 1 minuto voc\xEA j\xE1 est\xE1 fazendo seu primeiro or\xE7amento."), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Nome completo"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "user",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "Jo\xE3o Ribeiro"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Email"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "mail",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "joao@ribeiroeletrica.com.br"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "aw-grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Celular"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "phone",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "(11) 98123-4521"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Como voc\xEA se chama no app?"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Jo\xE3o"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Senha"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "lock",
    size: 18
  })), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "eye-off",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    type: "text",
    className: "auth-input has-leading has-trailing",
    defaultValue: "Eletro@2026!"
  })), /*#__PURE__*/React.createElement("div", {
    className: "pwd-strength"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pwd-bar on"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pwd-bar on"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pwd-bar on"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pwd-bar"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-helper",
    style: {
      color: "var(--success)"
    }
  }, "Senha forte \xB7 11 caracteres, s\xEDmbolo e n\xFAmero")), /*#__PURE__*/React.createElement("div", {
    className: "auth-check checked",
    style: {
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "box"
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 14
  })), /*#__PURE__*/React.createElement("div", null, "Concordo com os ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Termos de uso"), " e a ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Pol\xEDtica de privacidade"), ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Criar minha conta gr\xE1tis"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 14,
      color: "var(--fg-3)",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "shield",
    size: 14
  }), " N\xE3o pedimos cart\xE3o \xB7 cancele quando quiser")), /*#__PURE__*/React.createElement("div", {
    className: "aw-form-foot"
  }, "\xA9 2026 Orcivo")));
}

// ─────────────────────────────────────────────────────────────
// 3 · Criar empresa (web wizard, step 2 of 3)
// ─────────────────────────────────────────────────────────────
function WebCreateCompany() {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--slate-50)",
      height: "100%",
      width: "100%",
      display: "flex",
      flexDirection: "column"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 60,
      background: "#fff",
      borderBottom: "1px solid var(--border-1)",
      padding: "0 32px",
      display: "flex",
      alignItems: "center",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 9,
      background: "linear-gradient(135deg,#0A0A0F,#6D28D9)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(OrcivoGlyph, {
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 16,
      letterSpacing: "-0.01em"
    }
  }, "Orcivo"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: "50%",
      background: "var(--purple-100)",
      color: "var(--purple-800)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: 12
    }
  }, "JR"), "Jo\xE3o Ribeiro")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "48px 32px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      maxWidth: 680
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aw-steps"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aw-step done"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, "Conta")), /*#__PURE__*/React.createElement("div", {
    className: "aw-step-sep"
  }), /*#__PURE__*/React.createElement("div", {
    className: "aw-step active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "2"), /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, "Empresa")), /*#__PURE__*/React.createElement("div", {
    className: "aw-step-sep"
  }), /*#__PURE__*/React.createElement("div", {
    className: "aw-step"
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "3"), /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, "Identidade"))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 16,
      padding: "32px 36px"
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 24,
      lineHeight: "32px",
      fontWeight: 700,
      letterSpacing: "-0.015em",
      margin: "0 0 6px"
    }
  }, "Cadastre sua empresa"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--fg-3)",
      fontSize: 14,
      margin: "0 0 24px"
    }
  }, "Esses dados aparecem no PDF do or\xE7amento e no perfil p\xFAblico dos seus clientes."), /*#__PURE__*/React.createElement("div", {
    className: "seg",
    style: {
      maxWidth: 320
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "active"
  }, "CNPJ"), /*#__PURE__*/React.createElement("button", null, "CPF / aut\xF4nomo")), /*#__PURE__*/React.createElement("div", {
    className: "aw-grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "CNPJ"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-trailing",
    defaultValue: "12.345.678/0001-90"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trailing",
    style: {
      color: "var(--success)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "check-circle",
    size: 18
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-helper",
    style: {
      color: "var(--success)"
    }
  }, "Ribeiro El\xE9trica e Manuten\xE7\xE3o LTDA")), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Inscri\xE7\xE3o estadual ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      fontWeight: 400
    }
  }, "(opcional)")), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    placeholder: "000.000.000.000"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "aw-grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Nome fantasia"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Ribeiro El\xE9trica"
  }), /*#__PURE__*/React.createElement("div", {
    className: "auth-helper"
  }, "Aparece no PDF e nas comunica\xE7\xF5es.")), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Raz\xE3o social"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Ribeiro El\xE9trica e Manuten\xE7\xE3o LTDA"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "aw-grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Telefone comercial"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "phone",
    size: 18
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "(11) 4002-8922"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Segmento principal"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-trailing",
    defaultValue: "El\xE9trica e automa\xE7\xE3o"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "chev-down",
    size: 18
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Tamanho da equipe"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, ["Só eu", "2-3 técnicos", "4-8 técnicos", "9+"].map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "10px 16px",
      borderRadius: 10,
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      border: "1px solid " + (i === 1 ? "var(--purple-600)" : "var(--border-1)"),
      background: i === 1 ? "var(--purple-50)" : "#fff",
      color: i === 1 ? "var(--purple-800)" : "var(--ink)"
    }
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 20,
      paddingTop: 20,
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn ghost",
    style: {
      width: "auto",
      padding: "0 16px"
    }
  }, "\u2190 Voltar"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      width: "auto",
      padding: "0 16px"
    }
  }, "Pular por agora"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      width: "auto",
      padding: "0 20px"
    }
  }, "Continuar ", /*#__PURE__*/React.createElement(I, {
    name: "arrow-right",
    size: 18
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "center",
      marginTop: 18,
      color: "var(--fg-3)",
      fontSize: 13
    }
  }, "Precisa de ajuda? ", /*#__PURE__*/React.createElement("span", {
    className: "auth-link"
  }, "Fale com a gente")))));
}
Object.assign(window, {
  WebLogin,
  WebSignup,
  WebCreateCompany
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens/AuthWeb.jsx", error: String((e && e.message) || e) }); }

// screens/FormsMobile.jsx
try { (() => {
// Lote B — Forms · Mobile screens
// 1. Novo cliente
// 2. Novo item de catálogo
// 3. Coletar assinatura (horizontal/landscape)
// 4. Fotos da OS

const I = props => /*#__PURE__*/React.createElement(AuthIcon, props);

// ─────────────  1. Novo cliente ───────────── //
function MobNewCustomer() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "x",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 15,
      fontWeight: 600,
      textAlign: "center"
    }
  }, "Novo cliente"), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Salvar")), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body",
    style: {
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "seg",
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "active"
  }, /*#__PURE__*/React.createElement(I, {
    name: "user",
    size: 14
  }), " Pessoa"), /*#__PURE__*/React.createElement("button", null, /*#__PURE__*/React.createElement(I, {
    name: "building",
    size: 14
  }), " Empresa")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      alignItems: "center",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 18,
      background: "var(--purple-100)",
      color: "var(--purple-800)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 22
    }
  }, "MP"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      fontWeight: 600,
      letterSpacing: "0.06em"
    }
  }, "Avatar"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--fg-2)",
      marginTop: 2
    }
  }, "Gerado a partir do nome"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      height: 34,
      marginTop: 8,
      width: "auto",
      padding: "0 12px",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "image",
    size: 14
  }), " Alterar foto"))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Nome completo"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Marcos Pereira"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Telefone principal"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "whatsapp",
    size: 18,
    color: "var(--success)"
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "(11) 98123-4521"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--success)",
      background: "var(--success-bg)",
      padding: "3px 7px",
      borderRadius: 6
    }
  }, "WhatsApp")))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Email ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      fontWeight: 400
    }
  }, "(opcional)")), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "marcos.p@gmail.com"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "CPF ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      fontWeight: 400
    }
  }, "(opcional)")), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    placeholder: "000.000.000-00"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 16px",
      border: "1px solid var(--border-1)",
      borderRadius: 14,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "map",
    size: 18,
    color: "var(--purple-700)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      flex: 1
    }
  }, "Endere\xE7o"), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Buscar CEP")), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "CEP"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "04567-010"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Rua"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Av. das Na\xE7\xF5es"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "N\xFAmero"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "412"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Etiquetas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap"
    }
  }, [["Residência", true], ["Recorrente", true], ["Indicação", false]].map(([t, on], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "6px 12px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      background: on ? "var(--purple-50)" : "transparent",
      color: on ? "var(--purple-800)" : "var(--fg-2)",
      border: "1px solid " + (on ? "var(--purple-200)" : "var(--border-1)"),
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, on && /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 11
  }), t)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 12px",
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 600,
      color: "var(--purple-700)",
      border: "1px dashed var(--purple-300)",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 4
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "plus",
    size: 12
  }), " adicionar"))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 8
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Salvar cliente")));
}

// ─────────────  2. Novo item de catálogo ───────────── //
function MobNewCatalogItem() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "x",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 15,
      fontWeight: 600,
      textAlign: "center"
    }
  }, "Novo item"), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Salvar")), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body",
    style: {
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "seg",
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "active"
  }, /*#__PURE__*/React.createElement(I, {
    name: "bolt",
    size: 14
  }), " Servi\xE7o"), /*#__PURE__*/React.createElement("button", null, /*#__PURE__*/React.createElement(I, {
    name: "package",
    size: 14
  }), " Produto")), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Nome do servi\xE7o"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Instala\xE7\xE3o de quadro el\xE9trico"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Descri\xE7\xE3o ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      fontWeight: 400
    }
  }, "(aparece no or\xE7amento)")), /*#__PURE__*/React.createElement("textarea", {
    className: "auth-input",
    rows: "3",
    style: {
      height: 96,
      padding: "12px 14px",
      resize: "none"
    },
    defaultValue: "Inclui montagem do quadro, disjuntores de prote\xE7\xE3o, identifica\xE7\xE3o dos circuitos e teste final."
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Unidade"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-trailing",
    defaultValue: "hora"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "chev-down",
    size: 18
  })))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Pre\xE7o unit\xE1rio"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading",
    style: {
      color: "var(--fg-2)",
      fontSize: 14,
      fontWeight: 600
    }
  }, "R$"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "120,00",
    style: {
      textAlign: "right",
      paddingRight: 14,
      fontVariantNumeric: "tabular-nums"
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Custo interno ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      fontWeight: 400
    }
  }, "(opcional \xB7 s\xF3 voc\xEA v\xEA)")), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading",
    style: {
      color: "var(--fg-2)",
      fontSize: 14,
      fontWeight: 600
    }
  }, "R$"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "42,00",
    style: {
      fontVariantNumeric: "tabular-nums"
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Margem"), /*#__PURE__*/React.createElement("div", {
    className: "v",
    style: {
      color: "var(--success)"
    }
  }, "+ 65%")), /*#__PURE__*/React.createElement("div", {
    className: "kpi-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Lucro / hora"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "R$ 78,00"))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field"
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Categoria"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-trailing",
    defaultValue: "Instala\xE7\xF5es"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "chev-down",
    size: 18
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      marginBottom: 14,
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--purple-50)",
      color: "var(--purple-700)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "star",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, "Item favorito"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Aparece no topo do cat\xE1logo")), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 42,
      height: 24,
      borderRadius: 9999,
      background: "var(--purple-600)",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 2,
      right: 2,
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "#fff"
    }
  }))), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Salvar no cat\xE1logo")));
}

// ─────────────  3. Coletar assinatura (horizontal / landscape) ───────────── //
function MobSignature() {
  // SVG of a hand-drawn signature line — placeholder ink stroke
  const stroke = "M 30 130 C 70 110, 110 150, 150 120 S 230 80, 270 130 S 360 160, 420 100 S 540 50, 600 100";
  return /*#__PURE__*/React.createElement("div", {
    className: "sig-stage"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 18,
      left: 18,
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "rgba(255,255,255,0.08)",
      border: "1px solid rgba(255,255,255,0.14)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "x",
    size: 20,
    color: "#fff"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "rgba(255,255,255,0.7)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: "#fff"
    }
  }, "Or\xE7amento #248 \xB7 Construtora Vila Nova"), "Total ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "#fff"
    }
  }, "R$ 4.480,00"), " \xB7 validade 30 dias")), /*#__PURE__*/React.createElement("div", {
    className: "sig-instr"
  }, /*#__PURE__*/React.createElement(I, {
    name: "rotate-phone",
    size: 16
  }), " Gire o celular para assinar no espa\xE7o maior"), /*#__PURE__*/React.createElement("div", {
    className: "sig-pad"
  }, /*#__PURE__*/React.createElement("div", {
    className: "canvas"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 700 200",
    width: "100%",
    height: "100%",
    preserveAspectRatio: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: stroke,
    fill: "none",
    stroke: "#0A0A0F",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "baseline"
  }), /*#__PURE__*/React.createElement("div", {
    className: "x-mark"
  }, "\xD7"), /*#__PURE__*/React.createElement("div", {
    className: "who-label"
  }, /*#__PURE__*/React.createElement("span", null, "Assinante"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("strong", null, "Marcos Pereira"), " \xB7 s\xF3cio"))), /*#__PURE__*/React.createElement("div", {
    className: "sig-footer"
  }, /*#__PURE__*/React.createElement("button", {
    className: "clear"
  }, /*#__PURE__*/React.createElement(I, {
    name: "refresh",
    size: 16
  }), " Limpar"), /*#__PURE__*/React.createElement("button", {
    className: "confirm"
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 18
  }), " Confirmar assinatura")));
}

// ─────────────  4. Fotos da OS ───────────── //
function MobOSPhotos() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "back",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 15,
      fontWeight: 600,
      textAlign: "center"
    }
  }, "OS #112 \xB7 Fotos"), /*#__PURE__*/React.createElement(I, {
    name: "more",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body",
    style: {
      paddingTop: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "cap-tabs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "active"
  }, "Antes ", /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, "3")), /*#__PURE__*/React.createElement("div", null, "Durante ", /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, "1")), /*#__PURE__*/React.createElement("div", null, "Depois ", /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, "5"))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      borderRadius: 12,
      background: "var(--purple-50)",
      border: "1px solid var(--purple-100)",
      display: "flex",
      gap: 10,
      alignItems: "flex-start",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 8,
      background: "var(--purple-100)",
      color: "var(--purple-700)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "info",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--purple-900)",
      lineHeight: "18px"
    }
  }, "Esta empresa exige ", /*#__PURE__*/React.createElement("strong", null, "fotos antes e depois"), " para finalizar a OS. Toque numa foto para anotar.")), /*#__PURE__*/React.createElement("div", {
    className: "photo-grid",
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "photo-tile"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ph"
  }), /*#__PURE__*/React.createElement("div", {
    className: "tag"
  }, "09:14"), /*#__PURE__*/React.createElement("div", {
    className: "check"
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 12
  }))), /*#__PURE__*/React.createElement("div", {
    className: "photo-tile"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ph",
    style: {
      background: "repeating-linear-gradient(45deg, #cbd5e1 0 10px, #94a3b8 10px 20px)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "tag"
  }, "09:17")), /*#__PURE__*/React.createElement("div", {
    className: "photo-tile"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ph",
    style: {
      background: "repeating-linear-gradient(90deg, #e2e8f0 0 6px, #cbd5e1 6px 12px)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "tag"
  }, "09:22")), /*#__PURE__*/React.createElement("div", {
    className: "photo-tile add"
  }, /*#__PURE__*/React.createElement(I, {
    name: "cam",
    size: 26
  }), /*#__PURE__*/React.createElement("div", null, "C\xE2mera")), /*#__PURE__*/React.createElement("div", {
    className: "photo-tile add"
  }, /*#__PURE__*/React.createElement(I, {
    name: "upload",
    size: 26
  }), /*#__PURE__*/React.createElement("div", null, "Galeria")), /*#__PURE__*/React.createElement("div", {
    className: "photo-tile",
    style: {
      background: "transparent",
      border: "1px solid var(--border-2)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "section-h"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--fg-2)",
      textTransform: "uppercase",
      letterSpacing: "0.06em"
    }
  }, "Notas das fotos \xB7 1")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: 14,
      display: "flex",
      gap: 10,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 10,
      background: "var(--slate-200)",
      flexShrink: 0,
      position: "relative",
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      inset: 0,
      background: "repeating-linear-gradient(45deg, #cbd5e1 0 6px, #e2e8f0 6px 12px)"
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--ink)",
      lineHeight: "18px"
    }
  }, "Quadro original com fia\xE7\xE3o exposta e disjuntor antigo sem identifica\xE7\xE3o."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 4
    }
  }, "Foto 1 \xB7 09:14 \xB7 Jo\xE3o Ribeiro"))), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, /*#__PURE__*/React.createElement(I, {
    name: "cam",
    size: 18
  }), " Tirar foto")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 24,
      padding: "0 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--ink)",
      color: "#fff",
      padding: "12px 14px",
      borderRadius: 12,
      display: "flex",
      gap: 10,
      alignItems: "center",
      fontSize: 13,
      boxShadow: "var(--shadow-pop)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "var(--success)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, "9 fotos \xB7 todas sincronizadas"), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "rgba(255,255,255,0.6)",
      fontSize: 12
    }
  }, "2,4 MB"))));
}
Object.assign(window, {
  MobNewCustomer,
  MobNewCatalogItem,
  MobSignature,
  MobOSPhotos
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens/FormsMobile.jsx", error: String((e && e.message) || e) }); }

// screens/FormsWeb.jsx
try { (() => {
// Lote B — Forms · Web screens
// 1. Novo cliente (modal-like full page)
// 2. Cliente detalhe com 6 abas

const I = props => /*#__PURE__*/React.createElement(AuthIcon, props);
function AppShell({
  active = "Clientes",
  crumb,
  children
}) {
  const nav = [["building", "Início"], ["user", "Clientes"], ["package", "Catálogo"], ["file", "Orçamentos"], ["pen", "Ordens de serviço"], ["cal", "Agenda"], ["credit-card", "Financeiro"], ["settings", "Configurações"]];
  const iconFor = k => k;
  return /*#__PURE__*/React.createElement("div", {
    className: "app-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-sb"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-mark"
  }, /*#__PURE__*/React.createElement(OrcivoGlyph, {
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "brand-name"
  }, "Orcivo")), nav.map(([k, l], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "item" + (l === active ? " active" : "")
  }, /*#__PURE__*/React.createElement(I, {
    name: iconFor(k),
    size: 16
  }), l)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      padding: "10px 8px",
      display: "flex",
      gap: 10,
      alignItems: "center",
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: "50%",
      background: "var(--purple-100)",
      color: "var(--purple-800)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: 12
    }
  }, "JR"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, "Jo\xE3o Ribeiro"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, "Ribeiro El\xE9trica")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      minHeight: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "app-tb"
  }, crumb, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "relative",
      width: 280
    }
  }, /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    style: {
      height: 36,
      paddingLeft: 36,
      fontSize: 13,
      background: "var(--slate-50)"
    },
    placeholder: "Buscar cliente, or\xE7amento, OS\u2026"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 9,
      left: 11,
      color: "var(--slate-400)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "search",
    size: 16
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: "auto"
    }
  }, children)));
}

// ─────────────  1. Novo cliente (web) ───────────── //

function WebNewCustomer() {
  return /*#__PURE__*/React.createElement(AppShell, {
    active: "Clientes",
    crumb: /*#__PURE__*/React.createElement("div", {
      className: "crumb"
    }, /*#__PURE__*/React.createElement("span", null, "Clientes"), " \xB7 ", /*#__PURE__*/React.createElement("strong", null, "Novo cliente"))
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 32px",
      maxWidth: 1100
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 24,
      lineHeight: "30px",
      fontWeight: 700,
      letterSpacing: "-0.015em",
      margin: 0
    }
  }, "Novo cliente"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--fg-3)",
      fontSize: 14,
      marginTop: 4,
      marginBottom: 0
    }
  }, "Cadastre uma vez, use em or\xE7amentos, OS e cobran\xE7as.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn ghost",
    style: {
      width: "auto",
      padding: "0 14px",
      height: 38
    }
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      width: "auto",
      padding: "0 14px",
      height: 38
    }
  }, "Salvar e novo"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      width: "auto",
      padding: "0 18px",
      height: 38
    }
  }, "Salvar cliente"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 320px",
      gap: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: "20px 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 18,
      alignItems: "center",
      marginBottom: 18,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "seg",
    style: {
      padding: 4,
      width: 280,
      margin: 0,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "active"
  }, /*#__PURE__*/React.createElement(I, {
    name: "user",
    size: 14
  }), " Pessoa f\xEDsica"), /*#__PURE__*/React.createElement("button", null, /*#__PURE__*/React.createElement(I, {
    name: "building",
    size: 14
  }), " Empresa")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap"
    }
  }, [["Residência", true], ["Recorrente", true], ["VIP", false]].map(([t, on], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "5px 11px",
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600,
      background: on ? "var(--purple-50)" : "transparent",
      color: on ? "var(--purple-800)" : "var(--fg-2)",
      border: "1px solid " + (on ? "var(--purple-200)" : "var(--border-1)"),
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      flexShrink: 0
    }
  }, on && /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 11
  }), t)), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "5px 11px",
      borderRadius: 9999,
      fontSize: 11,
      fontWeight: 600,
      color: "var(--purple-700)",
      border: "1px dashed var(--purple-300)",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "plus",
    size: 11
  }), " etiqueta"))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--fg-2)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      margin: "0 0 12px"
    }
  }, "Dados b\xE1sicos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "2fr 1fr",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Nome completo *"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Marcos Pereira"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "CPF"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    placeholder: "000.000.000-00"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 14,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Telefone principal *"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("span", {
    className: "leading"
  }, /*#__PURE__*/React.createElement(I, {
    name: "whatsapp",
    size: 18,
    color: "var(--success)"
  })), /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-leading",
    defaultValue: "(11) 98123-4521"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Telefone secund\xE1rio"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    placeholder: "\u2014"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Email"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "marcos.p@gmail.com"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: "20px 22px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--fg-2)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      margin: 0,
      flex: 1
    }
  }, "Endere\xE7o"), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "map",
    size: 14
  }), " \xA0Buscar por CEP")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "180px 1fr 120px 200px",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "CEP"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "04567-010"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Rua"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Av. das Na\xE7\xF5es"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "N\xFAmero"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "412"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Complemento"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "apto 73"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 120px",
      gap: 14,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Bairro"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "Vila Nova"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "Cidade"), /*#__PURE__*/React.createElement("input", {
    className: "auth-input",
    defaultValue: "S\xE3o Paulo"
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-field",
    style: {
      marginBottom: 0
    }
  }, /*#__PURE__*/React.createElement("label", {
    className: "lbl"
  }, "UF"), /*#__PURE__*/React.createElement("div", {
    className: "auth-input-wrap"
  }, /*#__PURE__*/React.createElement("input", {
    className: "auth-input has-trailing",
    defaultValue: "SP"
  }), /*#__PURE__*/React.createElement("span", {
    className: "trailing"
  }, /*#__PURE__*/React.createElement(I, {
    name: "chev-down",
    size: 16
  })))))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: "20px 22px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--fg-2)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      margin: "0 0 12px"
    }
  }, "Observa\xE7\xF5es internas ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      textTransform: "none",
      letterSpacing: 0,
      fontWeight: 400
    }
  }, "\xB7 s\xF3 voc\xEA e sua equipe veem")), /*#__PURE__*/React.createElement("textarea", {
    className: "auth-input",
    rows: "3",
    style: {
      height: 90,
      padding: "12px 14px",
      resize: "vertical"
    },
    placeholder: "Ex.: prefere atendimento pela manh\xE3, paga sempre via Pix\u2026"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: "18px 20px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--fg-2)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      margin: "0 0 12px"
    }
  }, "Pr\xE9-visualiza\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 14,
      background: "var(--purple-100)",
      color: "var(--purple-800)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 17
    }
  }, "MP"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Marcos Pereira"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "(11) 98123-4521"))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-2)",
      lineHeight: "20px"
    }
  }, "Av. das Na\xE7\xF5es, 412 \u2014 apto 73", /*#__PURE__*/React.createElement("br", null), "Vila Nova \xB7 S\xE3o Paulo / SP", /*#__PURE__*/React.createElement("br", null), "CEP 04567-010")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple-50)",
      border: "1px solid var(--purple-100)",
      borderRadius: 12,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "info",
    size: 18,
    color: "var(--purple-700)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--purple-900)",
      lineHeight: "18px"
    }
  }, /*#__PURE__*/React.createElement("strong", null, "3 clientes cadastrados"), " no Orcivo Mais.", /*#__PURE__*/React.createElement("br", null), "Cadastro m\xEDnimo: nome + telefone."))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: "18px 20px"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 13,
      fontWeight: 600,
      color: "var(--fg-2)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      margin: "0 0 12px"
    }
  }, "Atalhos depois de salvar"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-check",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "box",
    style: {
      background: "var(--purple-600)",
      borderColor: "var(--purple-600)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 14
  })), /*#__PURE__*/React.createElement("div", null, "Criar or\xE7amento em seguida")), /*#__PURE__*/React.createElement("div", {
    className: "auth-check",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "box"
  }), /*#__PURE__*/React.createElement("div", null, "Agendar visita t\xE9cnica")), /*#__PURE__*/React.createElement("div", {
    className: "auth-check",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "box"
  }), /*#__PURE__*/React.createElement("div", null, "Salvar endere\xE7o como obra"))))))));
}

// ─────────────  2. Cliente detalhe — 6 abas ───────────── //

function WebCustomerDetail() {
  return /*#__PURE__*/React.createElement(AppShell, {
    active: "Clientes",
    crumb: /*#__PURE__*/React.createElement("div", {
      className: "crumb"
    }, /*#__PURE__*/React.createElement("span", null, "Clientes"), " \xB7 ", /*#__PURE__*/React.createElement("strong", null, "Marcos Pereira"))
  }, /*#__PURE__*/React.createElement("div", {
    className: "cust-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cust-aside"
  }, /*#__PURE__*/React.createElement("div", {
    className: "cust-avatar"
  }, "MP"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      fontSize: 20,
      lineHeight: "26px",
      fontWeight: 700,
      letterSpacing: "-0.01em"
    }
  }, "Marcos Pereira")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginBottom: 14
    }
  }, "Cliente desde mai/2024 \xB7 4 or\xE7amentos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-badge b-brand",
    style: {
      padding: "4px 9px",
      fontSize: 11
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Recorrente"), /*#__PURE__*/React.createElement("span", {
    className: "m-badge b-slate",
    style: {
      padding: "4px 9px",
      fontSize: 11
    }
  }, "Resid\xEAncia"), /*#__PURE__*/React.createElement("span", {
    className: "m-badge b-slate",
    style: {
      padding: "4px 9px",
      fontSize: 11
    }
  }, "Pessoa f\xEDsica")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 8,
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      height: 38,
      width: "auto",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "plus",
    size: 16
  }), " Or\xE7amento"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      height: 38,
      width: "auto",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "whatsapp",
    size: 16,
    color: "var(--success)"
  }), " WhatsApp"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      height: 38,
      width: "auto",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "phone",
    size: 16
  }), " Ligar"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      height: 38,
      width: "auto",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "cal",
    size: 16
  }), " Agendar")), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      margin: "0 0 8px"
    }
  }, "Contato"), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Telefone"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "(11) 98123-4521")), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Email"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "marcos.p@gmail.com")), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "CPF"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "123.456.789-00")), /*#__PURE__*/React.createElement("div", {
    className: "kv"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Anivers\xE1rio"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, "12 / mar")), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      margin: "18px 0 8px"
    }
  }, "Endere\xE7o principal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-2)",
      lineHeight: "20px"
    }
  }, "Av. das Na\xE7\xF5es, 412 \u2014 apto 73", /*#__PURE__*/React.createElement("br", null), "Vila Nova \xB7 S\xE3o Paulo / SP", /*#__PURE__*/React.createElement("br", null), "CEP 04567-010"), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13,
      marginTop: 8,
      display: "inline-block"
    }
  }, "+ adicionar 2\xBA endere\xE7o")), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "cust-tabs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tab active"
  }, "Resumo"), /*#__PURE__*/React.createElement("div", {
    className: "tab"
  }, "Or\xE7amentos ", /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, "4")), /*#__PURE__*/React.createElement("div", {
    className: "tab"
  }, "OS ", /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, "3")), /*#__PURE__*/React.createElement("div", {
    className: "tab"
  }, "Financeiro ", /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, "2")), /*#__PURE__*/React.createElement("div", {
    className: "tab"
  }, "Endere\xE7os ", /*#__PURE__*/React.createElement("span", {
    className: "count"
  }, "2")), /*#__PURE__*/React.createElement("div", {
    className: "tab"
  }, "Hist\xF3rico")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 12,
      marginBottom: 24
    }
  }, [["Orçamentos", "4", "2 aprovados"], ["OS concluídas", "3", "R$ 12.480 faturado"], ["Em aberto", "R$ 1.890", "1 pendência"], ["Recebido", "R$ 12.480", "último: 02/05"]].map(([k, v, s], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "kpi-card",
    style: {
      padding: "14px 14px",
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, k), /*#__PURE__*/React.createElement("div", {
    className: "v",
    style: {
      marginTop: 6,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      marginTop: 4,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, s)))), /*#__PURE__*/React.createElement("div", {
    className: "section-h"
  }, /*#__PURE__*/React.createElement("h3", null, "\xDAltimos or\xE7amentos"), /*#__PURE__*/React.createElement("span", {
    className: "auth-link",
    style: {
      fontSize: 13
    }
  }, "Ver todos \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: 0,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--slate-50)"
    }
  }, ["Nº", "Título", "Status", "Valor", "Criado em", ""].map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      textAlign: i === 3 ? "right" : "left",
      padding: "10px 14px",
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      fontWeight: 500,
      borderBottom: "1px solid var(--border-1)"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [["#248", "Reforma elétrica completa", ["b-warn", "Pendente"], "R$ 4.480,00", "08/05"], ["#231", "Troca de quadro trifásico", ["b-ok", "Aprovado"], "R$ 1.890,00", "02/04"], ["#205", "Manutenção preventiva", ["b-ok", "Aprovado"], "R$ 980,00", "15/02"], ["#188", "Visita técnica", ["b-slate", "Rejeitado"], "R$ 240,00", "08/01"]].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      borderBottom: i < 3 ? "1px solid var(--border-2)" : "none",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, r[0]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      borderBottom: i < 3 ? "1px solid var(--border-2)" : "none",
      fontWeight: 500
    }
  }, r[1]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      borderBottom: i < 3 ? "1px solid var(--border-2)" : "none"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "m-badge " + r[2][0],
    style: {
      padding: "4px 9px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), r[2][1])), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      borderBottom: i < 3 ? "1px solid var(--border-2)" : "none",
      fontVariantNumeric: "tabular-nums",
      fontWeight: 600,
      textAlign: "right"
    }
  }, r[3]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      borderBottom: i < 3 ? "1px solid var(--border-2)" : "none",
      color: "var(--fg-3)"
    }
  }, r[4]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      borderBottom: i < 3 ? "1px solid var(--border-2)" : "none",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "chev-right",
    size: 16,
    color: "var(--slate-400)"
  }))))))), /*#__PURE__*/React.createElement("div", {
    className: "section-h"
  }, /*#__PURE__*/React.createElement("h3", null, "Atividade recente")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: "6px 18px"
    }
  }, [["check-circle", "success", "OS #112 finalizada", "Reforma elétrica · assinatura coletada", "há 3 dias"], ["pdf", "brand", "PDF enviado por WhatsApp", "Orçamento #248", "há 5 dias"], ["file", "slate", "Orçamento #248 criado", "Total R$ 4.480,00", "há 6 dias"], ["credit-card", "success", "Pagamento recebido", "R$ 1.890,00 via Pix · OS #109", "12/03"]].map(([ic, tone, t, d, when], i) => {
    const bgs = {
      success: "var(--success-bg)",
      brand: "var(--purple-100)",
      slate: "var(--slate-100)"
    };
    const fgs = {
      success: "var(--success)",
      brand: "var(--purple-700)",
      slate: "var(--slate-600)"
    };
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: "flex",
        gap: 14,
        padding: "14px 0",
        borderBottom: i < 3 ? "1px solid var(--border-2)" : "none"
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 9,
        background: bgs[tone],
        color: fgs[tone],
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(I, {
      name: ic,
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontWeight: 600,
        fontSize: 14
      }
    }, t), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 13,
        color: "var(--fg-3)"
      }
    }, d)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        color: "var(--fg-3)",
        whiteSpace: "nowrap"
      }
    }, when));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24
    }
  }))));
}
Object.assign(window, {
  WebNewCustomer,
  WebCustomerDetail
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens/FormsWeb.jsx", error: String((e && e.message) || e) }); }

// screens/Public.jsx
try { (() => {
// Lote D — Páginas públicas
// 1. Aprovação pública de orçamento — responsivo (desktop + mobile)
// 2. Preview de PDF (desktop)

const I = props => /*#__PURE__*/React.createElement(AuthIcon, props);

// ─────────────  Quote content (shared between mobile + desktop) ───────────── //

const QUOTE = {
  biz: {
    name: "Ribeiro Elétrica",
    sub: "CNPJ 12.345.678/0001-90 · (11) 4002-8922",
    initials: "RE"
  },
  number: "#248",
  customer: {
    name: "Construtora Vila Nova",
    contact: "Eng. Helena Tavares",
    phone: "(11) 4002-8922"
  },
  validity: "30 dias",
  emitted: "08 / mai / 2026",
  expires: "07 / jun / 2026",
  items: [{
    name: "Instalação de quadro elétrico",
    desc: "Inclui montagem do quadro de 32 circuitos, disjuntores de proteção, identificação e teste final.",
    qty: "1,00 un",
    price: "1.890,00",
    total: "1.890,00"
  }, {
    name: "Disjuntor DR 40A",
    desc: "Disjuntor diferencial residual 30mA · marca Steck.",
    qty: "2,00 un",
    price: "160,00",
    total: "320,00"
  }, {
    name: "Mão de obra técnica",
    desc: "Equipe com técnico responsável e ajudante.",
    qty: "6,00 h",
    price: "120,00",
    total: "720,00"
  }, {
    name: "Material elétrico diverso",
    desc: "Cabos 6mm², 10mm², canaletas, conectores, identificadores e itens de fixação.",
    qty: "1,00 un",
    price: "1.550,00",
    total: "1.550,00"
  }],
  subtotal: "4.480,00",
  discount: "—",
  total: "R$ 4.480,00"
};

// ─────────────  1a. Public quote — Desktop ───────────── //

function WebPublicQuote() {
  return /*#__PURE__*/React.createElement("div", {
    className: "pub"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pub-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "biz"
  }, QUOTE.biz.initials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "biz-name"
  }, QUOTE.biz.name), /*#__PURE__*/React.createElement("div", {
    className: "biz-sub"
  }, QUOTE.biz.sub)), /*#__PURE__*/React.createElement("div", {
    className: "powered"
  }, "Enviado via ", /*#__PURE__*/React.createElement("strong", null, "Orcivo"))), /*#__PURE__*/React.createElement("div", {
    className: "pub-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pub-hero"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(I, {
    name: "file",
    size: 28,
    stroke: 1.8
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", null, "Ol\xE1, Construtora Vila Nova \uD83D\uDC4B"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Aqui est\xE1 o or\xE7amento ", QUOTE.number, ", preparado por ", /*#__PURE__*/React.createElement("strong", null, QUOTE.biz.name), ". Confira os itens, valores e condi\xE7\xF5es \u2014 voc\xEA pode aprovar ou recusar abaixo.")), /*#__PURE__*/React.createElement("div", {
    className: "m-badge b-warn",
    style: {
      padding: "6px 12px",
      fontSize: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Aguardando sua resposta")), /*#__PURE__*/React.createElement("div", {
    className: "pub-meta-row"
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(I, {
    name: "cal",
    size: 14
  }), " Emitido em ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, QUOTE.emitted)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(I, {
    name: "clock",
    size: 14
  }), " V\xE1lido at\xE9 ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, QUOTE.expires)), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(I, {
    name: "shield",
    size: 14
  }), " Voc\xEA est\xE1 num link seguro do Orcivo")), /*#__PURE__*/React.createElement("div", {
    className: "pub-card"
  }, /*#__PURE__*/React.createElement("h2", null, "Para"), /*#__PURE__*/React.createElement("div", {
    className: "pub-grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, QUOTE.customer.name)), /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Contato"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, QUOTE.customer.contact)), /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Telefone"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, QUOTE.customer.phone)), /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Endere\xE7o da obra"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "Av. das Na\xE7\xF5es, 412 \xB7 Vila Nova \xB7 S\xE3o Paulo / SP")))), /*#__PURE__*/React.createElement("div", {
    className: "pub-card"
  }, /*#__PURE__*/React.createElement("h2", null, "Itens \xB7 ", QUOTE.items.length), QUOTE.items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "pub-item"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, it.name), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, it.desc)), /*#__PURE__*/React.createElement("div", {
    className: "qty"
  }, it.qty, /*#__PURE__*/React.createElement("br", null), /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)",
      fontSize: 11
    }
  }, "\xD7 R$ ", it.price)), /*#__PURE__*/React.createElement("div", {
    className: "total"
  }, "R$ ", it.total))), /*#__PURE__*/React.createElement("div", {
    className: "pub-totals"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Subtotal"), /*#__PURE__*/React.createElement("strong", null, "R$ ", QUOTE.subtotal)), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Desconto"), /*#__PURE__*/React.createElement("strong", null, QUOTE.discount)), /*#__PURE__*/React.createElement("div", {
    className: "row grand"
  }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, QUOTE.total)))), /*#__PURE__*/React.createElement("div", {
    className: "pub-card"
  }, /*#__PURE__*/React.createElement("h2", null, "Condi\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    className: "pub-grid-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Forma de pagamento"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "50% no in\xEDcio + 50% na entrega")), /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Prazo de execu\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "3 dias \xFAteis ap\xF3s aprova\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Garantia"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "90 dias sobre servi\xE7o e material")), /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Validade"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "At\xE9 ", QUOTE.expires))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      padding: "12px 14px",
      background: "var(--slate-50)",
      borderRadius: 10,
      fontSize: 13,
      color: "var(--fg-2)",
      lineHeight: "20px"
    }
  }, /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, "Observa\xE7\xF5es:"), " Os valores incluem material e m\xE3o de obra. N\xE3o est\xE3o inclusos servi\xE7os de alvenaria ou acabamento \u2014 caso necess\xE1rio, ser\xE1 or\xE7ado \xE0 parte.")), /*#__PURE__*/React.createElement("div", {
    className: "pub-cta"
  }, /*#__PURE__*/React.createElement("div", {
    className: "total-mini"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Total a aprovar"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, QUOTE.total)), /*#__PURE__*/React.createElement("div", {
    className: "actions"
  }, /*#__PURE__*/React.createElement("button", {
    className: "reject"
  }, /*#__PURE__*/React.createElement(I, {
    name: "x",
    size: 16
  }), " Recusar"), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 46,
      padding: "0 18px",
      borderRadius: 12,
      background: "#fff",
      border: "1px solid var(--border-1)",
      fontFamily: "inherit",
      fontWeight: 700,
      fontSize: 14,
      color: "var(--ink)",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "msg",
    size: 16
  }), " Pedir ajuste"), /*#__PURE__*/React.createElement("button", {
    className: "accept"
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 16
  }), " Aprovar or\xE7amento"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      justifyContent: "center",
      marginTop: 32,
      color: "var(--fg-3)",
      fontSize: 12,
      alignItems: "center",
      flexWrap: "wrap"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "download",
    size: 14
  }), " Baixar PDF"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "whatsapp",
    size: 14,
    color: "var(--success)"
  }), " Compartilhar no WhatsApp"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "shield",
    size: 14
  }), " Link \xFAnico e privado"))));
}

// ─────────────  1b. Public quote — Mobile (responsive) ───────────── //

function MobPublicQuote() {
  return /*#__PURE__*/React.createElement("div", {
    className: "pub pub-mobile",
    style: {
      borderRadius: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pub-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "biz"
  }, QUOTE.biz.initials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "biz-name",
    style: {
      fontSize: 14
    }
  }, QUOTE.biz.name), /*#__PURE__*/React.createElement("div", {
    className: "biz-sub",
    style: {
      fontSize: 11
    }
  }, QUOTE.biz.sub))), /*#__PURE__*/React.createElement("div", {
    className: "pub-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pub-hero"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center",
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic",
    style: {
      width: 44,
      height: 44,
      borderRadius: 12
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "file",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-badge b-warn",
    style: {
      padding: "3px 8px",
      fontSize: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Aguardando resposta"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Or\xE7amento ", QUOTE.number), /*#__PURE__*/React.createElement("div", {
    className: "sub",
    style: {
      fontSize: 13,
      marginTop: 6
    }
  }, "Preparado para ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, QUOTE.customer.name), " em ", QUOTE.emitted, ".")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
      padding: "10px 12px",
      background: "#fff",
      borderRadius: 10,
      border: "1px solid var(--border-1)"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      fontWeight: 600,
      letterSpacing: "0.04em"
    }
  }, "Total"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 20,
      fontWeight: 700,
      color: "var(--purple-700)"
    }
  }, QUOTE.total)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 10,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      fontWeight: 600,
      letterSpacing: "0.04em"
    }
  }, "V\xE1lido at\xE9"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 600
    }
  }, QUOTE.expires)))), /*#__PURE__*/React.createElement("div", {
    className: "pub-card"
  }, /*#__PURE__*/React.createElement("h2", null, "Itens \xB7 ", QUOTE.items.length), QUOTE.items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "pub-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, it.name), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, it.desc), /*#__PURE__*/React.createElement("div", {
    className: "row-bottom"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, it.qty, " \xD7 R$ ", it.price), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 15,
      fontVariantNumeric: "tabular-nums"
    }
  }, "R$ ", it.total)))), /*#__PURE__*/React.createElement("div", {
    className: "pub-totals"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Subtotal"), /*#__PURE__*/React.createElement("strong", null, "R$ ", QUOTE.subtotal)), /*#__PURE__*/React.createElement("div", {
    className: "row grand",
    style: {
      fontSize: 18
    }
  }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "v"
  }, QUOTE.total)))), /*#__PURE__*/React.createElement("div", {
    className: "pub-card"
  }, /*#__PURE__*/React.createElement("h2", null, "Condi\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Pagamento"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "50% no in\xEDcio + 50% na entrega")), /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Prazo"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "3 dias \xFAteis ap\xF3s aprova\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    className: "pub-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Garantia"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "90 dias sobre servi\xE7o e material")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      justifyContent: "center",
      margin: "16px 0",
      fontSize: 11,
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 4,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "download",
    size: 12
  }), " Baixar PDF"), /*#__PURE__*/React.createElement("span", null, "\xB7"), /*#__PURE__*/React.createElement("span", {
    style: {
      display: "flex",
      gap: 4,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "shield",
    size: 12
  }), " Link seguro Orcivo"))), /*#__PURE__*/React.createElement("div", {
    className: "pub-cta"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      width: "100%"
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 0.5,
      height: 46,
      borderRadius: 12,
      background: "#fff",
      border: "1px solid var(--border-1)",
      fontFamily: "inherit",
      fontWeight: 700,
      fontSize: 13,
      color: "var(--ink)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "x",
    size: 14
  }), " Recusar"), /*#__PURE__*/React.createElement("button", {
    style: {
      flex: 1.5,
      height: 46,
      borderRadius: 12,
      background: "var(--purple-600)",
      border: 0,
      color: "#fff",
      fontFamily: "inherit",
      fontWeight: 700,
      fontSize: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 16
  }), " Aprovar \xB7 ", QUOTE.total))));
}

// ─────────────  1c. Public quote — Approved success ───────────── //

function WebPublicQuoteApproved() {
  return /*#__PURE__*/React.createElement("div", {
    className: "pub"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pub-bar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "biz"
  }, QUOTE.biz.initials), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "biz-name"
  }, QUOTE.biz.name), /*#__PURE__*/React.createElement("div", {
    className: "biz-sub"
  }, QUOTE.biz.sub)), /*#__PURE__*/React.createElement("div", {
    className: "powered"
  }, "Enviado via ", /*#__PURE__*/React.createElement("strong", null, "Orcivo"))), /*#__PURE__*/React.createElement("div", {
    className: "pub-body",
    style: {
      maxWidth: 560,
      paddingTop: 80,
      textAlign: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 88,
      height: 88,
      borderRadius: 24,
      background: "var(--success-bg)",
      color: "var(--success)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 24px"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 44,
    stroke: 2.2
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 30,
      lineHeight: "36px",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      margin: "0 0 10px"
    }
  }, "Or\xE7amento aprovado"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontSize: 15,
      color: "var(--fg-3)",
      margin: "0 0 28px",
      lineHeight: "22px"
    }
  }, QUOTE.biz.name, " recebeu sua aprova\xE7\xE3o e vai entrar em contato em breve para combinar a execu\xE7\xE3o. Voc\xEA tamb\xE9m pode iniciar o pagamento agora."), /*#__PURE__*/React.createElement("div", {
    className: "pub-card",
    style: {
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("h2", null, "Pagamento"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "110px 1fr",
      gap: 18,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-pix-qr",
    style: {
      width: 110,
      height: 110
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      fontWeight: 600,
      letterSpacing: "0.06em"
    }
  }, "Pix \xB7 entrada de 50%"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 700,
      color: "var(--ink)",
      margin: "4px 0"
    }
  }, "R$ 2.240,00"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-2)"
    }
  }, "Chave Pix \xB7 ", /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, "12.345.678/0001-90")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 10,
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      height: 38,
      width: "auto",
      padding: "0 14px",
      fontSize: 13
    }
  }, "Copiar c\xF3digo Pix"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      height: 38,
      width: "auto",
      padding: "0 14px",
      fontSize: 13
    }
  }, "Avisar que paguei"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "center",
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      width: "auto",
      padding: "0 14px"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "download",
    size: 16
  }), " Baixar PDF"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      width: "auto",
      padding: "0 14px"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "whatsapp",
    size: 16,
    color: "var(--success)"
  }), " Falar no WhatsApp"))));
}

// ─────────────  2. PDF preview ───────────── //

function WebPDFPreview() {
  return /*#__PURE__*/React.createElement("div", {
    className: "pdf-stage"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(I, {
    name: "arrow-left",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "name"
  }, "Or\xE7amento-248-Construtora-Vila-Nova.pdf"), /*#__PURE__*/React.createElement("div", {
    className: "meta"
  }, "2 p\xE1ginas \xB7 124 KB \xB7 gerado h\xE1 12 min")), /*#__PURE__*/React.createElement("div", {
    className: "zoom"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: "pointer",
      opacity: 0.7
    }
  }, "\u2212"), /*#__PURE__*/React.createElement("span", null, "100 %"), /*#__PURE__*/React.createElement("span", {
    style: {
      cursor: "pointer",
      opacity: 0.7
    }
  }, "+")), /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(I, {
    name: "refresh",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(I, {
    name: "download",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(I, {
    name: "whatsapp",
    size: 16
  })), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      width: "auto",
      padding: "0 14px",
      height: 34,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "msg",
    size: 14
  }), " Enviar ao cliente")), /*#__PURE__*/React.createElement("div", {
    className: "pdf-shell"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "corner-brand"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pdf-header"
  }, /*#__PURE__*/React.createElement("div", {
    className: "left"
  }, /*#__PURE__*/React.createElement("div", {
    className: "logo"
  }, /*#__PURE__*/React.createElement(OrcivoGlyph, {
    size: 20
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "biz-name"
  }, QUOTE.biz.name), /*#__PURE__*/React.createElement("div", {
    className: "biz-meta"
  }, "CNPJ 12.345.678/0001-90", /*#__PURE__*/React.createElement("br", null), "Av. das Na\xE7\xF5es, 412 \xB7 Vila Nova \xB7 S\xE3o Paulo / SP", /*#__PURE__*/React.createElement("br", null), "contato@ribeiroeletrica.com.br \xB7 (11) 4002-8922"))), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "doc-type"
  }, "Or\xE7amento"), /*#__PURE__*/React.createElement("div", {
    className: "doc-num"
  }, QUOTE.number), /*#__PURE__*/React.createElement("div", {
    className: "biz-meta",
    style: {
      marginTop: 6
    }
  }, "Emitido em ", QUOTE.emitted, /*#__PURE__*/React.createElement("br", null), "V\xE1lido at\xE9 ", QUOTE.expires))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-h2"
  }, "Para"), /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, QUOTE.customer.name)), /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Contato"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, QUOTE.customer.contact)), /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Telefone"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, QUOTE.customer.phone)), /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Local da obra"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "Av. das Na\xE7\xF5es, 412 \xB7 Vila Nova \xB7 SP"))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-h2"
  }, "Itens"), /*#__PURE__*/React.createElement("table", {
    className: "pdf-items"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    style: {
      width: "50%"
    }
  }, "Descri\xE7\xE3o"), /*#__PURE__*/React.createElement("th", {
    className: "right"
  }, "Qtd"), /*#__PURE__*/React.createElement("th", {
    className: "right"
  }, "Unit."), /*#__PURE__*/React.createElement("th", {
    className: "right"
  }, "Total"))), /*#__PURE__*/React.createElement("tbody", null, QUOTE.items.map((it, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, it.name), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, it.desc)), /*#__PURE__*/React.createElement("td", {
    className: "right num"
  }, it.qty), /*#__PURE__*/React.createElement("td", {
    className: "right num"
  }, it.price), /*#__PURE__*/React.createElement("td", {
    className: "right num",
    style: {
      fontWeight: 600
    }
  }, it.total))))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-totals"
  }, /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Subtotal"), /*#__PURE__*/React.createElement("span", null, "R$ ", QUOTE.subtotal)), /*#__PURE__*/React.createElement("div", {
    className: "row"
  }, /*#__PURE__*/React.createElement("span", null, "Desconto"), /*#__PURE__*/React.createElement("span", null, QUOTE.discount)), /*#__PURE__*/React.createElement("div", {
    className: "row grand"
  }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", null, QUOTE.total))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-foot"
  }, /*#__PURE__*/React.createElement("span", null, QUOTE.biz.name, " \xB7 CNPJ 12.345.678/0001-90"), /*#__PURE__*/React.createElement("span", {
    className: "powered"
  }, "Gerado por ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, "Orcivo"), " \xB7 p\xE1gina 1 / 2"))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-page-num"
  }, "P\xE1gina 1 de 2"), /*#__PURE__*/React.createElement("div", {
    className: "pdf-page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "corner-brand"
  }), /*#__PURE__*/React.createElement("div", {
    className: "pdf-h2",
    style: {
      marginTop: 0
    }
  }, "Condi\xE7\xF5es comerciais"), /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv-grid"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Forma de pagamento"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "50% no in\xEDcio + 50% na entrega")), /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Prazo de execu\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "3 dias \xFAteis ap\xF3s aprova\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Garantia"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "90 dias sobre servi\xE7o e material instalado")), /*#__PURE__*/React.createElement("div", {
    className: "pdf-kv"
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Validade da proposta"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, QUOTE.validity, " \xB7 at\xE9 ", QUOTE.expires))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-h2"
  }, "Observa\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      lineHeight: 1.55,
      color: "var(--fg-2)"
    }
  }, "Os valores incluem material e m\xE3o de obra. N\xE3o est\xE3o inclusos servi\xE7os de alvenaria ou acabamento \u2014 caso necess\xE1rio, ser\xE3o or\xE7ados \xE0 parte. A execu\xE7\xE3o depende de acesso livre ao quadro el\xE9trico durante o hor\xE1rio combinado. Qualquer altera\xE7\xE3o no escopo dever\xE1 ser comunicada antes do in\xEDcio dos trabalhos."), /*#__PURE__*/React.createElement("div", {
    className: "pdf-h2"
  }, "Pagamento via Pix"), /*#__PURE__*/React.createElement("div", {
    className: "pdf-pix-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-pix-qr"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "k"
  }, "Chave Pix CNPJ"), /*#__PURE__*/React.createElement("div", {
    className: "v"
  }, "12.345.678/0001-90"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "Ap\xF3s a aprova\xE7\xE3o voc\xEA poder\xE1 copiar o c\xF3digo no link p\xFAblico do or\xE7amento."))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-h2"
  }, "Aprova\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-sig-box"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-sig-stroke"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      borderTop: "1px solid var(--ink)",
      paddingTop: 4,
      fontSize: 9,
      color: "var(--fg-3)",
      letterSpacing: "0.04em"
    }
  }, "ASSINATURA DO CLIENTE")), /*#__PURE__*/React.createElement("div", {
    className: "pdf-sig-box",
    style: {
      borderStyle: "solid",
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 9,
      color: "var(--fg-3)",
      letterSpacing: "0.04em",
      marginBottom: 4
    }
  }, "OU APROVA\xC7\xC3O ONLINE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--ink)",
      lineHeight: 1.5
    }
  }, "Acesse o link enviado por WhatsApp ou email e clique em ", /*#__PURE__*/React.createElement("strong", null, "Aprovar or\xE7amento"), ". A aprova\xE7\xE3o tem o mesmo valor legal de uma assinatura."))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-foot"
  }, /*#__PURE__*/React.createElement("span", null, QUOTE.biz.name, " \xB7 CNPJ 12.345.678/0001-90"), /*#__PURE__*/React.createElement("span", {
    className: "powered"
  }, "Gerado por ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, "Orcivo"), " \xB7 p\xE1gina 2 / 2"))), /*#__PURE__*/React.createElement("div", {
    className: "pdf-page-num"
  }, "P\xE1gina 2 de 2")), /*#__PURE__*/React.createElement("div", {
    className: "pdf-side"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Documento"), /*#__PURE__*/React.createElement("div", {
    className: "meta-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "N\xFAmero"), /*#__PURE__*/React.createElement("strong", null, QUOTE.number)), /*#__PURE__*/React.createElement("div", {
    className: "meta-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Cliente"), /*#__PURE__*/React.createElement("strong", null, QUOTE.customer.name)), /*#__PURE__*/React.createElement("div", {
    className: "meta-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Status"), /*#__PURE__*/React.createElement("span", {
    className: "m-badge b-warn",
    style: {
      padding: "3px 8px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Pendente")), /*#__PURE__*/React.createElement("div", {
    className: "meta-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Total"), /*#__PURE__*/React.createElement("strong", null, QUOTE.total)), /*#__PURE__*/React.createElement("div", {
    className: "meta-row"
  }, /*#__PURE__*/React.createElement("span", {
    className: "k"
  }, "Validade"), /*#__PURE__*/React.createElement("span", null, QUOTE.expires))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "P\xE1ginas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "pdf-thumb active"
  }, /*#__PURE__*/React.createElement("div", {
    className: "line title",
    style: {
      width: "50%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "line"
  }), /*#__PURE__*/React.createElement("div", {
    className: "line",
    style: {
      width: "80%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "line"
  }), /*#__PURE__*/React.createElement("div", {
    className: "line",
    style: {
      width: "70%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 32,
      background: "var(--slate-100)",
      borderRadius: 2,
      margin: "8px 0 4px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "line"
  }), /*#__PURE__*/React.createElement("div", {
    className: "line",
    style: {
      width: "60%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "1")), /*#__PURE__*/React.createElement("div", {
    className: "pdf-thumb"
  }, /*#__PURE__*/React.createElement("div", {
    className: "line title",
    style: {
      width: "60%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "line"
  }), /*#__PURE__*/React.createElement("div", {
    className: "line"
  }), /*#__PURE__*/React.createElement("div", {
    className: "line",
    style: {
      width: "70%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "line"
  }), /*#__PURE__*/React.createElement("div", {
    className: "line",
    style: {
      width: "50%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24,
      background: "var(--purple-100)",
      borderRadius: 2,
      margin: "8px 0 4px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "line"
  }), /*#__PURE__*/React.createElement("div", {
    className: "line",
    style: {
      width: "40%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, "2")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: "auto",
      padding: "12px 14px",
      background: "var(--purple-50)",
      border: "1px solid var(--purple-100)",
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "sparkles",
    size: 16,
    color: "var(--purple-700)"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--purple-900)",
      lineHeight: "17px"
    }
  }, /*#__PURE__*/React.createElement("strong", null, "PDF personalizado:"), " sua marca, suas cores. Dispon\xEDvel no ", /*#__PURE__*/React.createElement("strong", null, "Orcivo Mais"), "."))))));
}
Object.assign(window, {
  WebPublicQuote,
  MobPublicQuote,
  WebPublicQuoteApproved,
  WebPDFPreview
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens/Public.jsx", error: String((e && e.message) || e) }); }

// screens/States.jsx
try { (() => {
// Lote C — Estados do sistema
// 1. Plano bloqueado (mobile sheet + web modal)
// 2. Sem conexão
// 3. Permission denied
// 4. Edit lock
// 5. Skeletons

const I = props => /*#__PURE__*/React.createElement(AuthIcon, props);

// ─────────────  helpers ───────────── //

function FakeAppBehindMobile() {
  return /*#__PURE__*/React.createElement("div", {
    className: "mock-bg-list",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("h1", null, "Or\xE7amentos"), [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "row"
  }, /*#__PURE__*/React.createElement("div", {
    className: "av"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "l1"
  }), /*#__PURE__*/React.createElement("div", {
    className: "l2"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 22,
      borderRadius: 6,
      background: "var(--slate-100)"
    }
  }))));
}
function FakeAppBehindWeb({
  heading = "Equipe"
} = {}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "mock-app",
    "aria-hidden": true
  }, /*#__PURE__*/React.createElement("div", {
    className: "sb"
  }, /*#__PURE__*/React.createElement("div", {
    className: "b"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item active"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item"
  }), /*#__PURE__*/React.createElement("div", {
    className: "item"
  })), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement("div", {
    className: "tb"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 22,
      fontWeight: 700,
      margin: "4px 4px 16px"
    }
  }, heading), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }), /*#__PURE__*/React.createElement("div", {
    className: "card"
  })));
}

// ─────────────  1. Plano bloqueado ───────────── //

function MobPlanLocked() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "st-stage dim"
  }, /*#__PURE__*/React.createElement(FakeAppBehindMobile, null), /*#__PURE__*/React.createElement("div", {
    className: "sheet"
  }, /*#__PURE__*/React.createElement("div", {
    className: "grabber"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      alignItems: "flex-start",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      borderRadius: 14,
      background: "linear-gradient(135deg,#A78BFA,#6D28D9)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "crown",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-badge b-brand",
    style: {
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Plano Livre"), /*#__PURE__*/React.createElement("h2", null, "Voc\xEA usou seus 10 clientes"))), /*#__PURE__*/React.createElement("p", {
    className: "sub"
  }, "Fa\xE7a upgrade para ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, "Orcivo Mais"), " e tenha mais clientes inclusos, envio por WhatsApp e PDF com a sua marca."), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "var(--purple-50)",
      border: "1px solid var(--purple-200)",
      borderRadius: 12,
      padding: 14,
      marginBottom: 14
    }
  }, [["Mais clientes inclusos", true], ["PDF com sua marca", true], ["Envio por WhatsApp", true], ["Catálogo com uso ampliado", true]].map(([t, on], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      padding: "6px 0",
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 18,
      height: 18,
      borderRadius: "50%",
      background: "var(--purple-600)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "check",
    size: 12
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--ink)"
    }
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "baseline",
      gap: 6,
      justifyContent: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "Valor conforme o plano")), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary"
  }, "Ver planos"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn ghost",
    style: {
      marginTop: 6,
      height: 44
    }
  }, "Continuar no Livre"))));
}
function WebPlanLocked() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "st-stage dim"
  }, /*#__PURE__*/React.createElement(FakeAppBehindWeb, {
    heading: "Cat\xE1logo"
  }), /*#__PURE__*/React.createElement("div", {
    className: "web-modal",
    style: {
      width: 520
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "web-modal-head",
    style: {
      paddingTop: 32
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic",
    style: {
      background: "linear-gradient(135deg,#A78BFA,#6D28D9)",
      color: "#fff",
      width: 48,
      height: 48,
      borderRadius: 14
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "crown",
    size: 24
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "badge brand",
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Plano Livre \xB7 47 / 50 itens"), /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 22,
      lineHeight: "28px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      margin: "0 0 4px"
    }
  }, "Quase no limite do cat\xE1logo"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--fg-3)",
      fontSize: 14,
      margin: 0
    }
  }, "Fa\xE7a upgrade para ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, "Orcivo Mais"), " e tenha cat\xE1logo com uso ampliado, sem cobran\xE7a extra."))), /*#__PURE__*/React.createElement("div", {
    className: "web-modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10
    }
  }, [["Catálogo", "Até 50 itens", "Uso ampliado"], ["Clientes", "Uso básico", "Uso ampliado"], ["Usuários", "1 só", "Até 3"], ["PDF", "Modelo padrão", "Com sua marca"], ["Suporte", "Email", "Chat prioritário"], ["NF", "—", "Add-on disponível"]].map(([k, a, b], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "10px 12px",
      border: "1px solid var(--border-1)",
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      fontWeight: 500
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: 4,
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      textDecoration: "line-through"
    }
  }, a), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      color: "var(--purple-700)",
      fontWeight: 600
    }
  }, b)))))), /*#__PURE__*/React.createElement("div", {
    className: "web-modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn ghost",
    style: {
      width: "auto",
      padding: "0 14px",
      height: 40
    }
  }, "Continuar no Livre"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      width: "auto",
      padding: "0 14px",
      height: 40
    }
  }, "Comparar planos"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      width: "auto",
      padding: "0 18px",
      height: 40
    }
  }, "Ver planos")))));
}

// ─────────────  2. Sem conexão ───────────── //

function MobOffline() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top",
    style: {
      minHeight: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body",
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      paddingTop: 64
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "status-hero",
    style: {
      background: "var(--slate-100)",
      color: "var(--slate-600)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "wifi-off",
    size: 36
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      textAlign: "center"
    }
  }, "Sem conex\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "sub",
    style: {
      textAlign: "center"
    }
  }, "O Orcivo continua funcionando. Suas altera\xE7\xF5es ficam salvas no celular e sincronizam quando a internet voltar."), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      padding: "14px 16px",
      background: "var(--slate-50)",
      border: "1px solid var(--border-1)",
      borderRadius: 14,
      marginBottom: 16,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 8
    }
  }, "Aguardando sincronizar"), [["Orçamento #248", "Construtora Vila Nova"], ["OS #112 finalizada", "Marcos Pereira"], ["3 fotos · OS #109", "Ana Souza"]].map(([t, s], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 10,
      alignItems: "center",
      padding: "8px 0",
      borderBottom: i < 2 ? "1px solid var(--border-2)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 28,
      height: 28,
      borderRadius: 8,
      background: "var(--warning-bg)",
      color: "#92400E",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "clock",
    size: 14
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, s))))), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline"
  }, /*#__PURE__*/React.createElement(I, {
    name: "refresh",
    size: 18
  }), " Tentar reconectar")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 32,
      background: "var(--ink)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: 12,
      display: "flex",
      gap: 10,
      alignItems: "center",
      fontSize: 13,
      boxShadow: "var(--shadow-pop)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "var(--warning)"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, "Offline \xB7 3 altera\xE7\xF5es pendentes"), /*#__PURE__*/React.createElement(I, {
    name: "chev-right",
    size: 16,
    color: "rgba(255,255,255,0.6)"
  })));
}
function WebOffline() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 42,
      background: "var(--ink)",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "0 24px",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      background: "var(--warning)"
    }
  }), "Voc\xEA est\xE1 offline. Aguarde a conex\xE3o voltar antes de salvar novas altera\xE7\xF5es.", /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      color: "rgba(255,255,255,0.7)"
    }
  }, "tentando reconectar\u2026 0:12"), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 28,
      padding: "0 12px",
      borderRadius: 8,
      background: "rgba(255,255,255,0.14)",
      border: "1px solid rgba(255,255,255,0.18)",
      color: "#fff",
      fontFamily: "inherit",
      fontSize: 12,
      fontWeight: 600
    }
  }, "Tentar agora")), /*#__PURE__*/React.createElement("div", {
    className: "web-fs",
    style: {
      height: "calc(100% - 42px)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "web-fs-card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "status-hero",
    style: {
      background: "var(--slate-100)",
      color: "var(--slate-600)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "wifi-off",
    size: 36
  })), /*#__PURE__*/React.createElement("h1", null, "N\xE3o conseguimos atualizar agora"), /*#__PURE__*/React.createElement("p", null, "Verifique sua conex\xE3o e tente novamente. Suas altera\xE7\xF5es n\xE3o foram perdidas."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      justifyContent: "center"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      width: "auto",
      padding: "0 16px"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "refresh",
    size: 18
  }), " Tentar novamente"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn ghost",
    style: {
      width: "auto",
      padding: "0 16px"
    }
  }, "Voltar para a Home")))));
}

// ─────────────  3. Permission denied ───────────── //

function MobPermissionDenied() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "back",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13,
      color: "var(--fg-3)",
      textAlign: "center",
      fontWeight: 500
    }
  }, "Financeiro"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body",
    style: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      paddingTop: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "status-hero",
    style: {
      background: "var(--purple-50)",
      color: "var(--purple-700)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "lock",
    size: 32
  })), /*#__PURE__*/React.createElement("h1", {
    style: {
      textAlign: "center"
    }
  }, "Acesso restrito"), /*#__PURE__*/React.createElement("p", {
    className: "sub",
    style: {
      textAlign: "center"
    }
  }, "Apenas o ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, "dono da empresa"), " consegue ver o Financeiro. Pe\xE7a acesso para quem administra o Orcivo aqui."), /*#__PURE__*/React.createElement("div", {
    style: {
      width: "100%",
      background: "var(--slate-50)",
      border: "1px solid var(--border-1)",
      borderRadius: 14,
      padding: 14,
      marginBottom: 16,
      textAlign: "left"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      marginBottom: 10
    }
  }, "Dono da empresa"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: "50%",
      background: "var(--purple-100)",
      color: "var(--purple-800)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600
    }
  }, "JR"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, "Jo\xE3o Ribeiro"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "joao@ribeiroeletrica.com.br")), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 36,
      padding: "0 12px",
      borderRadius: 9,
      background: "var(--purple-50)",
      color: "var(--purple-700)",
      border: "1px solid var(--purple-200)",
      fontWeight: 600,
      fontSize: 13,
      fontFamily: "inherit"
    }
  }, "Pedir acesso"))), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline"
  }, /*#__PURE__*/React.createElement(I, {
    name: "arrow-left",
    size: 18
  }), " Voltar para a Home")));
}
function WebPermissionDenied() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "st-stage"
  }, /*#__PURE__*/React.createElement(FakeAppBehindWeb, {
    heading: "Financeiro"
  }), /*#__PURE__*/React.createElement("div", {
    className: "web-modal",
    style: {
      width: 460
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "web-modal-head",
    style: {
      paddingTop: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic",
    style: {
      background: "var(--purple-100)",
      color: "var(--purple-700)"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "lock",
    size: 22
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      fontSize: 20,
      lineHeight: "26px",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      margin: "0 0 4px"
    }
  }, "Voc\xEA n\xE3o tem acesso ao Financeiro"), /*#__PURE__*/React.createElement("p", {
    style: {
      color: "var(--fg-3)",
      fontSize: 14,
      margin: 0
    }
  }, "Sua fun\xE7\xE3o na empresa \xE9 ", /*#__PURE__*/React.createElement("strong", {
    style: {
      color: "var(--ink)"
    }
  }, "T\xE9cnico"), ". Apenas o dono pode ver lan\xE7amentos, recebimentos e relat\xF3rios."))), /*#__PURE__*/React.createElement("div", {
    className: "web-modal-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "12px 14px",
      background: "var(--slate-50)",
      borderRadius: 10,
      display: "flex",
      gap: 12,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: "var(--purple-100)",
      color: "var(--purple-800)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: 13
    }
  }, "JR"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Jo\xE3o Ribeiro"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Dono \xB7 joao@ribeiroeletrica.com.br")), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      width: "auto",
      height: 34,
      padding: "0 12px",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "msg",
    size: 14
  }), " Pedir acesso")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 10,
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "info",
    size: 14
  }), " Erro 403 \xB7 permission.denied \xB7 a\xE7\xE3o registrada no audit log")), /*#__PURE__*/React.createElement("div", {
    className: "web-modal-foot"
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      width: "auto",
      padding: "0 18px",
      height: 40
    }
  }, "Voltar ao Dashboard")))));
}

// ─────────────  4. Edit lock ───────────── //

function MobEditLock() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back"
  }, /*#__PURE__*/React.createElement(I, {
    name: "back",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13,
      fontWeight: 600,
      textAlign: "center"
    }
  }, "Or\xE7amento #248"), /*#__PURE__*/React.createElement(I, {
    name: "more",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body",
    style: {
      padding: "4px 16px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lock-banner",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic"
  }, /*#__PURE__*/React.createElement(I, {
    name: "lock",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    className: "who"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Em edi\xE7\xE3o por ", /*#__PURE__*/React.createElement("strong", null, "Ana Souza")), /*#__PURE__*/React.createElement("div", {
    style: {
      color: "var(--fg-2)",
      fontSize: 12
    }
  }, "H\xE1 4 min \xB7 pelo computador"))), /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: 0.55,
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 14,
      padding: 16,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.06em"
    }
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginTop: 4
    }
  }, "Construtora Vila Nova"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "CNPJ 12.345.678/0001-90 \xB7 (11) 4002-8922")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 14,
      padding: 16,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: "0.06em"
    }
  }, "Itens \xB7 4"), [["Instalação de quadro elétrico", "R$ 1.890,00"], ["Disjuntor DR 40A · 2un", "R$ 320,00"], ["Mão de obra · 6h", "R$ 720,00"], ["Material elétrico diversos", "R$ 1.550,00"]].map(([t, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0",
      borderTop: i ? "1px solid var(--border-2)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      fontFeatureSettings: '"tnum"'
    }
  }, v)))))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 32,
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      height: 48
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "eye",
    size: 18
  }), " S\xF3 visualizar"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      height: 48
    }
  }, "Pedir edi\xE7\xE3o")));
}
function WebEditLock() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 60,
      background: "#fff",
      borderBottom: "1px solid var(--border-1)",
      display: "flex",
      alignItems: "center",
      padding: "0 24px",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-back",
    style: {
      margin: 0
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "arrow-left",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Or\xE7amento #248 \xB7 Construtora Vila Nova"), /*#__PURE__*/React.createElement("div", {
    className: "m-badge b-warn",
    style: {
      padding: "4px 9px"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Em edi\xE7\xE3o por outro usu\xE1rio"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn outline",
    style: {
      width: "auto",
      padding: "0 14px",
      height: 36
    }
  }, "S\xF3 visualizar"), /*#__PURE__*/React.createElement("button", {
    className: "auth-btn primary",
    style: {
      width: "auto",
      padding: "0 16px",
      height: 36
    }
  }, "Pedir edi\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "20px 24px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lock-banner",
    style: {
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "ic",
    style: {
      width: 40,
      height: 40,
      borderRadius: 10
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "lock",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: "var(--ink)",
      fontWeight: 600
    }
  }, "Este or\xE7amento est\xE1 sendo editado por ", /*#__PURE__*/React.createElement("strong", null, "Ana Souza"), " agora"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--slate-700)"
    }
  }, "Edi\xE7\xE3o iniciada h\xE1 4 min \xB7 libera\xE7\xE3o autom\xE1tica ap\xF3s 15 min de inatividade")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      paddingRight: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: "50%",
      background: "var(--purple-100)",
      color: "var(--purple-800)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: 13,
      border: "2px solid #fff",
      boxShadow: "0 0 0 2px var(--warning)"
    }
  }, "AS"), /*#__PURE__*/React.createElement("button", {
    style: {
      height: 36,
      padding: "0 12px",
      borderRadius: 9,
      background: "#fff",
      border: "1px solid var(--border-1)",
      fontWeight: 600,
      fontSize: 13,
      color: "var(--ink)",
      fontFamily: "inherit",
      display: "flex",
      alignItems: "center",
      gap: 6
    }
  }, /*#__PURE__*/React.createElement(I, {
    name: "msg",
    size: 14
  }), " Avisar Ana"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 360px",
      gap: 20,
      opacity: 0.5,
      pointerEvents: "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: 20,
      height: 420
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.04em"
    }
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 18,
      marginTop: 4
    }
  }, "Construtora Vila Nova")), /*#__PURE__*/React.createElement("div", {
    className: "m-badge b-warn"
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Pendente")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "var(--border-2)",
      margin: "12px 0 16px"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      marginBottom: 8
    }
  }, "Itens \xB7 4"), [["Instalação de quadro elétrico", "R$ 1.890,00"], ["Disjuntor DR 40A · 2un", "R$ 320,00"], ["Mão de obra · 6h", "R$ 720,00"], ["Material elétrico diversos", "R$ 1.550,00"]].map(([t, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0",
      borderTop: i ? "1px solid var(--border-2)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600,
      fontFeatureSettings: '"tnum"'
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: 20,
      height: 200
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: "0.04em"
    }
  }, "Resumo"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, "Subtotal"), /*#__PURE__*/React.createElement("div", null, "R$ 4.480,00")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", null, "Desconto"), /*#__PURE__*/React.createElement("div", null, "\u2014")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      paddingTop: 14,
      borderTop: "1px solid var(--border-2)",
      display: "flex",
      justifyContent: "space-between",
      fontWeight: 700,
      fontSize: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, "Total"), /*#__PURE__*/React.createElement("div", null, "R$ 4.480,00"))))));
}

// ─────────────  5. Skeletons ───────────── //

function MobSkeleton() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "auth-m-top"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 14,
      width: 120
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 24,
      width: 180,
      marginTop: 8
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sk sk-circle",
    style: {
      width: 36,
      height: 36
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "auth-m-body",
    style: {
      paddingTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 42,
      width: "100%",
      borderRadius: 12,
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 14
    }
  }, [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 14,
      padding: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 10,
      width: "60%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 22,
      width: "50%",
      marginTop: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 10,
      width: "80%",
      marginTop: 8
    }
  })))), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 14,
      width: 120,
      marginBottom: 10
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 14,
      padding: "4px 14px"
    }
  }, [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "sk-card",
    style: {
      border: "none",
      padding: "12px 0",
      borderBottom: i < 4 ? "1px solid var(--border-2)" : "none"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk sk-circle",
    style: {
      width: 40,
      height: 40,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 12,
      width: "50%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 10,
      width: "75%",
      marginTop: 8
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sk sk-pill",
    style: {
      width: 54,
      height: 18
    }
  }))))));
}
function WebSkeleton() {
  return /*#__PURE__*/React.createElement("div", {
    className: "auth-m",
    style: {
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "220px 1fr",
      height: "100%"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      borderRight: "1px solid var(--border-1)",
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      width: 32,
      height: 32,
      borderRadius: 9,
      marginBottom: 18
    }
  }), [1, 2, 3, 4, 5, 6, 7].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 10,
      padding: "8px 6px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk sk-circle",
    style: {
      width: 18,
      height: 18
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 14,
      width: 70 + i * 7 % 50
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "space-between",
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 30,
      width: 200
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 14,
      width: 320,
      marginTop: 10
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 38,
      width: 160,
      borderRadius: 10
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: 16,
      marginBottom: 20
    }
  }, [1, 2, 3, 4].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 10,
      width: "50%"
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 28,
      width: "60%",
      marginTop: 12
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 10,
      width: "80%",
      marginTop: 8
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      background: "#fff",
      border: "1px solid var(--border-1)",
      borderRadius: 12,
      padding: 20
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "sk",
    style: {
      height: 16,
      width: 140,
      marginBottom: 14
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 24,
      paddingBottom: 14,
      borderBottom: "1px solid var(--border-2)"
    }
  }, ["20%", "16%", "18%", "16%", "14%", "16%"].map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "sk",
    style: {
      height: 10,
      width: w,
      flex: 1
    }
  }))), [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 24,
      padding: "14px 0",
      borderBottom: i < 5 ? "1px solid var(--border-2)" : "none"
    }
  }, ["20%", "16%", "18%", "16%", "14%", "16%"].map((w, j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    className: "sk",
    style: {
      height: 12,
      width: w,
      flex: 1
    }
  }))))))));
}
Object.assign(window, {
  MobPlanLocked,
  WebPlanLocked,
  MobOffline,
  WebOffline,
  MobPermissionDenied,
  WebPermissionDenied,
  MobEditLock,
  WebEditLock,
  MobSkeleton,
  WebSkeleton
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "screens/States.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/Icons.jsx
try { (() => {
// Minimal icon set for mobile kit
window.Icon = function Icon({
  name,
  size = 22,
  color = "currentColor",
  stroke = 1.75
}) {
  const D = {
    home: ["M3 9.5 12 3l9 6.5", "M5 9v11h14V9"],
    users: ["M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
    file: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5", "M9 13h6", "M9 17h6"],
    cal: ["M3 10h18", "M8 3v4", "M16 3v4"],
    dots: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
    search: ["M21 21l-4.3-4.3"],
    plus: ["M12 5v14", "M5 12h14"],
    chev: ["M9 6l6 6-6 6"],
    bell: ["M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9", "M13.73 21a2 2 0 0 1-3.46 0"],
    phone: ["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"],
    msg: ["M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"],
    check: ["M22 4 12 14.01l-3-3", "M22 11.08V12a10 10 0 1 1-5.93-9.14"],
    x: ["M15 9l-6 6", "M9 9l6 6"],
    back: ["M19 12H5", "M12 19l-7-7 7-7"],
    pdf: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5"],
    cam: ["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"],
    pkg: ["M21 16V8l-9-5-9 5v8l9 5z", "M3.3 7 12 12l8.7-5", "M12 22V12"],
    money: ["M12 2v20", "M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"],
    cog: ["M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"],
    clip: ["M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2", "M9 12h6", "M9 16h6"],
    user: ["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"],
    help: ["M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", "M12 17h.01"],
    building: ["M3 21h18", "M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16", "M9 9h.01", "M15 9h.01", "M9 13h.01", "M15 13h.01", "M9 17h.01", "M15 17h.01"],
    image: ["M21 15l-5-5L5 21", "M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
    lock: ["M5 11h14v10H5z", "M8 11V7a4 4 0 1 1 8 0v4"],
    shield: ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
    info: ["M12 16v-4", "M12 8h.01"],
    map: ["M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z", "M9 4v16", "M15 6v16"]
  };
  const E = {
    cog: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }),
    cam: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "13",
      r: "4"
    }),
    cal: /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "5",
      width: "18",
      height: "16",
      rx: "2"
    }),
    clip: /*#__PURE__*/React.createElement("rect", {
      x: "8",
      y: "3",
      width: "8",
      height: "4",
      rx: "1"
    }),
    search: /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }),
    dots: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "9",
      fill: "none"
    }),
    user: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "7",
      r: "4"
    }),
    help: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    info: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    lock: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "16",
      r: "0"
    })
  };
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, E[name] || null, (D[name] || []).map((d, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: d
  })));
};
window.fmtMoney = function (s) {
  const n = typeof s === "string" ? parseFloat(s.replace(",", ".")) : s;
  return "R$\u00A0" + n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/Icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/Mobile.jsx
try { (() => {
// Orcivo Mobile UI Kit — all screens in one file
const {
  useState
} = React;

// ---------- shared atoms ----------
function StatusPill({
  status
}) {
  const m = {
    draft: ["b-slate", "Rascunho"],
    pending: ["b-warn", "Pendente"],
    approved: ["b-ok", "Aprovado"],
    rejected: ["b-bad", "Rejeitado"],
    expired: ["b-slate", "Expirado"],
    open: ["b-info", "Aberta"],
    scheduled: ["b-brand", "Agendada"],
    in_progress: ["b-warn", "Em execução"],
    finished: ["b-ok", "Finalizada"],
    paid: ["b-ok", "Recebido"],
    overdue: ["b-bad", "Vencido"],
    partial: ["b-info", "Parcial"]
  };
  const [cls, label] = m[status] || ["b-slate", status];
  return /*#__PURE__*/React.createElement("span", {
    className: "m-badge " + cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), label);
}
function ScreenHeader({
  title,
  back,
  onBack,
  right
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "m-header"
  }, back && /*#__PURE__*/React.createElement("div", {
    className: "iconbtn",
    onClick: onBack
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "back",
    size: 20
  })), /*#__PURE__*/React.createElement("h1", null, title), right || /*#__PURE__*/React.createElement("div", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 20
  })));
}

// ---------- Home ----------
function Home({
  go
}) {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Bom dia, Jo\xE3o"
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginBottom: 12
    }
  }, "Ribeiro El\xE9trica \xB7 PRO"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-card m-metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Or\xE7amentos pendentes"), /*#__PURE__*/React.createElement("div", {
    className: "val"
  }, "8"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "2 vencem em 7 dias")), /*#__PURE__*/React.createElement("div", {
    className: "m-card m-metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "OS em execu\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "val"
  }, "3"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "1 aguarda material")), /*#__PURE__*/React.createElement("div", {
    className: "m-card m-metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Compromissos hoje"), /*#__PURE__*/React.createElement("div", {
    className: "val"
  }, "5"), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "2 atribu\xEDdos a voc\xEA")), /*#__PURE__*/React.createElement("div", {
    className: "m-card m-metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Recebido no m\xEAs"), /*#__PURE__*/React.createElement("div", {
    className: "val",
    style: {
      color: "var(--success)"
    }
  }, fmtMoney("12480")), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "17 recebimentos"))), /*#__PURE__*/React.createElement("div", {
    className: "m-quick"
  }, /*#__PURE__*/React.createElement("div", {
    onClick: () => go("quote-new")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 22
  }), /*#__PURE__*/React.createElement("span", null, "Novo or\xE7amento")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Icon, {
    name: "users",
    size: 22
  }), /*#__PURE__*/React.createElement("span", null, "Novo cliente")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Icon, {
    name: "cal",
    size: 22
  }), /*#__PURE__*/React.createElement("span", null, "Agendar"))), /*#__PURE__*/React.createElement("div", {
    className: "m-section-title"
  }, "Pr\xF3ximos compromissos"), /*#__PURE__*/React.createElement("div", {
    className: "m-card"
  }, [{
    t: "09:00",
    title: "Visita CFTV",
    who: "Marcos Pereira",
    s: "in_progress"
  }, {
    t: "11:30",
    title: "Instalação portão",
    who: "Ana Souza",
    s: "scheduled"
  }, {
    t: "14:00",
    title: "Orçamento presencial",
    who: "Construtora Vila Nova",
    s: "open"
  }].map((u, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "m-list-item"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 13
    }
  }, u.t), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, u.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, u.who)), /*#__PURE__*/React.createElement(StatusPill, {
    status: u.s
  }))))));
}

// ---------- Customers ----------
function Customers() {
  const list = [{
    n: "Marcos Pereira",
    p: "(11) 98123-4521",
    c: "São Paulo / SP",
    t: "há 2 dias",
    pend: true
  }, {
    n: "Construtora Vila Nova",
    p: "(11) 4002-8922",
    c: "Guarulhos / SP",
    t: "há 1 dia"
  }, {
    n: "Ana Souza",
    p: "(11) 97744-1188",
    c: "São Paulo / SP",
    t: "há 5 dias"
  }, {
    n: "Luiz Henrique",
    p: "(21) 99887-3300",
    c: "Rio de Janeiro / RJ",
    t: "há 8 dias"
  }, {
    n: "Padaria Quatro Cantos",
    p: "(11) 3221-7788",
    c: "São Paulo / SP",
    t: "há 12 dias"
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Clientes"
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-search",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18,
    color: "#64748B"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar cliente\u2026"
  })), /*#__PURE__*/React.createElement("div", {
    className: "m-card"
  }, list.map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "m-list-item"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-avatar"
  }, c.n.split(" ").map(w => w[0]).slice(0, 2).join("")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, c.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, c.p, " \xB7 ", c.c), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, "\xDAltima atividade ", c.t, c.pend && " · 1 pendência")), /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 18,
    color: "#94A3B8"
  }))))));
}

// ---------- Quotes ----------
function Quotes({
  go
}) {
  const items = [{
    id: 248,
    cust: "Construtora Vila Nova",
    s: "pending",
    total: "4480",
    date: "08/05"
  }, {
    id: 247,
    cust: "Marcos Pereira",
    s: "approved",
    total: "1480",
    date: "07/05"
  }, {
    id: 246,
    cust: "Ana Souza",
    s: "rejected",
    total: "2300",
    date: "01/05"
  }, {
    id: 245,
    cust: "Padaria Quatro Cantos",
    s: "draft",
    total: "890",
    date: "30/04"
  }, {
    id: 243,
    cust: "Roberta Lima",
    s: "expired",
    total: "760",
    date: "15/04"
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Or\xE7amentos"
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-search",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18,
    color: "#64748B"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar or\xE7amento\u2026"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, items.map(q => /*#__PURE__*/React.createElement("div", {
    key: q.id,
    className: "m-card",
    onClick: () => go("quote-detail", q)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      fontFamily: "var(--font-mono)",
      fontWeight: 600
    }
  }, "#", q.id), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginTop: 2
    }
  }, q.cust), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 4
    }
  }, "Criado ", q.date)), /*#__PURE__*/React.createElement(StatusPill, {
    status: q.s
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: 10,
      paddingTop: 10,
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "m-money",
    style: {
      fontSize: 18
    }
  }, fmtMoney(q.total))))))));
}

// ---------- Quote detail ----------
function QuoteDetail({
  q,
  go
}) {
  const [status, setStatus] = useState(q?.s || "pending");
  const items = [{
    n: "Visita técnica",
    qty: 1,
    p: "180.00"
  }, {
    n: "Instalação câmera CFTV 4MP",
    qty: 4,
    p: "320.00"
  }, {
    n: "Configuração de DVR",
    qty: 1,
    p: "240.00"
  }];
  const total = items.reduce((s, i) => s + i.qty * parseFloat(i.p), 0);
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Orçamento #" + (q?.id || 248),
    back: true,
    onBack: () => go("quotes"),
    right: /*#__PURE__*/React.createElement("div", {
      className: "iconbtn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "dots",
      size: 20
    }))
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(StatusPill, {
    status: status
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Validade 15/05")), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      fontWeight: 500
    }
  }, "CLIENTE"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginTop: 4
    }
  }, q?.cust || "Construtora Vila Nova"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "(11) 4002-8922 \xB7 Guarulhos / SP"), /*#__PURE__*/React.createElement("div", {
    className: "m-row",
    style: {
      marginTop: 12,
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 40
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 16
  }), "Ligar"), /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 40,
      color: "#16A34A"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "msg",
    size: 16
  }), "WhatsApp"))), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      fontWeight: 500,
      marginBottom: 8
    }
  }, "ITENS"), items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: i < items.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, it.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, it.qty, " \xD7 ", fmtMoney(it.p))), /*#__PURE__*/React.createElement("div", {
    className: "m-money"
  }, fmtMoney(it.qty * parseFloat(it.p))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: 10,
      paddingTop: 10,
      borderTop: "1px solid var(--border-1)",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "m-money",
    style: {
      fontSize: 20
    }
  }, fmtMoney(total)))), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-row",
    style: {
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 42
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pdf",
    size: 16
  }), "PDF"), /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 42,
      color: "#16A34A"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "msg",
    size: 16
  }), "Enviar"))), status === "pending" && /*#__PURE__*/React.createElement("div", {
    className: "m-row",
    style: {
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-danger",
    onClick: () => setStatus("rejected")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 18,
    color: "#fff"
  }), "Rejeitar"), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-success",
    onClick: () => setStatus("approved")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "#fff"
  }), "Aprovar")), status === "approved" && /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      background: "var(--success-bg)",
      border: "1px solid #BBF7D0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "#166534"
    }
  }, "Or\xE7amento aprovado."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#166534",
      marginTop: 4
    }
  }, "A OS #319 foi criada automaticamente. Toque para abrir."))));
}

// ---------- Quote wizard ----------
function QuoteWizard({
  go
}) {
  const [step, setStep] = useState(0);
  const steps = ["Cliente", "Itens", "Validade", "Termos", "Revisão"];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Novo or\xE7amento",
    back: true,
    onBack: () => go("home")
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-step-dots"
  }, steps.map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "m-step-dot" + (i === step ? " active" : "")
  }))), /*#__PURE__*/React.createElement("div", {
    className: "m-scroll",
    style: {
      paddingTop: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginBottom: 14
    }
  }, "Etapa ", step + 1, " de ", steps.length, " \xB7 ", steps[step]), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 14
    }
  }, step === 0 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "m-label"
  }, "Cliente"), /*#__PURE__*/React.createElement("input", {
    className: "m-input",
    defaultValue: "Construtora Vila Nova"
  }), /*#__PURE__*/React.createElement("label", {
    className: "m-label",
    style: {
      marginTop: 12
    }
  }, "Contato"), /*#__PURE__*/React.createElement("input", {
    className: "m-input",
    defaultValue: "Carlos \xB7 (11) 4002-8922"
  }), /*#__PURE__*/React.createElement("label", {
    className: "m-label",
    style: {
      marginTop: 12
    }
  }, "Endere\xE7o da obra"), /*#__PURE__*/React.createElement("input", {
    className: "m-input",
    defaultValue: "Rua das Ac\xE1cias, 248"
  })), step === 1 && /*#__PURE__*/React.createElement(React.Fragment, null, [{
    n: "Visita técnica",
    p: "180,00"
  }, {
    n: "Câmera 4MP × 4",
    p: "1.280,00"
  }].map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "m-list-item"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontWeight: 600
    }
  }, it.n), /*#__PURE__*/React.createElement("div", {
    className: "m-money"
  }, "R$ ", it.p))), /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Adicionar item")), step === 2 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "m-label"
  }, "Validade do or\xE7amento"), /*#__PURE__*/React.createElement("input", {
    className: "m-input",
    defaultValue: "15 dias"
  }), /*#__PURE__*/React.createElement("label", {
    className: "m-label",
    style: {
      marginTop: 12
    }
  }, "Desconto (R$)"), /*#__PURE__*/React.createElement("input", {
    className: "m-input",
    defaultValue: "0,00"
  })), step === 3 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("label", {
    className: "m-label"
  }, "Termos"), /*#__PURE__*/React.createElement("textarea", {
    className: "m-input",
    style: {
      height: 100,
      padding: 12
    },
    defaultValue: "50% no in\xEDcio, 50% na entrega. Garantia de 90 dias."
  })), step === 4 && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 6
    }
  }, "Construtora Vila Nova"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginBottom: 14
    }
  }, "2 itens \xB7 Validade 15 dias"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      paddingTop: 10,
      borderTop: "1px solid var(--border-1)",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "m-money",
    style: {
      fontSize: 22
    }
  }, fmtMoney("1460"))))), /*#__PURE__*/React.createElement("div", {
    className: "m-row",
    style: {
      gap: 10
    }
  }, step > 0 && /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    onClick: () => setStep(s => s - 1)
  }, "Voltar"), step < 4 ? /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-primary",
    onClick: () => setStep(s => s + 1)
  }, "Avan\xE7ar") : /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-primary",
    onClick: () => go("home")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pdf",
    size: 16,
    color: "#fff"
  }), "Gerar PDF"))));
}

// ---------- Agenda ----------
function Agenda() {
  const evts = [{
    t: "09:00 – 10:30",
    title: "Visita técnica CFTV",
    who: "Marcos Pereira",
    tag: "OS #312",
    s: "in_progress"
  }, {
    t: "11:30 – 12:30",
    title: "Instalação portão eletrônico",
    who: "Ana Souza",
    tag: "OS #318",
    s: "scheduled"
  }, {
    t: "14:00 – 15:00",
    title: "Orçamento presencial",
    who: "Construtora Vila Nova",
    tag: "ORÇ #248",
    s: "open"
  }, {
    t: "16:00 – 16:30",
    title: "Retorno ao cliente",
    who: "Luiz Henrique",
    tag: "Cliente"
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Agenda"
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-row",
    style: {
      gap: 6,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-badge b-brand"
  }, "Hoje"), /*#__PURE__*/React.createElement("div", {
    className: "m-badge b-slate"
  }, "Semana"), /*#__PURE__*/React.createElement("div", {
    className: "m-badge b-slate"
  }, "Lista"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "Ter, 14 de maio")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, evts.map((e, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "m-card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      color: "var(--ink)"
    }
  }, e.t), e.s && /*#__PURE__*/React.createElement(StatusPill, {
    status: e.s
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginTop: 6
    }
  }, e.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, e.who, " \xB7 ", e.tag))))));
}

// ---------- Mais (More) ----------
function More() {
  const groups = [{
    title: "Operação",
    items: [{
      i: "clip",
      n: "Ordens de Serviço"
    }, {
      i: "pkg",
      n: "Catálogo"
    }, {
      i: "money",
      n: "Financeiro"
    }]
  }, {
    title: "Conta",
    items: [{
      i: "cog",
      n: "Configurações"
    }, {
      i: "users",
      n: "Usuários e permissões"
    }, {
      i: "file",
      n: "Documentos"
    }]
  }];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(ScreenHeader, {
    title: "Mais"
  }), /*#__PURE__*/React.createElement("div", {
    className: "m-scroll"
  }, groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: gi,
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-section-title",
    style: {
      marginTop: gi === 0 ? 0 : 18
    }
  }, g.title), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: 0
    }
  }, g.items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "m-list-item",
    style: {
      padding: "14px 16px",
      borderBottom: i < g.items.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--purple-50)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--purple-700)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.i,
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontWeight: 600,
      fontSize: 15
    }
  }, it.n), /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 18,
    color: "#94A3B8"
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      background: "var(--purple-50)",
      border: "1px solid var(--purple-200)",
      marginTop: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--purple-800)"
    }
  }, "Plano PRO"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--slate-700)",
      marginTop: 4
    }
  }, "Pr\xF3xima cobran\xE7a em 28/05 \xB7 ", fmtMoney("89.90")), /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      marginTop: 12,
      height: 40
    }
  }, "Ver detalhes do plano"))));
}

// ---------- Shell ----------
function MobileApp() {
  const [route, setRoute] = useState({
    name: "home"
  });
  const go = (name, data) => setRoute({
    name,
    data
  });
  const tab = route.name === "quote-detail" ? "quotes" : route.name === "quote-new" ? "home" : route.name;
  return /*#__PURE__*/React.createElement("div", {
    className: "m-app",
    "data-screen-label": "Orcivo Mobile App"
  }, route.name === "home" && /*#__PURE__*/React.createElement(Home, {
    go: go
  }), route.name === "customers" && /*#__PURE__*/React.createElement(Customers, null), route.name === "quotes" && /*#__PURE__*/React.createElement(Quotes, {
    go: go
  }), route.name === "quote-detail" && /*#__PURE__*/React.createElement(QuoteDetail, {
    q: route.data,
    go: go
  }), route.name === "quote-new" && /*#__PURE__*/React.createElement(QuoteWizard, {
    go: go
  }), route.name === "agenda" && /*#__PURE__*/React.createElement(Agenda, null), route.name === "more" && /*#__PURE__*/React.createElement(More, null), route.name === "home" && /*#__PURE__*/React.createElement("div", {
    className: "m-fab",
    onClick: () => go("quote-new")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 18,
    color: "#fff"
  }), "Novo or\xE7amento"), /*#__PURE__*/React.createElement("div", {
    className: "m-tabbar"
  }, [["home", "Início", "home"], ["customers", "Clientes", "users"], ["quotes", "Orçamentos", "file"], ["agenda", "Agenda", "cal"], ["more", "Mais", "dots"]].map(([id, label, icon]) => /*#__PURE__*/React.createElement("div", {
    key: id,
    className: "m-tab" + (tab === id ? " active" : ""),
    onClick: () => go(id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: icon,
    size: 22
  }), /*#__PURE__*/React.createElement("span", null, label)))));
}
window.MobileApp = MobileApp;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/Mobile.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/Operations.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Orcivo Mobile Operations Screens — hash-routed inside an Android frame
const {
  useState
} = React;

// ----- atoms (reusing existing styles where possible) -----
function Pill({
  kind,
  children
}) {
  const m = {
    slate: "b-slate",
    warn: "b-warn",
    ok: "b-ok",
    bad: "b-bad",
    info: "b-info",
    brand: "b-brand"
  };
  return /*#__PURE__*/React.createElement("span", {
    className: "m-badge " + (m[kind] || "b-slate")
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), children);
}
const Row = ({
  children,
  ...p
}) => /*#__PURE__*/React.createElement("div", _extends({
  className: "m-row"
}, p), children);
function ScreenChrome({
  title,
  sub,
  back,
  right,
  children,
  scrollPad
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "m-app"
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-header",
    style: {
      paddingTop: 32
    }
  }, back && /*#__PURE__*/React.createElement("div", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "back",
    size: 20
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontSize: 20,
      lineHeight: "24px"
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, sub)), right ?? /*#__PURE__*/React.createElement("div", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "m-scroll",
    style: {
      paddingBottom: scrollPad || 32
    }
  }, children));
}
function ListCard({
  leading,
  title,
  sub,
  badge,
  chev = true
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "m-list-item"
  }, leading && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: "var(--purple-50)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--purple-700)"
    }
  }, leading), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: "var(--ink)"
    }
  }, title), sub && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginTop: 2,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, sub)), badge, chev && /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 18,
    color: "#94A3B8"
  }));
}

// ============== 1. Operação / Mais ==============
function ScreenMais() {
  const groups = [{
    title: "Operação",
    items: [{
      i: "clip",
      n: "Ordens de Serviço",
      s: "3 em execução · 1 aguardando material",
      b: /*#__PURE__*/React.createElement(Pill, {
        kind: "warn"
      }, "1 alerta")
    }, {
      i: "pkg",
      n: "Catálogo",
      s: "Serviços, produtos e mão de obra"
    }, {
      i: "money",
      n: "Financeiro",
      s: "R$ 2.480 pendentes · 1 vencido",
      b: /*#__PURE__*/React.createElement(Pill, {
        kind: "bad"
      }, "1")
    }, {
      i: "file",
      n: "Documentos",
      s: "Orçamentos, OS, recibos, relatórios"
    }]
  }, {
    title: "Conta",
    items: [{
      i: "user",
      n: "Conta",
      s: "Perfil, segurança e sessão"
    }, {
      i: "cog",
      n: "Configurações",
      s: "Empresa, identidade visual, Pix"
    }, {
      i: "users",
      n: "Usuários e permissões",
      s: "4 usuários · 1 convite pendente"
    }, {
      i: "help",
      n: "Ajuda e suporte",
      s: "Central de ajuda, contato"
    }]
  }];
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Opera\xE7\xE3o"
  }, groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: gi,
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-section-title",
    style: {
      marginTop: gi === 0 ? 0 : 18
    }
  }, g.title), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px"
    }
  }, g.items.map((it, i) => /*#__PURE__*/React.createElement(ListCard, {
    key: i,
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: it.i,
      size: 18
    }),
    title: it.n,
    sub: it.s,
    badge: it.b
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      background: "linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)",
      border: 0,
      color: "#fff",
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: .7,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 600
    }
  }, "Plano atual"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      marginTop: 2
    }
  }, "Orcivo Mais")), /*#__PURE__*/React.createElement("div", {
    className: "m-badge",
    style: {
      background: "rgba(255,255,255,.18)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Ativo")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: .85,
      marginTop: 8
    }
  }, "Pr\xF3xima cobran\xE7a em 28/05 \xB7 conforme o plano"), /*#__PURE__*/React.createElement("div", {
    className: "m-btn",
    style: {
      marginTop: 14,
      height: 42,
      background: "rgba(255,255,255,.16)",
      color: "#fff"
    }
  }, "Ver detalhes do plano")));
}

// ============== 2. Ordens de Serviço ==============
function ScreenOSList() {
  const items = [{
    id: 1024,
    t: "Instalação de câmera CFTV",
    c: "Mercado São João",
    when: "Hoje · 14:30",
    s: "in_progress",
    tech: "João"
  }, {
    id: 1023,
    t: "Manutenção portão eletrônico",
    c: "Ana Souza",
    when: "Hoje · 09:00",
    s: "scheduled",
    tech: "Marcos"
  }, {
    id: 1022,
    t: "Instalação alarme residencial",
    c: "Roberta Lima",
    when: "Aguardando peça",
    s: "waiting_material",
    tech: "João"
  }, {
    id: 1021,
    t: "Visita técnica preventiva",
    c: "Padaria Quatro Cantos",
    when: "Ontem",
    s: "finished",
    tech: "Marcos"
  }, {
    id: 1019,
    t: "Substituição de DVR",
    c: "Construtora Vila Nova",
    when: "03/05",
    s: "finished",
    tech: "João"
  }];
  const sm = {
    open: ["info", "Aberta"],
    scheduled: ["brand", "Agendada"],
    in_progress: ["warn", "Em execução"],
    waiting_client: ["slate", "Aguardando cliente"],
    waiting_material: ["slate", "Aguardando material"],
    finished: ["ok", "Finalizada"],
    cancelled: ["bad", "Cancelada"]
  };
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Ordens de Servi\xE7o",
    sub: "42 ativas \xB7 12 deste m\xEAs",
    scrollPad: 120
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-search",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18,
    color: "#64748B"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar OS, cliente, t\xE9cnico\u2026"
  })), /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 6,
      marginBottom: 14,
      overflowX: "auto",
      paddingBottom: 4
    }
  }, ["Todas", "Aberta", "Agendada", "Em execução", "Aguard. material", "Finalizada"].map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "m-badge " + (i === 0 ? "b-brand" : "b-slate"),
    style: {
      whiteSpace: "nowrap"
    }
  }, f))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 10
    }
  }, items.map(o => /*#__PURE__*/React.createElement("div", {
    key: o.id,
    className: "m-card"
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      fontFamily: "var(--font-mono)",
      fontWeight: 600
    }
  }, "OS #", o.id), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginTop: 3
    }
  }, o.t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, o.c)), /*#__PURE__*/React.createElement(Pill, {
    kind: sm[o.s][0]
  }, sm[o.s][1])), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginTop: 10,
      paddingTop: 10,
      borderTop: "1px solid var(--border-2)",
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement(Icon, {
    name: "cal",
    size: 13,
    color: "#64748B"
  }), " ", o.when), /*#__PURE__*/React.createElement("span", null, "T\xE9cnico \xB7 ", o.tech))))), /*#__PURE__*/React.createElement("div", {
    className: "m-fab",
    style: {
      position: "absolute"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 18,
    color: "#fff"
  }), "Nova OS"));
}

// ============== 3. Detalhe da OS ==============
function ScreenOSDetail() {
  const [tab, setTab] = useState("resumo");
  const tabs = [["resumo", "Resumo"], ["execucao", "Execução"], ["materiais", "Materiais"], ["fotos", "Fotos"], ["financ", "Financeiro"]];
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "OS #1024",
    sub: "Instala\xE7\xE3o de c\xE2mera CFTV",
    back: true,
    right: /*#__PURE__*/React.createElement("div", {
      className: "iconbtn"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "dots",
      size: 20
    })),
    scrollPad: 140
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    kind: "warn"
  }, "Em execu\xE7\xE3o"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Iniciada hoje \xB7 14:38")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 14,
      overflowX: "auto"
    }
  }, tabs.map(([k, l]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    onClick: () => setTab(k),
    className: "m-badge " + (tab === k ? "b-brand" : "b-slate"),
    style: {
      whiteSpace: "nowrap",
      cursor: "pointer"
    }
  }, l))), tab === "resumo" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".06em"
    }
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginTop: 4
    }
  }, "Mercado S\xE3o Jo\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "(11) 4002-8922 \xB7 Rua das Ac\xE1cias, 248"), /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 8,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 38,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 14
  }), "Ligar"), /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 38,
      fontSize: 13,
      color: "#16A34A"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "msg",
    size: 14
  }), "WhatsApp"), /*#__PURE__*/React.createElement("div", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 38,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "map",
    size: 14
  }), "Mapa"))), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".06em"
    }
  }, "Resumo"), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginTop: 8,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "Origem"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "Or\xE7amento #248")), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginTop: 6,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "T\xE9cnico"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "Jo\xE3o Pereira")), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginTop: 6,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "Agendada"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, "14/05 \xB7 14:30")), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginTop: 6,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "m-money",
    style: {
      fontSize: 15
    }
  }, fmtMoney("1480")))), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      marginBottom: 8
    }
  }, "Hist\xF3rico"), [["14:38", "Execução iniciada", "João Pereira"], ["14:21", "Técnico chegou ao local", "João Pereira"], ["08:10", "OS agendada para 14/05 14:30", "Sistema"], ["13/05", "OS criada a partir do orçamento #248", "Carla"]].map(([t, e, who], i) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      alignItems: "flex-start",
      gap: 10,
      padding: "6px 0"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--fg-3)",
      fontWeight: 600
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      fontWeight: 500
    }
  }, e), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, who)))))), tab === "execucao" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 600
    }
  }, "Checklist da execu\xE7\xE3o"), ["Chegada no local", "Conferência do equipamento", "Instalação física", "Configuração do DVR", "Teste com cliente"].map((s, i) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "10px 0",
      borderBottom: i < 4 ? "1px solid var(--border-2)" : 0,
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 6,
      background: i < 2 ? "var(--purple-600)" : "#fff",
      border: i < 2 ? 0 : "1.5px solid var(--border-1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, i < 2 && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14,
    color: "#fff",
    stroke: 3
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 14,
      color: i < 2 ? "var(--fg-3)" : "var(--ink)",
      textDecoration: i < 2 ? "line-through" : "none"
    }
  }, s)))), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cam",
    size: 16
  }), "Adicionar foto"), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "clip",
    size: 16
  }), "Coletar assinatura")), tab === "materiais" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, [{
    n: "Câmera CFTV 4MP",
    q: "4 un",
    p: "320,00",
    used: true
  }, {
    n: "Cabo coaxial 30m",
    q: "1 rolo",
    p: "180,00",
    used: true
  }, {
    n: "DVR 8 canais",
    q: "1 un",
    p: "480,00",
    used: false
  }].map((m, i, a) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "10px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, m.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, m.q, " \xB7 R$ ", m.p)), /*#__PURE__*/React.createElement(Pill, {
    kind: m.used ? "ok" : "slate"
  }, m.used ? "Usado" : "A usar")))), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Adicionar material")), tab === "fotos" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 8,
      marginBottom: 14
    }
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      aspectRatio: "1",
      background: "linear-gradient(135deg,#F1F5F9,#E2E8F0)",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#94A3B8"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cam",
    size: 22
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: "1",
      border: "1.5px dashed var(--border-1)",
      borderRadius: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--purple-700)",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 20
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600
    }
  }, "Adicionar")))), tab === "financ" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "Total da OS"), /*#__PURE__*/React.createElement("span", {
    className: "m-money"
  }, fmtMoney("1480"))), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "Recebido"), /*#__PURE__*/React.createElement("span", {
    className: "m-money",
    style: {
      color: "var(--success)"
    }
  }, fmtMoney("740"))), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      paddingTop: 8,
      borderTop: "1px solid var(--border-2)",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, "Pendente"), /*#__PURE__*/React.createElement("span", {
    className: "m-money"
  }, fmtMoney("740")))), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    color: "#fff"
  }), "Registrar recebimento")), /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 10,
      position: "absolute",
      left: 16,
      right: 16,
      bottom: 18
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1
    }
  }, "Pausar"), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-success",
    style: {
      flex: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18,
    color: "#fff"
  }), "Finalizar OS")));
}

// ============== 4. Catálogo ==============
function ScreenCatalog() {
  const [tab, setTab] = useState("servicos");
  const items = {
    servicos: [{
      n: "Visita técnica",
      p: "180,00"
    }, {
      n: "Instalação câmera CFTV 4MP",
      p: "320,00"
    }, {
      n: "Configuração de DVR",
      p: "240,00"
    }, {
      n: "Instalação portão eletrônico",
      p: "680,00"
    }],
    produtos: [{
      n: "Câmera CFTV 4MP",
      p: "320,00",
      inactive: false
    }, {
      n: "DVR 8 canais",
      p: "480,00"
    }, {
      n: "Cabo coaxial 30m",
      p: "180,00"
    }, {
      n: "Fonte 12V 5A",
      p: "75,00",
      inactive: true
    }],
    mao: [{
      n: "Hora técnica padrão",
      p: "95,00"
    }, {
      n: "Hora extra",
      p: "140,00"
    }],
    outros: [{
      n: "Deslocamento até 20km",
      p: "40,00"
    }]
  };
  const labels = {
    servicos: "Serviço",
    produtos: "Produto",
    mao: "Mão de obra",
    outros: "Outros"
  };
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Cat\xE1logo",
    sub: "38 itens ativos",
    scrollPad: 120
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-search",
    style: {
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 18,
    color: "#64748B"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar no cat\xE1logo\u2026"
  })), /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 6,
      marginBottom: 14
    }
  }, Object.keys(items).map(k => /*#__PURE__*/React.createElement("div", {
    key: k,
    onClick: () => setTab(k),
    className: "m-badge " + (tab === k ? "b-brand" : "b-slate"),
    style: {
      cursor: "pointer"
    }
  }, labels[k]))), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px"
    }
  }, items[tab].map((it, i, a) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "12px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      color: it.inactive ? "var(--fg-3)" : "var(--ink)"
    }
  }, it.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, labels[tab], " \xB7 un")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-money",
    style: {
      fontSize: 15
    }
  }, "R$ ", it.p), it.inactive ? /*#__PURE__*/React.createElement(Pill, {
    kind: "slate"
  }, "Inativo") : /*#__PURE__*/React.createElement(Pill, {
    kind: "ok"
  }, "Ativo"))))), /*#__PURE__*/React.createElement("div", {
    className: "m-fab",
    style: {
      position: "absolute"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 18,
    color: "#fff"
  }), "Novo item"));
}

// ============== 5. Financeiro ==============
function ScreenFinance() {
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Financeiro",
    sub: "Maio \xB7 2026",
    scrollPad: 120
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-card m-metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Recebido"), /*#__PURE__*/React.createElement("div", {
    className: "val",
    style: {
      color: "var(--success)"
    }
  }, fmtMoney("12480")), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "17 recebimentos")), /*#__PURE__*/React.createElement("div", {
    className: "m-card m-metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl"
  }, "Pendente"), /*#__PURE__*/React.createElement("div", {
    className: "val"
  }, fmtMoney("2480")), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "5 lan\xE7amentos")), /*#__PURE__*/React.createElement("div", {
    className: "m-card m-metric",
    style: {
      gridColumn: "span 2",
      borderColor: "#FECACA"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "lbl",
    style: {
      color: "var(--danger)"
    }
  }, "Vencido"), /*#__PURE__*/React.createElement("div", {
    className: "val",
    style: {
      color: "var(--danger)"
    }
  }, fmtMoney("740")), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, "1 lan\xE7amento \xB7 OS #1019"))), /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 6,
      marginBottom: 14,
      overflowX: "auto"
    }
  }, ["Tudo", "Pendente", "Recebido", "Vencido", "Pix", "Boleto"].map((f, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "m-badge " + (i === 0 ? "b-brand" : "b-slate"),
    style: {
      whiteSpace: "nowrap"
    }
  }, f))), /*#__PURE__*/React.createElement("div", {
    className: "m-section-title"
  }, "Lan\xE7amentos recentes"), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px"
    }
  }, [{
    c: "Mercado São João",
    o: "OS #1024",
    v: "740,00",
    s: "pending",
    d: "vence 20/05",
    m: "Pix"
  }, {
    c: "Ana Souza",
    o: "ORÇ #247",
    v: "1.480,00",
    s: "paid",
    d: "recebido 10/05",
    m: "Pix"
  }, {
    c: "Construtora Vila Nova",
    o: "OS #1019",
    v: "740,00",
    s: "overdue",
    d: "venceu 02/05",
    m: "Boleto"
  }, {
    c: "Roberta Lima",
    o: "OS #1018",
    v: "320,00",
    s: "partial",
    d: "50% recebido",
    m: "Dinheiro"
  }, {
    c: "Padaria Quatro Cantos",
    o: "OS #1015",
    v: "890,00",
    s: "paid",
    d: "recebido 03/05",
    m: "Pix"
  }].map((r, i, a) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "12px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, r.c), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 2
    }
  }, r.o, " \xB7 ", r.m, " \xB7 ", r.d)), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-money",
    style: {
      fontSize: 15
    }
  }, "R$ ", r.v), /*#__PURE__*/React.createElement(Pill, {
    kind: {
      pending: "warn",
      paid: "ok",
      overdue: "bad",
      partial: "info"
    }[r.s]
  }, {
    pending: "Pendente",
    paid: "Recebido",
    overdue: "Vencido",
    partial: "Parcial"
  }[r.s]))))), /*#__PURE__*/React.createElement("div", {
    className: "m-fab",
    style: {
      position: "absolute"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 18,
    color: "#fff"
  }), "Registrar recebimento"));
}

// ============== 6. Documentos ==============
function ScreenDocs() {
  const [tab, setTab] = useState("Orçamentos");
  const tabs = ["Orçamentos", "OS", "Recibos", "Relatórios", "Contratos"];
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Documentos",
    sub: "124 documentos"
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 6,
      marginBottom: 14,
      overflowX: "auto"
    }
  }, tabs.map(t => /*#__PURE__*/React.createElement("div", {
    key: t,
    onClick: () => setTab(t),
    className: "m-badge " + (t === tab ? "b-brand" : "b-slate"),
    style: {
      whiteSpace: "nowrap",
      cursor: "pointer"
    }
  }, t))), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px"
    }
  }, [{
    n: "Orçamento #2031",
    c: "Ana Martins",
    d: "10/05 · 14h",
    s: "sent"
  }, {
    n: "Orçamento #2030",
    c: "Mercado São João",
    d: "09/05 · 09h",
    s: "draft"
  }, {
    n: "Orçamento #2029",
    c: "Construtora Vila Nova",
    d: "08/05 · 17h",
    s: "sent"
  }, {
    n: "Orçamento #2028",
    c: "Padaria Quatro Cantos",
    d: "05/05 · 11h",
    s: "sent"
  }].map((d, i, a) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "12px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 44,
      borderRadius: 6,
      background: "linear-gradient(180deg,#FEE2E2,#FECACA)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#991B1B",
      fontWeight: 700,
      fontSize: 10
    }
  }, "PDF"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      marginLeft: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, d.n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 2,
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, d.c, " \xB7 ", d.d)), /*#__PURE__*/React.createElement(Icon, {
    name: "dots",
    size: 18,
    color: "#94A3B8"
  })))), /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 8,
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 42
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pdf",
    size: 16
  }), "Visualizar"), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 42
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "msg",
    size: 16
  }), "Compartilhar")));
}

// ============== 7. Conta ==============
function ScreenAccount() {
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Conta",
    back: true
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 14,
      textAlign: "center",
      padding: "22px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-avatar",
    style: {
      width: 76,
      height: 76,
      fontSize: 24,
      margin: "0 auto"
    }
  }, "JP"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 18,
      marginTop: 12
    }
  }, "Jo\xE3o Pereira"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "joao.pereira@orcivo.com.br"), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "center",
      gap: 6,
      marginTop: 8
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    kind: "brand"
  }, "Administrador"), /*#__PURE__*/React.createElement(Pill, {
    kind: "ok"
  }, "Verificado"))), /*#__PURE__*/React.createElement("div", {
    className: "m-section-title"
  }, "Perfil"), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px",
      marginBottom: 14
    }
  }, [["Nome", "João Pereira"], ["Email", "joao.pereira@orcivo.com.br"], ["Telefone", "(11) 98123-4521"], ["Empresa atual", "Ribeiro Elétrica"]].map(([k, v], i, a) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "12px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, k), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      fontWeight: 500,
      marginTop: 2
    }
  }, v)), /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 18,
    color: "#94A3B8"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "m-section-title"
  }, "Seguran\xE7a"), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(ListCard, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 18
    }),
    title: "Alterar senha",
    sub: "\xDAltima altera\xE7\xE3o h\xE1 2 meses"
  }), /*#__PURE__*/React.createElement(ListCard, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "shield",
      size: 18
    }),
    title: "Autentica\xE7\xE3o em 2 fatores",
    sub: "Ativa via SMS",
    badge: /*#__PURE__*/React.createElement(Pill, {
      kind: "ok"
    }, "Ativada"),
    chev: false
  }), /*#__PURE__*/React.createElement(ListCard, {
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: "user",
      size: 18
    }),
    title: "Sess\xF5es ativas",
    sub: "2 dispositivos"
  })), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    style: {
      color: "var(--danger)",
      borderColor: "#FECACA"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "back",
    size: 16,
    color: "currentColor"
  }), "Sair da conta"));
}

// ============== 8. Configurações ==============
function ScreenSettings() {
  const groups = [{
    title: "Empresa",
    items: [{
      i: "building",
      n: "Dados da empresa",
      s: "Ribeiro Elétrica · CNPJ 12.345.678/0001-90"
    }, {
      i: "image",
      n: "Identidade visual",
      s: "Logo, cor principal e dados no PDF"
    }, {
      i: "money",
      n: "Chave Pix",
      s: "CNPJ · 12.345.678/0001-90"
    }]
  }, {
    title: "Preferências",
    items: [{
      i: "bell",
      n: "Notificações",
      s: "Push, email e WhatsApp"
    }, {
      i: "file",
      n: "Exportação de dados",
      s: "Excel, CSV, PDF"
    }, {
      i: "help",
      n: "Suporte",
      s: "Central de ajuda · contato@orcivo.com"
    }]
  }];
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Configura\xE7\xF5es",
    back: true
  }, groups.map((g, gi) => /*#__PURE__*/React.createElement("div", {
    key: gi,
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-section-title",
    style: {
      marginTop: gi === 0 ? 0 : 18
    }
  }, g.title), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px"
    }
  }, g.items.map((it, i) => /*#__PURE__*/React.createElement(ListCard, {
    key: i,
    leading: /*#__PURE__*/React.createElement(Icon, {
      name: it.i,
      size: 18
    }),
    title: it.n,
    sub: it.s
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "m-section-title"
  }, "Identidade no documento"), /*#__PURE__*/React.createElement("div", {
    className: "m-card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 14,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 64,
      height: 64,
      borderRadius: 12,
      background: "var(--purple-50)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--purple-700)",
      fontWeight: 700,
      fontSize: 22
    }
  }, "RE"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Ribeiro El\xE9trica"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Mostrado no topo dos PDFs"), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    style: {
      height: 32,
      fontSize: 12,
      marginTop: 8,
      width: "auto",
      padding: "0 12px"
    }
  }, "Trocar logo"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14,
      paddingTop: 14,
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      fontWeight: 500,
      marginBottom: 8
    }
  }, "Cor principal"), /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 10
    }
  }, ["#6D28D9", "#0F172A", "#16A34A", "#DC2626", "#0891B2"].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      width: 36,
      height: 36,
      borderRadius: 10,
      background: c,
      border: i === 0 ? "3px solid #fff" : "0",
      boxShadow: i === 0 ? "0 0 0 2px var(--purple-600)" : "inset 0 0 0 1px rgba(0,0,0,.06)"
    }
  }))))));
}

// ============== 9. Usuários e permissões ==============
function ScreenUsers() {
  const users = [{
    n: "João Pereira",
    e: "joao@ribeiro.com",
    r: "Administrador",
    s: "active",
    last: "agora",
    you: true
  }, {
    n: "Marcos Silva",
    e: "marcos@ribeiro.com",
    r: "Técnico",
    s: "active",
    last: "há 1h"
  }, {
    n: "Carla Lima",
    e: "carla@ribeiro.com",
    r: "Operação",
    s: "active",
    last: "há 3h"
  }, {
    n: "Rafael Costa",
    e: "rafael@ribeiro.com",
    r: "Técnico",
    s: "invited",
    last: "convidado 12/05"
  }, {
    n: "Ana Maria",
    e: "ana@ribeiro.com",
    r: "Operação",
    s: "inactive",
    last: "há 2 meses"
  }];
  const sm = {
    active: ["ok", "Ativo"],
    invited: ["info", "Convite pendente"],
    inactive: ["slate", "Inativo"]
  };
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Usu\xE1rios e permiss\xF5es",
    sub: "4 ativos \xB7 1 pendente",
    back: true,
    scrollPad: 120
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-primary",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    color: "#fff"
  }), "Convidar usu\xE1rio"), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px",
      marginBottom: 14
    }
  }, users.map((u, i, a) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "12px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-avatar"
  }, u.n.split(" ").map(w => w[0]).slice(0, 2).join("")), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      marginLeft: 12,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, u.n), u.you && /*#__PURE__*/React.createElement(Pill, {
    kind: "brand"
  }, "voc\xEA")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis"
    }
  }, u.r, " \xB7 ", u.last)), /*#__PURE__*/React.createElement(Pill, {
    kind: sm[u.s][0]
  }, sm[u.s][1])))), /*#__PURE__*/React.createElement("div", {
    className: "m-section-title"
  }, "Permiss\xF5es \u2014 T\xE9cnico"), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px"
    }
  }, [["Clientes", "Ver clientes atribuídos", true], ["Orçamentos", "Criar e editar", true], ["Ordens de Serviço", "Executar OS atribuídas", true], ["Financeiro", "Apenas leitura", false], ["Catálogo", "Apenas leitura", true], ["Agenda", "Ver agenda da empresa", true], ["Administração", "Acesso bloqueado", false]].map(([t, s, on], i, a) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "12px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, s)), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 44,
      height: 26,
      borderRadius: 13,
      background: on ? "var(--purple-600)" : "#CBD5E1",
      position: "relative",
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 3,
      left: on ? 21 : 3,
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "#fff",
      transition: "left .2s"
    }
  }))))));
}

// ============== 10. Plano e assinatura ==============
function ScreenPlan() {
  return /*#__PURE__*/React.createElement(ScreenChrome, {
    title: "Plano e assinatura",
    back: true
  }, /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      background: "linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)",
      border: 0,
      color: "#fff",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: .7,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 600
    }
  }, "Plano atual"), /*#__PURE__*/React.createElement("div", {
    className: "m-badge",
    style: {
      background: "rgba(255,255,255,.18)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Ativo")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      marginTop: 8,
      letterSpacing: "-0.02em"
    }
  }, "Orcivo Mais"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      opacity: .85,
      marginTop: 4
    }
  }, "Pr\xF3xima cobran\xE7a em 28/05 \xB7 conforme o plano"), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "rgba(255,255,255,.2)",
      margin: "14px 0"
    }
  }), /*#__PURE__*/React.createElement(Row, {
    style: {
      justifyContent: "space-between",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: .7
    }
  }, "T\xE9cnicos"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginTop: 2
    }
  }, "4 inclu\xEDdos")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: .7
    }
  }, "OS no m\xEAs"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginTop: 2
    }
  }, "uso justo")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      opacity: .7
    }
  }, "Armaz."), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginTop: 2
    }
  }, "1.2 / 20 GB")))), /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 8,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 42,
      fontSize: 13
    }
  }, "Ver planos"), /*#__PURE__*/React.createElement("button", {
    className: "m-btn m-btn-outline",
    style: {
      flex: 1,
      height: 42,
      fontSize: 13
    }
  }, "Gerenciar assinatura")), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      marginBottom: 14,
      background: "#FFFBEB",
      borderColor: "#FDE68A"
    }
  }, /*#__PURE__*/React.createElement(Row, {
    style: {
      gap: 10,
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 18,
    color: "#92400E"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13,
      color: "#92400E",
      lineHeight: 1.45
    }
  }, "Sua assinatura \xE9 gerenciada pelo painel da sua conta. Acesse o painel para regularizar ou alterar seu plano."))), /*#__PURE__*/React.createElement("div", {
    className: "m-section-title"
  }, "Pagamentos recentes"), /*#__PURE__*/React.createElement("div", {
    className: "m-card",
    style: {
      padding: "4px 14px"
    }
  }, [{
    d: "28/04",
    s: "paid"
  }, {
    d: "28/03",
    s: "paid"
  }, {
    d: "28/02",
    s: "paid"
  }, {
    d: "28/01",
    s: "paid"
  }].map((p, i, a) => /*#__PURE__*/React.createElement(Row, {
    key: i,
    style: {
      padding: "12px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      borderRadius: 9,
      background: "var(--success-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--success)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      marginLeft: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, "Orcivo Mais \xB7 mensal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Pago em ", p.d)), /*#__PURE__*/React.createElement("span", {
    className: "m-badge b-ok",
    style: {
      padding: "4px 9px"
    }
  }, "Pago")))));
}

// ----- router -----
const MOBILE_SCREENS = {
  mais: ["Operação", ScreenMais],
  os: ["Ordens de Serviço", ScreenOSList],
  "os-detail": ["Detalhe da OS", ScreenOSDetail],
  catalog: ["Catálogo", ScreenCatalog],
  finance: ["Financeiro", ScreenFinance],
  docs: ["Documentos", ScreenDocs],
  account: ["Conta", ScreenAccount],
  settings: ["Configurações", ScreenSettings],
  users: ["Usuários", ScreenUsers],
  plan: ["Plano", ScreenPlan]
};
window.MOBILE_SCREENS = MOBILE_SCREENS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/Operations.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/android-frame.jsx
try { (() => {
// Android.jsx — Simplified Android (Material 3) device frame
// Status bar + top app bar + content + gesture nav + keyboard.
// Based on Figma M3 spec. No dependencies, no image assets.

const MD_C = {
  surface: '#f4fbf8',
  surfaceVariant: '#dae5e1',
  inverseOnSurface: '#ecf2ef',
  secondaryContainer: '#cde8e1',
  primaryFixedDim: '#83d5c6',
  onSurface: '#171d1b',
  onSurfaceVar: '#49454f',
  onPrimaryContainer: '#00201c',
  primary: '#006a60',
  frameBorder: 'rgba(116,119,117,0.5)'
};

// ─────────────────────────────────────────────────────────────
// Status bar (time left, wifi/cell/battery right)
// ─────────────────────────────────────────────────────────────
function AndroidStatusBar({
  dark = false
}) {
  const c = dark ? '#fff' : MD_C.onSurface;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      position: 'relative',
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 128,
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 14,
      fontWeight: 400,
      letterSpacing: 0.25,
      lineHeight: '20px',
      color: c
    }
  }, "9:30")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      left: '50%',
      top: 8,
      transform: 'translateX(-50%)',
      width: 24,
      height: 24,
      borderRadius: 100,
      background: '#2e2e2e'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      paddingRight: 2
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    style: {
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8 13.3L.67 5.97a10.37 10.37 0 0114.66 0L8 13.3z",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16",
    style: {
      marginRight: -2
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M14.67 14.67V1.33L1.33 14.67h13.34z",
    fill: c
  }))), /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 16 16"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "3.75",
    y: "2",
    width: "8.5",
    height: "13",
    rx: "1.5",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "5.5",
    y: "0.9",
    width: "5",
    height: "2",
    rx: "0.5",
    fill: c
  }))));
}

// ─────────────────────────────────────────────────────────────
// Top app bar (Material 3 small/medium)
// ─────────────────────────────────────────────────────────────
function AndroidAppBar({
  title = 'Title',
  large = false
}) {
  const iconDot = /*#__PURE__*/React.createElement("div", {
    style: {
      width: 48,
      height: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: '50%',
      background: MD_C.onSurfaceVar,
      opacity: 0.3
    }
  }));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: MD_C.surface,
      padding: '4px 4px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      display: 'flex',
      alignItems: 'center',
      gap: 4
    }
  }, iconDot, !large && /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      fontSize: 22,
      fontWeight: 400,
      color: MD_C.onSurface,
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, title), large && /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }), iconDot), large && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 16px 20px',
      fontSize: 28,
      fontWeight: 400,
      color: MD_C.onSurface,
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// List item (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidListItem({
  headline,
  supporting,
  leading
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '12px 16px',
      minHeight: 56,
      boxSizing: 'border-box',
      fontFamily: 'Roboto, system-ui, sans-serif'
    }
  }, leading && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 40,
      height: 40,
      borderRadius: '50%',
      background: MD_C.primary,
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      fontWeight: 500,
      flexShrink: 0
    }
  }, leading), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 16,
      color: MD_C.onSurface,
      lineHeight: '24px'
    }
  }, headline), supporting && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      color: MD_C.onSurfaceVar,
      lineHeight: '20px'
    }
  }, supporting)));
}

// ─────────────────────────────────────────────────────────────
// Gesture nav bar (pill)
// ─────────────────────────────────────────────────────────────
function AndroidNavBar({
  dark = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 24,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 108,
      height: 4,
      borderRadius: 2,
      background: dark ? '#fff' : MD_C.onSurface,
      opacity: 0.4
    }
  }));
}

// ─────────────────────────────────────────────────────────────
// Device frame — wraps everything
// ─────────────────────────────────────────────────────────────
function AndroidDevice({
  children,
  width = 412,
  height = 892,
  dark = false,
  title,
  large = false,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 18,
      overflow: 'hidden',
      background: dark ? '#1d1b20' : MD_C.surface,
      border: `8px solid ${MD_C.frameBorder}`,
      boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }
  }, /*#__PURE__*/React.createElement(AndroidStatusBar, {
    dark: dark
  }), title !== undefined && /*#__PURE__*/React.createElement(AndroidAppBar, {
    title: title,
    large: large
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(AndroidKeyboard, null), /*#__PURE__*/React.createElement(AndroidNavBar, {
    dark: dark
  }));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — Gboard (Material 3)
// ─────────────────────────────────────────────────────────────
function AndroidKeyboard() {
  let _k = 0;
  const key = (l, {
    flex = 1,
    bg = MD_C.surface,
    r = 6,
    minW,
    fs = 21
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: _k++,
    style: {
      height: 46,
      borderRadius: r,
      flex,
      minWidth: minW,
      background: bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Roboto, system-ui',
      fontSize: fs,
      color: MD_C.onPrimaryContainer
    }
  }, l);
  const row = (keys, style = {}) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      justifyContent: 'center',
      ...style
    }
  }, keys.map(l => key(l)));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: MD_C.inverseOnSurface,
      padding: '0 8px 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], {
    padding: '0 20px'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, key('', {
    bg: MD_C.surfaceVariant
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flex: 7,
      minWidth: 274
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l))), key('', {
    bg: MD_C.surfaceVariant
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, key('?123', {
    bg: MD_C.secondaryContainer,
    r: 100,
    minW: 58,
    fs: 14
  }), key(',', {
    bg: MD_C.surfaceVariant
  }), key('', {
    flex: 3,
    minW: 154
  }), key('.', {
    bg: MD_C.surfaceVariant
  }), key('', {
    bg: MD_C.primaryFixedDim,
    r: 100,
    minW: 58
  }))));
}
Object.assign(window, {
  AndroidDevice,
  AndroidStatusBar,
  AndroidAppBar,
  AndroidListItem,
  AndroidNavBar,
  AndroidKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/android-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mobile/ios-frame.jsx
try { (() => {
// iOS.jsx — Simplified iOS 26 (Liquid Glass) device frame
// Based on the iOS 26 UI Kit + Figma status bar spec. No assets, no deps.
// Exports: IOSDevice, IOSStatusBar, IOSNavBar, IOSGlassPill, IOSList, IOSListRow, IOSKeyboard

// ─────────────────────────────────────────────────────────────
// Status bar
// ─────────────────────────────────────────────────────────────
function IOSStatusBar({
  dark = false,
  time = '9:41'
}) {
  const c = dark ? '#fff' : '#000';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 154,
      alignItems: 'center',
      justifyContent: 'center',
      padding: '21px 24px 19px',
      boxSizing: 'border-box',
      position: 'relative',
      zIndex: 20,
      width: '100%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 1.5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: '-apple-system, "SF Pro", system-ui',
      fontWeight: 590,
      fontSize: 17,
      lineHeight: '22px',
      color: c
    }
  }, time)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingTop: 1,
      paddingRight: 1
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "19",
    height: "12",
    viewBox: "0 0 19 12"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "7.5",
    width: "3.2",
    height: "4.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "4.8",
    y: "5",
    width: "3.2",
    height: "7",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9.6",
    y: "2.5",
    width: "3.2",
    height: "9.5",
    rx: "0.7",
    fill: c
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14.4",
    y: "0",
    width: "3.2",
    height: "12",
    rx: "0.7",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "17",
    height: "12",
    viewBox: "0 0 17 12"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8.5 6.8C9.9 6.8 11.1 7.3 12 8.2L13.1 7.1C11.8 5.9 10.2 5.1 8.5 5.1C6.8 5.1 5.2 5.9 3.9 7.1L5 8.2C5.9 7.3 7.1 6.8 8.5 6.8Z",
    fill: c
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "10.5",
    r: "1.5",
    fill: c
  })), /*#__PURE__*/React.createElement("svg", {
    width: "27",
    height: "13",
    viewBox: "0 0 27 13"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0.5",
    y: "0.5",
    width: "23",
    height: "12",
    rx: "3.5",
    stroke: c,
    strokeOpacity: "0.35",
    fill: "none"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "2",
    y: "2",
    width: "20",
    height: "9",
    rx: "2",
    fill: c
  }), /*#__PURE__*/React.createElement("path", {
    d: "M25 4.5V8.5C25.8 8.2 26.5 7.2 26.5 6.5C26.5 5.8 25.8 4.8 25 4.5Z",
    fill: c,
    fillOpacity: "0.4"
  }))));
}

// ─────────────────────────────────────────────────────────────
// Liquid glass pill — blur + tint + shine
// ─────────────────────────────────────────────────────────────
function IOSGlassPill({
  children,
  dark = false,
  style = {}
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      height: 44,
      minWidth: 44,
      borderRadius: 9999,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: dark ? '0 2px 6px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.07), 0 3px 10px rgba(0,0,0,0.06)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.28)' : 'rgba(255,255,255,0.5)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 9999,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15), inset -1px -1px 1px rgba(255,255,255,0.08)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 1,
      display: 'flex',
      alignItems: 'center',
      padding: '0 4px'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Navigation bar — glass pills + large title
// ─────────────────────────────────────────────────────────────
function IOSNavBar({
  title = 'Title',
  dark = false,
  trailingIcon = true
}) {
  const muted = dark ? 'rgba(255,255,255,0.6)' : '#404040';
  const text = dark ? '#fff' : '#000';
  const pillIcon = content => /*#__PURE__*/React.createElement(IOSGlassPill, {
    dark: dark
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 36,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, content));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      paddingTop: 62,
      paddingBottom: 10,
      position: 'relative',
      zIndex: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px'
    }
  }, pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "20",
    viewBox: "0 0 12 20",
    fill: "none",
    style: {
      marginLeft: -1
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10 2L2 10l8 8",
    stroke: muted,
    strokeWidth: "2.5",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }))), trailingIcon && pillIcon(/*#__PURE__*/React.createElement("svg", {
    width: "22",
    height: "6",
    viewBox: "0 0 22 6"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "3",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "3",
    r: "2.5",
    fill: muted
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "19",
    cy: "3",
    r: "2.5",
    fill: muted
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 16px',
      fontFamily: '-apple-system, system-ui',
      fontSize: 34,
      fontWeight: 700,
      lineHeight: '41px',
      color: text,
      letterSpacing: 0.4
    }
  }, title));
}

// ─────────────────────────────────────────────────────────────
// Grouped list (inset card, r:26) + row (52px)
// ─────────────────────────────────────────────────────────────
function IOSListRow({
  title,
  detail,
  icon,
  chevron = true,
  isLast = false,
  dark = false
}) {
  const text = dark ? '#fff' : '#000';
  const sec = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const ter = dark ? 'rgba(235,235,245,0.3)' : 'rgba(60,60,67,0.3)';
  const sep = dark ? 'rgba(84,84,88,0.65)' : 'rgba(60,60,67,0.12)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      minHeight: 52,
      padding: '0 16px',
      position: 'relative',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      letterSpacing: -0.43
    }
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 30,
      borderRadius: 7,
      background: icon,
      marginRight: 12,
      flexShrink: 0
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      color: text
    }
  }, title), detail && /*#__PURE__*/React.createElement("span", {
    style: {
      color: sec,
      marginRight: 6
    }
  }, detail), chevron && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "14",
    viewBox: "0 0 8 14",
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1l6 6-6 6",
    stroke: ter,
    strokeWidth: "2",
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  })), !isLast && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      left: icon ? 58 : 16,
      height: 0.5,
      background: sep
    }
  }));
}
function IOSList({
  header,
  children,
  dark = false
}) {
  const hc = dark ? 'rgba(235,235,245,0.6)' : 'rgba(60,60,67,0.6)';
  const bg = dark ? '#1C1C1E' : '#fff';
  return /*#__PURE__*/React.createElement("div", null, header && /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: '-apple-system, system-ui',
      fontSize: 13,
      color: hc,
      textTransform: 'uppercase',
      padding: '8px 36px 6px',
      letterSpacing: -0.08
    }
  }, header), /*#__PURE__*/React.createElement("div", {
    style: {
      background: bg,
      borderRadius: 26,
      margin: '0 16px',
      overflow: 'hidden'
    }
  }, children));
}

// ─────────────────────────────────────────────────────────────
// Device frame
// ─────────────────────────────────────────────────────────────
function IOSDevice({
  children,
  width = 402,
  height = 874,
  dark = false,
  title,
  keyboard = false
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      width,
      height,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#F2F2F7',
      boxShadow: '0 40px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system, system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 11,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 126,
      height: 37,
      borderRadius: 24,
      background: '#000',
      zIndex: 50
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10
    }
  }, /*#__PURE__*/React.createElement(IOSStatusBar, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column'
    }
  }, title !== undefined && /*#__PURE__*/React.createElement(IOSNavBar, {
    title: title,
    dark: dark
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflow: 'auto'
    }
  }, children), keyboard && /*#__PURE__*/React.createElement(IOSKeyboard, {
    dark: dark
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 60,
      height: 34,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      paddingBottom: 8,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 139,
      height: 5,
      borderRadius: 100,
      background: dark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.25)'
    }
  })));
}

// ─────────────────────────────────────────────────────────────
// Keyboard — iOS 26 liquid glass
// ─────────────────────────────────────────────────────────────
function IOSKeyboard({
  dark = false
}) {
  const glyph = dark ? 'rgba(255,255,255,0.7)' : '#595959';
  const sugg = dark ? 'rgba(255,255,255,0.6)' : '#333';
  const keyBg = dark ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.85)';

  // special-key icons
  const icons = {
    shift: /*#__PURE__*/React.createElement("svg", {
      width: "19",
      height: "17",
      viewBox: "0 0 19 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M9.5 1L1 9.5h4.5V16h8V9.5H18L9.5 1z",
      fill: glyph
    })),
    del: /*#__PURE__*/React.createElement("svg", {
      width: "23",
      height: "17",
      viewBox: "0 0 23 17"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M7 1h13a2 2 0 012 2v11a2 2 0 01-2 2H7l-6-7.5L7 1z",
      fill: "none",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinejoin: "round"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 5l7 7M17 5l-7 7",
      stroke: glyph,
      strokeWidth: "1.6",
      strokeLinecap: "round"
    })),
    ret: /*#__PURE__*/React.createElement("svg", {
      width: "20",
      height: "14",
      viewBox: "0 0 20 14"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M18 1v6H4m0 0l4-4M4 7l4 4",
      fill: "none",
      stroke: "#fff",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }))
  };
  const key = (content, {
    w,
    flex,
    ret,
    fs = 25,
    k
  } = {}) => /*#__PURE__*/React.createElement("div", {
    key: k,
    style: {
      height: 42,
      borderRadius: 8.5,
      flex: flex ? 1 : undefined,
      width: w,
      minWidth: 0,
      background: ret ? '#08f' : keyBg,
      boxShadow: '0 1px 0 rgba(0,0,0,0.075)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, "SF Compact", system-ui',
      fontSize: fs,
      fontWeight: 458,
      color: ret ? '#fff' : glyph
    }
  }, content);
  const row = (keys, pad = 0) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      justifyContent: 'center',
      padding: `0 ${pad}px`
    }
  }, keys.map(l => key(l, {
    flex: true,
    k: l
  })));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      zIndex: 15,
      borderRadius: 27,
      overflow: 'hidden',
      padding: '11px 0 2px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      boxShadow: dark ? '0 -2px 20px rgba(0,0,0,0.09)' : '0 -1px 6px rgba(0,0,0,0.018), 0 -3px 20px rgba(0,0,0,0.012)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      backdropFilter: 'blur(12px) saturate(180%)',
      WebkitBackdropFilter: 'blur(12px) saturate(180%)',
      background: dark ? 'rgba(120,120,128,0.14)' : 'rgba(255,255,255,0.25)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      borderRadius: 27,
      boxShadow: dark ? 'inset 1.5px 1.5px 1px rgba(255,255,255,0.15)' : 'inset 1.5px 1.5px 1px rgba(255,255,255,0.7), inset -1px -1px 1px rgba(255,255,255,0.4)',
      border: dark ? '0.5px solid rgba(255,255,255,0.15)' : '0.5px solid rgba(0,0,0,0.06)',
      pointerEvents: 'none'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 20,
      alignItems: 'center',
      padding: '8px 22px 13px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, ['"The"', 'the', 'to'].map((w, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, i > 0 && /*#__PURE__*/React.createElement("div", {
    style: {
      width: 1,
      height: 25,
      background: '#ccc',
      opacity: 0.3
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      textAlign: 'center',
      fontFamily: '-apple-system, system-ui',
      fontSize: 17,
      color: sugg,
      letterSpacing: -0.43,
      lineHeight: '22px'
    }
  }, w)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 13,
      padding: '0 6.5px',
      width: '100%',
      boxSizing: 'border-box',
      position: 'relative'
    }
  }, row(['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p']), row(['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], 20), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 14.25,
      alignItems: 'center'
    }
  }, key(icons.shift, {
    w: 45,
    k: 'shift'
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6.5,
      flex: 1
    }
  }, ['z', 'x', 'c', 'v', 'b', 'n', 'm'].map(l => key(l, {
    flex: true,
    k: l
  }))), key(icons.del, {
    w: 45,
    k: 'del'
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      alignItems: 'center'
    }
  }, key('ABC', {
    w: 92.25,
    fs: 18,
    k: 'abc'
  }), key('', {
    flex: true,
    k: 'space'
  }), key(icons.ret, {
    w: 92.25,
    ret: true,
    k: 'ret'
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 56,
      width: '100%',
      position: 'relative'
    }
  }));
}
Object.assign(window, {
  IOSDevice,
  IOSStatusBar,
  IOSNavBar,
  IOSGlassPill,
  IOSList,
  IOSListRow,
  IOSKeyboard
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mobile/ios-frame.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/App.jsx
try { (() => {
function App() {
  const [route, setRoute] = React.useState("dashboard");
  const onNav = id => setRoute(id);
  return /*#__PURE__*/React.createElement("div", {
    className: "app"
  }, /*#__PURE__*/React.createElement(Sidebar, {
    route: route === "quote-new" ? "quotes" : route,
    onNav: onNav
  }), /*#__PURE__*/React.createElement("div", {
    className: "main"
  }, /*#__PURE__*/React.createElement(TopBar, null), route === "dashboard" && /*#__PURE__*/React.createElement(Dashboard, {
    onNav: onNav
  }), route === "customers" && /*#__PURE__*/React.createElement(Customers, null), route === "catalog" && /*#__PURE__*/React.createElement(Catalog, null), route === "quotes" && /*#__PURE__*/React.createElement(Quotes, {
    onNav: onNav
  }), route === "quote-new" && /*#__PURE__*/React.createElement(QuoteEditor, {
    onNav: onNav
  }), route === "work-orders" && /*#__PURE__*/React.createElement(WorkOrders, null), route === "agenda" && /*#__PURE__*/React.createElement(Agenda, null), route === "finance" && /*#__PURE__*/React.createElement(Finance, null), route === "settings" && /*#__PURE__*/React.createElement(Settings, null)));
}
ReactDOM.createRoot(document.getElementById("root")).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/CustomersAndQuotes.jsx
try { (() => {
// Customers page — list with search/filter and a detail drawer
function Customers() {
  const [q, setQ] = React.useState("");
  const rows = [{
    name: "Marcos Pereira",
    phone: "(11) 98123-4521",
    doc: "123.***.***-09",
    city: "São Paulo / SP",
    owner: "João R.",
    last: "há 2 dias"
  }, {
    name: "Construtora Vila Nova",
    phone: "(11) 4002-8922",
    doc: "12.345.678/0001-90",
    city: "Guarulhos / SP",
    owner: "João R.",
    last: "há 1 dia"
  }, {
    name: "Ana Souza",
    phone: "(11) 97744-1188",
    doc: "456.***.***-22",
    city: "São Paulo / SP",
    owner: "Téc. Carlos",
    last: "há 5 dias"
  }, {
    name: "Luiz Henrique",
    phone: "(21) 99887-3300",
    doc: "111.***.***-44",
    city: "Rio de Janeiro / RJ",
    owner: "João R.",
    last: "há 8 dias"
  }, {
    name: "Padaria Quatro Cantos",
    phone: "(11) 3221-7788",
    doc: "98.111.222/0001-33",
    city: "São Paulo / SP",
    owner: "Téc. Marcos",
    last: "há 12 dias"
  }, {
    name: "Roberta Lima",
    phone: "(11) 96655-2244",
    doc: "789.***.***-55",
    city: "Santo André / SP",
    owner: "João R.",
    last: "há 1 mês"
  }].filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()));
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Clientes"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, rows.length, " clientes cadastrados")), /*#__PURE__*/React.createElement("div", {
    className: "row-flex"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "filter",
    size: 16
  }), "Filtros"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Novo cliente"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 10,
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "search",
    style: {
      flex: 1,
      maxWidth: 360,
      background: "#fff",
      border: "1px solid var(--border-1)",
      height: 40,
      borderRadius: 10,
      padding: "0 12px",
      display: "flex",
      alignItems: "center",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    color: "#64748B"
  }), /*#__PURE__*/React.createElement("input", {
    value: q,
    onChange: e => setQ(e.target.value),
    placeholder: "Buscar por nome, telefone\u2026",
    style: {
      border: 0,
      outline: 0,
      flex: 1,
      fontSize: 14
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Nome"), /*#__PURE__*/React.createElement("th", null, "Telefone"), /*#__PURE__*/React.createElement("th", null, "Documento"), /*#__PURE__*/React.createElement("th", null, "Cidade"), /*#__PURE__*/React.createElement("th", null, "Respons\xE1vel"), /*#__PURE__*/React.createElement("th", null, "\xDAltima atividade"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 600
    }
  }, r.name)), /*#__PURE__*/React.createElement("td", null, r.phone), /*#__PURE__*/React.createElement("td", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13
    }
  }, r.doc), /*#__PURE__*/React.createElement("td", null, r.city), /*#__PURE__*/React.createElement("td", null, r.owner), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.last), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 16,
    color: "#94A3B8"
  }))))))));
}
window.Customers = Customers;

// Quotes list page
function Quotes({
  onNav
}) {
  const [tab, setTab] = React.useState("todos");
  const rows = [{
    n: "#248",
    cust: "Construtora Vila Nova",
    status: "pending",
    total: "4480",
    validUntil: "15/05",
    created: "08/05"
  }, {
    n: "#247",
    cust: "Marcos Pereira",
    status: "approved",
    total: "1480",
    validUntil: "22/05",
    created: "07/05"
  }, {
    n: "#246",
    cust: "Ana Souza",
    status: "rejected",
    total: "2300",
    validUntil: "30/04",
    created: "01/05"
  }, {
    n: "#245",
    cust: "Padaria Quatro Cantos",
    status: "draft",
    total: "890",
    validUntil: "—",
    created: "30/04"
  }, {
    n: "#244",
    cust: "Luiz Henrique",
    status: "approved",
    total: "3210",
    validUntil: "18/05",
    created: "28/04"
  }, {
    n: "#243",
    cust: "Roberta Lima",
    status: "expired",
    total: "760",
    validUntil: "25/04",
    created: "15/04"
  }];
  const statusMap = {
    draft: {
      cls: "slate",
      label: "Rascunho"
    },
    pending: {
      cls: "warning",
      label: "Pendente"
    },
    approved: {
      cls: "success",
      label: "Aprovado"
    },
    rejected: {
      cls: "danger",
      label: "Rejeitado"
    },
    expired: {
      cls: "slate",
      label: "Expirado"
    }
  };
  const filtered = tab === "todos" ? rows : rows.filter(r => r.status === tab);
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Or\xE7amentos"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, rows.length, " no total")), /*#__PURE__*/React.createElement("div", {
    className: "row-flex"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "filter",
    size: 16
  }), "Filtros"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => onNav("quote-new")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Novo or\xE7amento"))), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, [["todos", "Todos"], ["draft", "Rascunho"], ["pending", "Pendentes"], ["approved", "Aprovados"], ["rejected", "Rejeitados"], ["expired", "Expirados"]].map(([id, l]) => /*#__PURE__*/React.createElement("div", {
    key: id,
    className: "tab" + (tab === id ? " active" : ""),
    onClick: () => setTab(id)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "N\xFAmero"), /*#__PURE__*/React.createElement("th", null, "Cliente"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Valor"), /*#__PURE__*/React.createElement("th", null, "Validade"), /*#__PURE__*/React.createElement("th", null, "Criado"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, filtered.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600
    }
  }, r.n), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 600
    }
  }, r.cust)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "badge " + statusMap[r.status].cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), statusMap[r.status].label)), /*#__PURE__*/React.createElement("td", {
    className: "num money"
  }, fmtMoney(r.total)), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.validUntil), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.created), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 16,
    color: "#94A3B8"
  }))))))));
}
window.Quotes = Quotes;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/CustomersAndQuotes.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Dashboard.jsx
try { (() => {
function Dashboard({
  onNav
}) {
  const metrics = [{
    label: "Orçamentos pendentes",
    value: "8",
    sub: "2 vencem em 7 dias"
  }, {
    label: "OS em execução",
    value: "3",
    sub: "1 aguardando material"
  }, {
    label: "Compromissos hoje",
    value: "5",
    sub: "2 atribuídos a você"
  }, {
    label: "Recebido no mês",
    value: fmtMoney("12480"),
    sub: "17 recebimentos",
    money: true
  }];
  const upcoming = [{
    time: "09:00",
    title: "Visita técnica — CFTV",
    who: "Marcos Pereira",
    tag: "OS #312"
  }, {
    time: "11:30",
    title: "Instalação portão eletrônico",
    who: "Ana Souza",
    tag: "OS #318"
  }, {
    time: "14:00",
    title: "Orçamento presencial",
    who: "Construtora Vila Nova",
    tag: "ORÇ #248"
  }, {
    time: "16:00",
    title: "Retorno cliente",
    who: "Luiz Henrique",
    tag: "Cliente"
  }];
  const activity = [{
    who: "Marcos Pereira",
    what: "aprovou o orçamento",
    target: "#248",
    when: "há 2h",
    intent: "success"
  }, {
    who: "Você",
    what: "criou a OS",
    target: "#318",
    when: "há 4h",
    intent: "brand"
  }, {
    who: "Téc. Carlos",
    what: "finalizou a OS",
    target: "#311",
    when: "ontem",
    intent: "success"
  }, {
    who: "Ana Souza",
    what: "rejeitou o orçamento",
    target: "#244",
    when: "ontem",
    intent: "danger"
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Bom dia, Jo\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Aqui est\xE1 o resumo da sua opera\xE7\xE3o hoje.")), /*#__PURE__*/React.createElement("div", {
    className: "row-flex"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Novo cliente"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => onNav("quote-new")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Novo or\xE7amento"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16,
      marginBottom: 20
    }
  }, metrics.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, m.label), /*#__PURE__*/React.createElement("div", {
    className: "value"
  }, m.value), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, m.sub))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-2)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15
    }
  }, "Pr\xF3ximos compromissos"), /*#__PURE__*/React.createElement("a", {
    style: {
      fontSize: 13,
      color: "var(--purple-700)"
    },
    onClick: () => onNav("agenda")
  }, "Ver agenda")), upcoming.map((u, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 18px",
      borderBottom: i < upcoming.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 54,
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      color: "var(--ink)"
    }
  }, u.time), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, u.title), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, u.who)), /*#__PURE__*/React.createElement("span", {
    className: "badge slate"
  }, u.tag)))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-2)",
      fontWeight: 600,
      fontSize: 15
    }
  }, "Atividades recentes"), activity.map((a, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "12px 18px",
      borderBottom: i < activity.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "badge " + a.intent
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), a.target), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 600
    }
  }, a.who), " ", /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-3)"
    }
  }, a.what)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, a.when))))));
}
window.Dashboard = Dashboard;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Dashboard.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Icons.jsx
try { (() => {
// Tiny Lucide-style icon library, only what the kit uses.
window.Icon = function Icon({
  name,
  size = 18,
  stroke = 1.75,
  color = "currentColor",
  style = {}
}) {
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
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
  };
  const C = {
    home: null,
    users: /*#__PURE__*/React.createElement("circle", {
      cx: "9",
      cy: "7",
      r: "4"
    }),
    file: null,
    clip: /*#__PURE__*/React.createElement("rect", {
      x: "8",
      y: "3",
      width: "8",
      height: "4",
      rx: "1"
    }),
    cal: /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "5",
      width: "18",
      height: "16",
      rx: "2"
    }),
    money: null,
    pkg: null,
    cog: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    }),
    search: /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }),
    plus: null,
    chev: null,
    bell: null,
    check: null,
    alert: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    x: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    }),
    lock: /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "11",
      width: "18",
      height: "11",
      rx: "2"
    }),
    dots: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "9"
    }),
    pdf: null,
    share: null,
    cam: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "13",
      r: "4"
    }),
    filter: null,
    msg: null,
    phone: null,
    building: null,
    image: null,
    shield: null,
    info: /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "10"
    })
  };
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, C[name] || null, P[name] ? P[name].split(" M").map((d, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: i === 0 ? d : "M" + d
  })) : null);
};

// Money formatter pt-BR
window.fmtMoney = function (str) {
  const n = typeof str === "string" ? parseFloat(str.replace(",", ".")) : str;
  return "R$\u00A0" + n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Icons.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Operations.jsx
try { (() => {
// Orcivo Web Operations — all 9 screens, hash-routed
const {
  useState
} = React;
const Pill = ({
  k,
  children
}) => /*#__PURE__*/React.createElement("span", {
  className: "badge " + (k || "slate")
}, /*#__PURE__*/React.createElement("span", {
  className: "dot"
}), children);
const SM_OS = {
  open: ["info", "Aberta"],
  scheduled: ["brand", "Agendada"],
  in_progress: ["warning", "Em execução"],
  waiting_client: ["slate", "Aguard. cliente"],
  waiting_material: ["slate", "Aguard. material"],
  finished: ["success", "Finalizada"],
  cancelled: ["danger", "Cancelada"]
};
const SM_FIN = {
  pending: ["warning", "Pendente"],
  paid: ["success", "Recebido"],
  overdue: ["danger", "Vencido"],
  partial: ["info", "Parcial"]
};

// ============== DASHBOARD OPERACIONAL ==============
function WDashboard() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Bom dia, Jo\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Ter, 14 de maio \xB7 Ribeiro El\xE9trica \xB7 Orcivo Mais")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, "Hoje"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    color: "#fff"
  }), "A\xE7\xE3o r\xE1pida"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16,
      marginBottom: 20
    }
  }, [["Agenda hoje", "5", "2 em execução", "brand"], ["OS pendentes", "12", "3 aguard. material", "warning"], ["Orçamentos pendentes", "8", "2 vencem em 7 dias", "info"], ["Recebimentos pendentes", fmtMoney("2480"), "1 vencido", "danger"]].map(([l, v, s, c], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "card card-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 500
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 28,
      fontWeight: 700,
      marginTop: 4,
      letterSpacing: "-0.02em",
      color: c === "danger" ? "var(--danger)" : "var(--ink)"
    }
  }, v), /*#__PURE__*/React.createElement(Pill, {
    k: c
  }, s)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-2)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 15
    }
  }, "Agenda de hoje"), /*#__PURE__*/React.createElement("a", {
    style: {
      color: "var(--purple-700)",
      fontSize: 13,
      fontWeight: 500
    }
  }, "Ver tudo \u2192")), /*#__PURE__*/React.createElement("div", null, [["09:00", "Visita CFTV", "Mercado São João", "João Pereira", "in_progress"], ["11:30", "Instalação portão", "Ana Souza", "Marcos Silva", "scheduled"], ["14:00", "Orçamento presencial", "Construtora Vila Nova", "João Pereira", "open"], ["16:00", "Retorno cliente", "Luiz Henrique", "Carla Lima", "scheduled"]].map(([t, e, c, w, s], i, a) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 18px",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 13
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14
    }
  }, e), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, c, " \xB7 ", w)), /*#__PURE__*/React.createElement(Pill, {
    k: SM_OS[s][0]
  }, SM_OS[s][1]))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 15
    }
  }, "A\xE7\xF5es r\xE1pidas")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 0
    }
  }, [["users", "Novo cliente"], ["file", "Novo orçamento"], ["clip", "Nova OS"], ["cal", "Compromisso"], ["money", "Recebimento"], ["pkg", "Item catálogo"]].map(([i, l], x) => /*#__PURE__*/React.createElement("button", {
    key: x,
    className: "btn btn-ghost",
    style: {
      height: 64,
      justifyContent: "flex-start",
      borderRadius: 0,
      padding: "0 18px",
      borderRight: x % 2 === 0 ? "1px solid var(--border-2)" : 0,
      borderTop: x > 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 18,
    color: "#6D28D9"
  }), l)))), /*#__PURE__*/React.createElement("div", {
    className: "card card-body",
    style: {
      background: "#FFFBEB",
      borderColor: "#FDE68A"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-start",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "info",
    size: 18,
    color: "#92400E"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      color: "#92400E"
    }
  }, "Orcivo Mais \xB7 uso da equipe"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "#92400E",
      marginTop: 4
    }
  }, "4 t\xE9cnicos ativos. Veja os planos se sua equipe for crescer.")))))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 15,
      margin: "24px 0 12px"
    }
  }, "\xDAltimas atividades"), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, [["14:38", "João Pereira iniciou execução da OS #1024", "Em execução"], ["13:21", "Carla Lima criou orçamento #2031 para Ana Martins", "Rascunho"], ["11:08", "Pagamento de R$ 1.480 recebido — Ana Souza · ORÇ #247", "Pix"], ["10:55", "OS #1019 marcada como finalizada por Marcos Silva", "Finalizada"], ["09:12", "Convite enviado para rafael@ribeiro.com", "Pendente"]].map(([t, e, b], i, a) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 18px",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--fg-3)",
      width: 48,
      fontWeight: 600
    }
  }, t), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 13
    }
  }, e), /*#__PURE__*/React.createElement(Pill, {
    k: "slate"
  }, b)))));
}

// ============== ORDENS DE SERVIÇO ==============
function WOS() {
  const rows = [[1024, "Mercado São João", "Instalação câmera CFTV", "João Pereira", "in_progress", "Hoje · 14:30", "—", "R$ 1.480,00"], [1023, "Ana Souza", "Manutenção portão", "Marcos Silva", "scheduled", "Hoje · 09:00", "—", "R$ 680,00"], [1022, "Roberta Lima", "Instalação alarme", "João Pereira", "waiting_material", "13/05 · 10:00", "—", "R$ 2.140,00"], [1021, "Padaria Quatro Cantos", "Visita preventiva", "Marcos Silva", "finished", "13/05 · 15:00", "13/05 · 16:20", "R$ 320,00"], [1020, "Luiz Henrique", "Troca de fechadura", "Carla Lima", "finished", "12/05 · 11:00", "12/05 · 11:45", "R$ 280,00"], [1019, "Construtora Vila Nova", "Substituição DVR", "João Pereira", "finished", "10/05 · 14:00", "10/05 · 17:30", "R$ 1.480,00"], [1018, "Mercado São João", "Reparo elétrico", "Marcos Silva", "finished", "09/05 · 10:00", "09/05 · 12:00", "R$ 540,00"]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Ordens de Servi\xE7o"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "42 ativas \xB7 12 deste m\xEAs")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    color: "#fff"
  }), "Nova OS")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 14,
      display: "flex",
      gap: 10,
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 36,
      border: "1px solid var(--border-1)",
      borderRadius: 9,
      padding: "0 12px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    color: "#64748B"
  }), /*#__PURE__*/React.createElement("input", {
    style: {
      border: 0,
      background: "transparent",
      outline: 0,
      flex: 1,
      fontSize: 14
    },
    placeholder: "Buscar OS, cliente, t\xE9cnico\u2026"
  })), /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 160,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos os status")), /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 160,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos os t\xE9cnicos")), /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 140,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Este m\xEAs"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0,
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--slate-50)",
      textAlign: "left"
    }
  }, ["Número", "Cliente", "Serviço", "Técnico", "Status", "Agendada", "Finalizada", "Total", ""].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "10px 14px",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      fontFamily: "var(--font-mono)",
      fontWeight: 600
    }
  }, "#", r[0]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      fontWeight: 500
    }
  }, r[1]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      color: "var(--fg-2)"
    }
  }, r[2]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      color: "var(--fg-2)"
    }
  }, r[3]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    k: SM_OS[r[4]][0]
  }, SM_OS[r[4]][1])), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      color: "var(--fg-3)",
      fontFamily: "var(--font-mono)",
      fontSize: 12
    }
  }, r[5]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      color: "var(--fg-3)",
      fontFamily: "var(--font-mono)",
      fontSize: 12
    }
  }, r[6]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      fontWeight: 600,
      fontFamily: "var(--font-mono)"
    }
  }, r[7]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 14px",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dots",
    size: 16,
    color: "#94A3B8"
  }))))))));
}

// ============== DETALHE OS ==============
function WOSDetail() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 14,
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("a", {
    style: {
      color: "var(--purple-700)",
      fontWeight: 500
    }
  }, "Ordens de Servi\xE7o"), " / ", /*#__PURE__*/React.createElement("span", null, "OS #1024")), /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: 0
    }
  }, "OS #1024 \xB7 Instala\xE7\xE3o c\xE2mera CFTV"), /*#__PURE__*/React.createElement(Pill, {
    k: "warning"
  }, "Em execu\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Iniciada hoje \xE0s 14:38 \xB7 T\xE9cnico: Jo\xE3o Pereira")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pdf",
    size: 16
  }), "Gerar relat\xF3rio"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, "Duplicar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-success"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16,
    color: "#fff"
  }), "Finalizar OS"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 360px",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 15
    }
  }, "Execu\xE7\xE3o")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 18
    }
  }, ["Chegada no local", "Conferência do equipamento", "Instalação física", "Configuração do DVR", "Teste com cliente"].map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      borderBottom: i < 4 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 22,
      height: 22,
      borderRadius: 6,
      background: i < 2 ? "var(--purple-600)" : "#fff",
      border: i < 2 ? 0 : "1.5px solid var(--border-1)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }
  }, i < 2 && /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14,
    color: "#fff",
    stroke: 3
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      fontSize: 14,
      color: i < 2 ? "var(--fg-3)" : "var(--ink)",
      textDecoration: i < 2 ? "line-through" : "none"
    }
  }, s), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      fontFamily: "var(--font-mono)"
    }
  }, i < 2 ? "14:" + (38 + i * 5) : ""))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-2)",
      display: "flex",
      justifyContent: "space-between"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 15
    }
  }, "Materiais usados"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      height: 30,
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "Adicionar")), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("tbody", null, [["Câmera CFTV 4MP", "4 un", "R$ 320,00", "R$ 1.280,00"], ["Cabo coaxial 30m", "1 rolo", "R$ 180,00", "R$ 180,00"], ["DVR 8 canais", "1 un", "R$ 480,00", "R$ 480,00"]].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 18px",
      fontWeight: 500
    }
  }, r[0]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 18px",
      color: "var(--fg-3)"
    }
  }, r[1]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 18px",
      color: "var(--fg-3)",
      textAlign: "right"
    }
  }, r[2]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 18px",
      fontWeight: 600,
      fontFamily: "var(--font-mono)",
      textAlign: "right"
    }
  }, r[3])))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "14px 18px",
      borderBottom: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      fontSize: 15
    }
  }, "Fotos")), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 18,
      display: "grid",
      gridTemplateColumns: "repeat(6,1fr)",
      gap: 10
    }
  }, [1, 2, 3, 4, 5].map(i => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      aspectRatio: "1",
      background: "linear-gradient(135deg,#F1F5F9,#E2E8F0)",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#94A3B8"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cam",
    size: 22
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      aspectRatio: "1",
      border: "1.5px dashed var(--border-1)",
      borderRadius: 10,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--purple-700)",
      gap: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 18
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 11,
      fontWeight: 600
    }
  }, "Adicionar"))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card card-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 600
    }
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 15,
      marginTop: 6
    }
  }, "Mercado S\xE3o Jo\xE3o"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "(11) 4002-8922"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "Rua das Ac\xE1cias, 248 \u2014 Guarulhos / SP"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      height: 32,
      fontSize: 12,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "phone",
    size: 12
  }), "Ligar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      height: 32,
      fontSize: 12,
      flex: 1,
      color: "#16A34A"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "msg",
    size: 12
  }), "WhatsApp"))), /*#__PURE__*/React.createElement("div", {
    className: "card card-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 600
    }
  }, "Financeiro"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 8,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "Total da OS"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontFamily: "var(--font-mono)"
    }
  }, "R$ 1.480,00")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 6,
      fontSize: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: "var(--fg-2)"
    }
  }, "Recebido"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600,
      fontFamily: "var(--font-mono)",
      color: "var(--success)"
    }
  }, "R$ 740,00")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 8,
      paddingTop: 8,
      borderTop: "1px solid var(--border-2)",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, "Pendente"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)"
    }
  }, "R$ 740,00")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    style: {
      width: "100%",
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14,
    color: "#fff"
  }), "Registrar recebimento")), /*#__PURE__*/React.createElement("div", {
    className: "card card-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 600,
      marginBottom: 8
    }
  }, "Hist\xF3rico"), [["14:38", "Execução iniciada"], ["14:21", "Técnico chegou ao local"], ["08:10", "Agendada 14/05 14:30"], ["13/05", "Criada do ORÇ #248"]].map(([t, e], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      gap: 10,
      padding: "6px 0",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      width: 56,
      color: "var(--fg-3)",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      fontWeight: 600
    }
  }, t), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }, e)))))));
}

// ============== CATÁLOGO ==============
function WCatalog() {
  const rows = [["Serviço", "Visita técnica", "un", "R$ 180,00", true], ["Serviço", "Instalação câmera CFTV 4MP", "un", "R$ 320,00", true], ["Serviço", "Configuração DVR", "un", "R$ 240,00", true], ["Serviço", "Instalação portão eletrônico", "un", "R$ 680,00", true], ["Produto", "Câmera CFTV 4MP", "un", "R$ 320,00", true], ["Produto", "DVR 8 canais", "un", "R$ 480,00", true], ["Produto", "Cabo coaxial 30m", "rolo", "R$ 180,00", true], ["Produto", "Fonte 12V 5A", "un", "R$ 75,00", false], ["Mão de obra", "Hora técnica padrão", "h", "R$ 95,00", true], ["Mão de obra", "Hora extra", "h", "R$ 140,00", true], ["Outros", "Deslocamento até 20km", "un", "R$ 40,00", true]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Cat\xE1logo"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "38 itens ativos \xB7 4 inativos")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    color: "#fff"
  }), "Novo item")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 14,
      marginBottom: 14,
      display: "flex",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 36,
      border: "1px solid var(--border-1)",
      borderRadius: 9,
      padding: "0 12px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    color: "#64748B"
  }), /*#__PURE__*/React.createElement("input", {
    style: {
      border: 0,
      background: "transparent",
      outline: 0,
      flex: 1,
      fontSize: 14
    },
    placeholder: "Buscar no cat\xE1logo\u2026"
  })), /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 160,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos os tipos")), /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 140,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Ativos e inativos"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--slate-50)",
      textAlign: "left"
    }
  }, ["Tipo", "Nome", "Unidade", "Preço", "Status", ""].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "10px 16px",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    k: "brand"
  }, r[0])), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      fontWeight: 500,
      color: r[4] ? "var(--ink)" : "var(--fg-3)"
    }
  }, r[1]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "var(--fg-3)"
    }
  }, r[2]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      fontFamily: "var(--font-mono)",
      fontWeight: 600
    }
  }, r[3]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, r[4] ? /*#__PURE__*/React.createElement(Pill, {
    k: "success"
  }, "Ativo") : /*#__PURE__*/React.createElement(Pill, {
    k: "slate"
  }, "Inativo")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dots",
    size: 16,
    color: "#94A3B8"
  }))))))));
}

// ============== FINANCEIRO ==============
function WFinance() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Financeiro"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Maio \xB7 2026")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 16
  }), "Exportar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    color: "#fff"
  }), "Registrar recebimento"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16,
      marginBottom: 20
    }
  }, [["Recebido no período", fmtMoney("12480"), "17 lançamentos", "success"], ["Pendente", fmtMoney("2480"), "5 lançamentos", "warning"], ["Vencido", fmtMoney("740"), "1 lançamento — OS #1019", "danger"], ["Ticket médio", fmtMoney("734"), "+8% vs abril", "brand"]].map(([l, v, s, c], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "card card-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 500
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 24,
      fontWeight: 700,
      marginTop: 4,
      fontFamily: "var(--font-mono)",
      color: c === "danger" ? "var(--danger)" : c === "success" ? "var(--success)" : "var(--ink)"
    }
  }, v), /*#__PURE__*/React.createElement(Pill, {
    k: c
  }, s)))), /*#__PURE__*/React.createElement("div", {
    className: "card card-body",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13,
      color: "var(--fg-3)"
    }
  }, "Recebido por dia"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      marginTop: 2
    }
  }, "\xDAltimos 30 dias")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      fontSize: 12
    }
  }, ["7d", "30d", "90d"].map((t, i) => /*#__PURE__*/React.createElement("div", {
    key: t,
    className: "badge " + (i === 1 ? "brand" : "slate")
  }, t)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "flex-end",
      gap: 4,
      height: 120
    }
  }, Array.from({
    length: 30
  }, (_, i) => {
    const h = 30 + (Math.sin(i * 0.7) + 1) * 0.5 * 70 + (i % 5 === 0 ? 20 : 0);
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        flex: 1,
        height: h + "%",
        background: i > 25 ? "var(--purple-600)" : "var(--purple-200)",
        borderRadius: "3px 3px 0 0"
      }
    });
  }))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 14,
      display: "flex",
      gap: 10,
      borderBottom: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 160,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Maio \xB7 2026")), /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 160,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos os status")), /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 140,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos os m\xE9todos")), /*#__PURE__*/React.createElement("select", {
    className: "input",
    style: {
      width: 160,
      height: 36
    }
  }, /*#__PURE__*/React.createElement("option", null, "Todos os clientes"))), /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--slate-50)",
      textAlign: "left"
    }
  }, ["Cliente", "Origem", "Valor", "Método", "Status", "Vencimento", "Pago em", ""].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "10px 16px",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [["Mercado São João", "OS #1024", "R$ 740,00", "Pix", "pending", "20/05", "—"], ["Ana Souza", "ORÇ #247", "R$ 1.480,00", "Pix", "paid", "10/05", "10/05"], ["Construtora Vila Nova", "OS #1019", "R$ 740,00", "Boleto", "overdue", "02/05", "—"], ["Roberta Lima", "OS #1018", "R$ 320,00", "Dinheiro", "partial", "08/05", "08/05"], ["Padaria Quatro Cantos", "OS #1015", "R$ 890,00", "Pix", "paid", "03/05", "03/05"], ["Luiz Henrique", "ORÇ #243", "R$ 540,00", "Cartão", "paid", "30/04", "30/04"]].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      fontWeight: 500
    }
  }, r[0]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "var(--fg-3)",
      fontFamily: "var(--font-mono)",
      fontSize: 12
    }
  }, r[1]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      fontWeight: 600,
      fontFamily: "var(--font-mono)"
    }
  }, r[2]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "var(--fg-2)"
    }
  }, r[3]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    k: SM_FIN[r[4]][0]
  }, SM_FIN[r[4]][1])), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: r[4] === "overdue" ? "var(--danger)" : "var(--fg-3)"
    }
  }, r[5]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      fontFamily: "var(--font-mono)",
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, r[6]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dots",
    size: 16,
    color: "#94A3B8"
  }))))))));
}

// ============== DOCUMENTOS ==============
function WDocs() {
  const [tab, setTab] = useState("orc");
  const tabs = [["orc", "Orçamentos", "32"], ["os", "Ordens de Serviço", "42"], ["rec", "Recibos", "28"], ["rel", "Relatórios", "14"], ["con", "Contratos", "8"]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Documentos"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "124 documentos gerados")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "file",
    size: 16
  }), "Exportar lote"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      marginBottom: 16,
      borderBottom: "1px solid var(--border-1)"
    }
  }, tabs.map(([k, l, c]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    onClick: () => setTab(k),
    style: {
      padding: "10px 14px",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 500,
      borderBottom: tab === k ? "2px solid var(--purple-600)" : "2px solid transparent",
      color: tab === k ? "var(--purple-700)" : "var(--fg-2)",
      marginBottom: -1,
      display: "flex",
      gap: 6,
      alignItems: "center"
    }
  }, l, /*#__PURE__*/React.createElement("span", {
    className: "badge " + (tab === k ? "brand" : "slate"),
    style: {
      fontSize: 10,
      padding: "2px 6px"
    }
  }, c)))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--slate-50)",
      textAlign: "left"
    }
  }, ["", "Número", "Cliente", "Gerado em", "Tamanho", "Status", ""].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "10px 16px",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, [[2031, "Ana Martins", "10/05 · 14:21", "182 KB", "sent"], [2030, "Mercado São João", "09/05 · 09:08", "210 KB", "draft"], [2029, "Construtora Vila Nova", "08/05 · 17:33", "176 KB", "sent"], [2028, "Padaria Quatro Cantos", "05/05 · 11:02", "154 KB", "sent"], [2027, "Roberta Lima", "04/05 · 16:14", "198 KB", "viewed"], [2026, "Luiz Henrique", "03/05 · 10:09", "142 KB", "sent"]].map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 30,
      height: 36,
      borderRadius: 5,
      background: "linear-gradient(180deg,#FEE2E2,#FECACA)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#991B1B",
      fontWeight: 700,
      fontSize: 9
    }
  }, "PDF")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      fontFamily: "var(--font-mono)",
      fontWeight: 600
    }
  }, "#", r[0]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      fontWeight: 500
    }
  }, r[1]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "var(--fg-3)",
      fontSize: 12
    }
  }, r[2]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "var(--fg-3)",
      fontSize: 12
    }
  }, r[3]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    k: r[4] === "sent" ? "info" : r[4] === "viewed" ? "success" : "slate"
  }, r[4] === "sent" ? "Enviado" : r[4] === "viewed" ? "Visualizado" : "Rascunho")), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 4,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      height: 30,
      padding: "0 8px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pdf",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      height: 30,
      padding: "0 8px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "msg",
    size: 14
  })), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      height: 30,
      padding: "0 8px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dots",
    size: 14
  }))))))))));
}

// ============== CONFIGURAÇÕES ==============
function WSettings() {
  const [tab, setTab] = useState("empresa");
  const tabs = [["empresa", "Empresa", "building"], ["visual", "Identidade visual", "image"], ["pix", "Chave Pix", "money"], ["users", "Usuários", "users"], ["plan", "Plano", "pkg"], ["seg", "Segurança", "shield"], ["exp", "Exportação", "file"], ["notif", "Notificações", "bell"]];
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Configura\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Empresa, identidade, usu\xE1rios e plano"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "240px 1fr",
      gap: 24
    }
  }, /*#__PURE__*/React.createElement("aside", null, tabs.map(([k, l, i]) => /*#__PURE__*/React.createElement("div", {
    key: k,
    onClick: () => setTab(k),
    className: "nav-item" + (tab === k ? " active" : ""),
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "9px 12px",
      borderRadius: 9,
      fontSize: 14,
      fontWeight: 500,
      cursor: "pointer",
      color: tab === k ? "var(--purple-800)" : "var(--fg-2)",
      background: tab === k ? "var(--purple-50)" : "transparent",
      marginBottom: 2
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: i,
    size: 16,
    color: tab === k ? "#6D28D9" : "#64748B"
  }), l))), /*#__PURE__*/React.createElement("div", null, tab === "empresa" && /*#__PURE__*/React.createElement("div", {
    className: "card card-body",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 4px",
      fontSize: 17
    }
  }, "Dados da empresa"), /*#__PURE__*/React.createElement("div", {
    className: "desc",
    style: {
      marginBottom: 20,
      color: "var(--fg-3)",
      fontSize: 13
    }
  }, "Aparecem no topo de or\xE7amentos, OS e recibos."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, [["Nome fantasia", "Ribeiro Elétrica"], ["Razão social", "Ribeiro Serviços LTDA"], ["CNPJ", "12.345.678/0001-90"], ["Telefone", "(11) 98123-4521"], ["Email", "contato@ribeiroeletrica.com.br"], ["Endereço", "Rua das Acácias, 248"]].map(([l, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      gridColumn: i === 5 ? "span 2" : "auto"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)",
      fontWeight: 500,
      marginBottom: 6,
      display: "block"
    }
  }, l), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: v
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24,
      display: "flex",
      justifyContent: "flex-end",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, "Cancelar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, "Salvar altera\xE7\xF5es"))), tab === "visual" && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "card card-body",
    style: {
      padding: 24,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 4px",
      fontSize: 17
    }
  }, "Logo"), /*#__PURE__*/React.createElement("div", {
    className: "desc",
    style: {
      marginBottom: 20,
      color: "var(--fg-3)",
      fontSize: 13
    }
  }, "Mostrado no topo dos PDFs."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 96,
      height: 96,
      borderRadius: 14,
      background: "var(--purple-50)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--purple-700)",
      fontWeight: 700,
      fontSize: 32
    }
  }, "RE"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, "Trocar logo"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)",
      marginTop: 8
    }
  }, "PNG ou SVG, recomendado 512\xD7512px.")))), /*#__PURE__*/React.createElement("div", {
    className: "card card-body",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 4px",
      fontSize: 17
    }
  }, "Cor principal"), /*#__PURE__*/React.createElement("div", {
    className: "desc",
    style: {
      marginBottom: 16,
      color: "var(--fg-3)",
      fontSize: 13
    }
  }, "Usada em destaques e no PDF."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 12
    }
  }, ["#6D28D9", "#0F172A", "#16A34A", "#DC2626", "#0891B2", "#EA580C"].map((c, i) => /*#__PURE__*/React.createElement("div", {
    key: c,
    style: {
      width: 48,
      height: 48,
      borderRadius: 12,
      background: c,
      border: i === 0 ? "3px solid #fff" : "0",
      boxShadow: i === 0 ? "0 0 0 2px var(--purple-600)" : "inset 0 0 0 1px rgba(0,0,0,.06)",
      cursor: "pointer"
    }
  }))))), tab === "pix" && /*#__PURE__*/React.createElement("div", {
    className: "card card-body",
    style: {
      padding: 24
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 4px",
      fontSize: 17
    }
  }, "Chave Pix"), /*#__PURE__*/React.createElement("div", {
    className: "desc",
    style: {
      marginBottom: 20,
      color: "var(--fg-3)",
      fontSize: 13
    }
  }, "Inserida automaticamente nos recibos."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 16,
      maxWidth: 520
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)",
      fontWeight: 500,
      marginBottom: 6,
      display: "block"
    }
  }, "Tipo de chave"), /*#__PURE__*/React.createElement("select", {
    className: "input"
  }, /*#__PURE__*/React.createElement("option", null, "CNPJ"), /*#__PURE__*/React.createElement("option", null, "CPF"), /*#__PURE__*/React.createElement("option", null, "Email"), /*#__PURE__*/React.createElement("option", null, "Telefone"), /*#__PURE__*/React.createElement("option", null, "Aleat\xF3ria"))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)",
      fontWeight: 500,
      marginBottom: 6,
      display: "block"
    }
  }, "Chave"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "12.345.678/0001-90"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)",
      fontWeight: 500,
      marginBottom: 6,
      display: "block"
    }
  }, "Nome do recebedor"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "Ribeiro Servi\xE7os LTDA"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 24
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, "Salvar chave"))), (tab === "users" || tab === "plan" || tab === "seg" || tab === "exp" || tab === "notif") && /*#__PURE__*/React.createElement("div", {
    className: "card card-body",
    style: {
      padding: 40,
      textAlign: "center",
      color: "var(--fg-3)"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      color: "var(--ink)",
      fontSize: 15,
      marginBottom: 6
    }
  }, tabs.find(t => t[0] === tab)[1]), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 13
    }
  }, "Dispon\xEDvel na tela dedicada \u2014 veja os cards \"Usu\xE1rios e permiss\xF5es\" e \"Plano e assinatura\".")))));
}

// ============== USUÁRIOS ==============
function WUsers() {
  const users = [["JP", "João Pereira", "joao@ribeiro.com", "Administrador", "active", "agora", "Você"], ["MS", "Marcos Silva", "marcos@ribeiro.com", "Técnico", "active", "há 1h", ""], ["CL", "Carla Lima", "carla@ribeiro.com", "Operação", "active", "há 3h", ""], ["RC", "Rafael Costa", "rafael@ribeiro.com", "Técnico", "invited", "convidado 12/05", ""], ["AM", "Ana Maria", "ana@ribeiro.com", "Operação", "inactive", "há 2 meses", ""]];
  const SM = {
    active: ["success", "Ativo"],
    invited: ["info", "Convite pendente"],
    inactive: ["slate", "Inativo"]
  };
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Usu\xE1rios e permiss\xF5es"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "4 ativos \xB7 1 convite pendente \xB7 1 inativo \xB7 plano permite at\xE9 10")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16,
    color: "#fff"
  }), "Convidar usu\xE1rio")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      padding: 0,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("table", {
    style: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 13
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      background: "var(--slate-50)",
      textAlign: "left"
    }
  }, ["Nome", "Email", "Função", "Status", "Último acesso", ""].map(h => /*#__PURE__*/React.createElement("th", {
    key: h,
    style: {
      padding: "10px 16px",
      fontSize: 11,
      fontWeight: 600,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em"
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, users.map((u, i) => /*#__PURE__*/React.createElement("tr", {
    key: i,
    style: {
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      alignItems: "center",
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: "50%",
      background: "var(--purple-100)",
      color: "var(--purple-800)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 600,
      fontSize: 12
    }
  }, u[0]), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 600
    }
  }, u[1]), u[6] && /*#__PURE__*/React.createElement(Pill, {
    k: "brand"
  }, u[6])))), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "var(--fg-2)"
    }
  }, u[2]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, u[3]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px"
    }
  }, /*#__PURE__*/React.createElement(Pill, {
    k: SM[u[4]][0]
  }, SM[u[4]][1])), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      color: "var(--fg-3)",
      fontSize: 12
    }
  }, u[5]), /*#__PURE__*/React.createElement("td", {
    style: {
      padding: "12px 16px",
      textAlign: "right"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 6,
      justifyContent: "flex-end"
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      height: 30,
      fontSize: 12,
      padding: "0 10px"
    }
  }, "Editar permiss\xF5es"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      height: 30,
      padding: "0 8px"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "dots",
    size: 14
  }))))))))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 15,
      margin: "0 0 12px"
    }
  }, "Permiss\xF5es \u2014 Fun\xE7\xE3o: T\xE9cnico"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(2,1fr)",
      gap: 16
    }
  }, [["Clientes", [["Ver clientes atribuídos", true], ["Criar e editar clientes", false], ["Excluir clientes", false]]], ["Orçamentos", [["Criar orçamentos", true], ["Editar orçamentos", true], ["Aprovar / rejeitar", false]]], ["Ordens de Serviço", [["Executar OS atribuídas", true], ["Atribuir técnicos", false], ["Cancelar OS", false]]], ["Financeiro", [["Apenas leitura", true], ["Registrar recebimentos", false], ["Editar lançamentos", false]]], ["Catálogo", [["Ver catálogo", true], ["Criar e editar itens", false]]], ["Administração", [["Convidar usuários", false], ["Alterar plano", false], ["Configurações da empresa", false]]]].map(([t, perms], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "card card-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 14,
      marginBottom: 10
    }
  }, t), perms.map(([n, on], j) => /*#__PURE__*/React.createElement("div", {
    key: j,
    style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 0",
      borderBottom: j < perms.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 13,
      color: "var(--fg-2)"
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 36,
      height: 22,
      borderRadius: 11,
      background: on ? "var(--purple-600)" : "#CBD5E1",
      position: "relative"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: "absolute",
      top: 3,
      left: on ? 17 : 3,
      width: 16,
      height: 16,
      borderRadius: "50%",
      background: "#fff"
    }
  }))))))));
}

// ============== PLANO ==============
function WPlan() {
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Plano e assinatura"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Gerencie seu plano, pagamentos e uso"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1.4fr 1fr",
      gap: 16,
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card card-body",
    style: {
      padding: 24,
      background: "linear-gradient(135deg,#6D28D9,#4C1D95)",
      border: 0,
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: .7,
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 600
    }
  }, "Plano atual"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 32,
      fontWeight: 700,
      marginTop: 4,
      letterSpacing: "-0.02em"
    }
  }, "Orcivo Mais"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 14,
      opacity: .85,
      marginTop: 4
    }
  }, "Pr\xF3xima cobran\xE7a em 28/05 \xB7 conforme o plano")), /*#__PURE__*/React.createElement("div", {
    className: "badge",
    style: {
      background: "rgba(255,255,255,.18)",
      color: "#fff"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), "Ativo")), /*#__PURE__*/React.createElement("div", {
    style: {
      height: 1,
      background: "rgba(255,255,255,.2)",
      margin: "20px 0"
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 18
    }
  }, [["Técnicos", "4 incluídos"], ["OS no mês", "uso justo"], ["Armazenamento", "1.2 / 20 GB"], ["NF emitidas", "18 / 50"]].map(([l, v], i) => /*#__PURE__*/React.createElement("div", {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      opacity: .7,
      fontWeight: 500,
      textTransform: "uppercase",
      letterSpacing: ".05em"
    }
  }, l), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 18,
      fontWeight: 700,
      marginTop: 4
    }
  }, v)))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      gap: 8,
      marginTop: 20
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn",
    style: {
      background: "rgba(255,255,255,.18)",
      color: "#fff"
    }
  }, "Ver planos"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      color: "#fff"
    }
  }, "Gerenciar assinatura"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-ghost",
    style: {
      color: "rgba(255,255,255,.7)"
    }
  }, "Cancelar assinatura"))), /*#__PURE__*/React.createElement("div", {
    className: "card card-body"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: "0 0 12px",
      fontSize: 15
    }
  }, "Pagamentos recentes"), [["28/04", "Pago"], ["28/03", "Pago"], ["28/02", "Pago"], ["28/01", "Pago"]].map((p, i, a) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 0",
      borderBottom: i < a.length - 1 ? "1px solid var(--border-2)" : 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: "var(--success-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "var(--success)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      fontSize: 13
    }
  }, "Orcivo Mais \xB7 mensal"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Pago em ", p[0])), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600,
      fontSize: 13,
      color: "var(--success)"
    }
  }, p[1]))))), /*#__PURE__*/React.createElement("h3", {
    style: {
      fontSize: 15,
      margin: "0 0 12px"
    }
  }, "Compare os planos"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16
    }
  }, [["Orcivo Livre", "Para começar", ["1 técnico", "OS em uso justo", "PDF com marca Orcivo", "Suporte por email"], false, false], ["Orcivo Solo", "Autônomo", ["1 técnico", "OS em uso ampliado", "Seu logo no PDF", "Chave Pix"], false, false], ["Orcivo Mais", "Recomendado", ["Até 3 técnicos", "Tudo do Solo", "Catálogo ampliado", "Relatórios", "Suporte prioritário"], true, true], ["Orcivo Equipe", "Para escala", ["Mais técnicos inclusos", "Tudo do Mais", "Multi-empresa", "Acesso ampliado", "Suporte dedicado"], false, false]].map(([n, tag, feats, current, rec], i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "card card-body",
    style: {
      position: "relative",
      borderColor: current ? "var(--purple-600)" : "var(--border-1)",
      borderWidth: current ? 2 : 1
    }
  }, rec && /*#__PURE__*/React.createElement("div", {
    className: "badge brand",
    style: {
      position: "absolute",
      top: -10,
      left: 18
    }
  }, "Recomendado"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 700,
      fontSize: 17
    }
  }, n), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 11,
      color: "var(--fg-3)",
      textTransform: "uppercase",
      letterSpacing: ".06em",
      fontWeight: 500,
      marginTop: 2
    }
  }, tag || "\u00A0"), /*#__PURE__*/React.createElement("ul", {
    style: {
      listStyle: "none",
      padding: 0,
      margin: "16px 0 0",
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, feats.map((f, j) => /*#__PURE__*/React.createElement("li", {
    key: j,
    style: {
      display: "flex",
      gap: 8,
      fontSize: 13,
      color: "var(--fg-2)"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 14,
    color: "#6D28D9",
    stroke: 2.5
  }), f))), /*#__PURE__*/React.createElement("button", {
    className: "btn " + (current ? "btn-outline disabled" : "btn-primary"),
    style: {
      width: "100%",
      marginTop: 18
    }
  }, current ? "Plano atual" : "Mudar para " + n)))));
}

// ----- router -----
const WEB_SCREENS = {
  dashboard: ["Dashboard de Operação", WDashboard, "dashboard"],
  os: ["Ordens de Serviço", WOS, "work-orders"],
  "os-detail": ["Detalhe da OS", WOSDetail, "work-orders"],
  catalog: ["Catálogo", WCatalog, "catalog"],
  finance: ["Financeiro", WFinance, "finance"],
  docs: ["Documentos", WDocs, "documents"],
  settings: ["Configurações", WSettings, "settings"],
  users: ["Usuários e permissões", WUsers, "settings"],
  plan: ["Plano e assinatura", WPlan, "settings"]
};
window.WEB_SCREENS = WEB_SCREENS;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Operations.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/OtherPages.jsx
try { (() => {
// Catalog / WorkOrders / Agenda / Finance / Settings — keep focused
function Catalog() {
  const [tab, setTab] = React.useState("servicos");
  const all = {
    servicos: [{
      name: "Visita técnica",
      unit: "un",
      price: "180.00",
      on: true
    }, {
      name: "Instalação câmera CFTV 4MP",
      unit: "un",
      price: "320.00",
      on: true
    }, {
      name: "Configuração de DVR",
      unit: "un",
      price: "240.00",
      on: true
    }, {
      name: "Manutenção preventiva",
      unit: "hora",
      price: "120.00",
      on: false
    }],
    produtos: [{
      name: "Câmera Bullet 4MP",
      unit: "un",
      price: "450.00",
      on: true
    }, {
      name: "Cabo coaxial RG-59",
      unit: "m",
      price: "4.20",
      on: true
    }, {
      name: "DVR 8 canais",
      unit: "un",
      price: "890.00",
      on: true
    }],
    mao: [{
      name: "Hora técnica",
      unit: "hora",
      price: "120.00",
      on: true
    }]
  };
  const rows = all[tab];
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Cat\xE1logo"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Servi\xE7os, produtos e m\xE3o de obra")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Novo item")), /*#__PURE__*/React.createElement("div", {
    className: "tabs"
  }, [["servicos", "Serviços"], ["produtos", "Produtos"], ["mao", "Mão de obra"]].map(([id, l]) => /*#__PURE__*/React.createElement("div", {
    key: id,
    className: "tab" + (tab === id ? " active" : ""),
    onClick: () => setTab(id)
  }, l))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Nome"), /*#__PURE__*/React.createElement("th", null, "Unidade"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Pre\xE7o"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 600
    }
  }, r.name)), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.unit), /*#__PURE__*/React.createElement("td", {
    className: "num money"
  }, fmtMoney(r.price)), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "badge " + (r.on ? "success" : "slate")
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), r.on ? "Ativo" : "Inativo")), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 16,
    color: "#94A3B8"
  }))))))));
}
window.Catalog = Catalog;
function WorkOrders() {
  const rows = [{
    n: "#312",
    cust: "Marcos Pereira",
    tech: "João R.",
    status: "in_progress",
    date: "Hoje 09:00"
  }, {
    n: "#318",
    cust: "Ana Souza",
    tech: "Téc. Carlos",
    status: "scheduled",
    date: "Amanhã 14:00"
  }, {
    n: "#311",
    cust: "Padaria Quatro Cantos",
    tech: "Téc. Marcos",
    status: "finished",
    date: "Ontem"
  }, {
    n: "#310",
    cust: "Roberta Lima",
    tech: "João R.",
    status: "open",
    date: "Sem data"
  }, {
    n: "#308",
    cust: "Luiz Henrique",
    tech: "Téc. Carlos",
    status: "waiting_parts",
    date: "05/05"
  }];
  const sm = {
    open: {
      cls: "info",
      label: "Aberta"
    },
    scheduled: {
      cls: "brand",
      label: "Agendada"
    },
    in_progress: {
      cls: "warning",
      label: "Em execução"
    },
    waiting_parts: {
      cls: "warning",
      label: "Aguardando material"
    },
    finished: {
      cls: "success",
      label: "Finalizada"
    },
    cancelled: {
      cls: "danger",
      label: "Cancelada"
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Ordens de Servi\xE7o"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, rows.length, " em andamento")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Nova OS")), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "N\xFAmero"), /*#__PURE__*/React.createElement("th", null, "Cliente"), /*#__PURE__*/React.createElement("th", null, "T\xE9cnico"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Agendada para"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", {
    style: {
      fontFamily: "var(--font-mono)",
      fontWeight: 600
    }
  }, r.n), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 600
    }
  }, r.cust)), /*#__PURE__*/React.createElement("td", null, r.tech), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "badge " + sm[r.status].cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), sm[r.status].label)), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.date), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Icon, {
    name: "chev",
    size: 16,
    color: "#94A3B8"
  }))))))));
}
window.WorkOrders = WorkOrders;
function Agenda() {
  const days = ["seg 12", "ter 13", "qua 14", "qui 15", "sex 16", "sáb 17", "dom 18"];
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  const evts = [{
    d: 0,
    h: 1,
    title: "Visita CFTV",
    tag: "OS #312",
    cls: "brand",
    span: 1
  }, {
    d: 0,
    h: 6,
    title: "Orçamento presencial",
    tag: "ORÇ #248",
    cls: "warning",
    span: 1
  }, {
    d: 2,
    h: 2,
    title: "Instalação portão",
    tag: "OS #318",
    cls: "brand",
    span: 2
  }, {
    d: 3,
    h: 4,
    title: "Reunião equipe",
    tag: "Interno",
    cls: "slate",
    span: 1
  }, {
    d: 4,
    h: 1,
    title: "Manutenção preventiva",
    tag: "OS #305",
    cls: "success",
    span: 2
  }];
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Agenda"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Semana de 12 a 18 de maio")), /*#__PURE__*/React.createElement("div", {
    className: "row-flex"
  }, /*#__PURE__*/React.createElement("div", {
    className: "btn btn-outline"
  }, "M\xEAs"), /*#__PURE__*/React.createElement("div", {
    className: "btn btn-secondary"
  }, "Semana"), /*#__PURE__*/React.createElement("div", {
    className: "btn btn-outline"
  }, "Dia"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Novo compromisso"))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "60px repeat(7, 1fr)",
      borderBottom: "1px solid var(--border-1)",
      background: "var(--slate-50)"
    }
  }, /*#__PURE__*/React.createElement("div", null), days.map((d, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      padding: "10px 12px",
      fontSize: 12,
      fontWeight: 600,
      color: "var(--fg-2)",
      textTransform: "uppercase",
      letterSpacing: ".04em"
    }
  }, d))), hours.map((h, hi) => /*#__PURE__*/React.createElement("div", {
    key: hi,
    style: {
      display: "grid",
      gridTemplateColumns: "60px repeat(7, 1fr)",
      borderBottom: "1px solid var(--border-2)",
      minHeight: 48
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: "6px 8px",
      fontSize: 11,
      color: "var(--fg-3)",
      fontFamily: "var(--font-mono)"
    }
  }, h), days.map((_, di) => {
    const e = evts.find(x => x.d === di && x.h === hi);
    return /*#__PURE__*/React.createElement("div", {
      key: di,
      style: {
        borderLeft: "1px solid var(--border-2)",
        padding: 4,
        position: "relative"
      }
    }, e && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: "6px 8px",
        borderRadius: 8,
        background: "var(--purple-50)",
        borderLeft: "3px solid var(--purple-600)",
        height: 48 * e.span - 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 12,
        fontWeight: 600,
        color: "var(--ink)"
      }
    }, e.title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 11,
        color: "var(--fg-3)"
      }
    }, e.tag)));
  })))));
}
window.Agenda = Agenda;
function Finance() {
  const rows = [{
    cust: "Marcos Pereira",
    origin: "OS #311",
    value: "890.00",
    method: "Pix",
    status: "paid",
    due: "05/05",
    paid: "05/05"
  }, {
    cust: "Construtora Vila Nova",
    origin: "OS #305",
    value: "3210.00",
    method: "Boleto",
    status: "paid",
    due: "02/05",
    paid: "03/05"
  }, {
    cust: "Ana Souza",
    origin: "ORÇ #244",
    value: "880.00",
    method: "Pix",
    status: "overdue",
    due: "28/04",
    paid: "—"
  }, {
    cust: "Luiz Henrique",
    origin: "OS #298",
    value: "1240.00",
    method: "Cartão",
    status: "partial",
    due: "20/05",
    paid: "50%"
  }, {
    cust: "Padaria Quatro Cantos",
    origin: "OS #295",
    value: "480.00",
    method: "Pix",
    status: "pending",
    due: "18/05",
    paid: "—"
  }];
  const sm = {
    paid: {
      cls: "success",
      label: "Recebido"
    },
    pending: {
      cls: "warning",
      label: "Pendente"
    },
    overdue: {
      cls: "danger",
      label: "Vencido"
    },
    partial: {
      cls: "info",
      label: "Parcial"
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Financeiro"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Maio \xB7 2026")), /*#__PURE__*/React.createElement("div", {
    className: "row-flex"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, "Exportar"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 16
  }), "Registrar recebimento"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "repeat(4,1fr)",
      gap: 16,
      marginBottom: 18
    }
  }, [{
    label: "Recebido no período",
    v: fmtMoney("12480"),
    s: "17 recebimentos"
  }, {
    label: "Pendente",
    v: fmtMoney("3250"),
    s: "5 em aberto"
  }, {
    label: "Vencido",
    v: fmtMoney("880"),
    s: "2 recebimentos"
  }, {
    label: "Ticket médio",
    v: fmtMoney("734"),
    s: "+8% vs mês anterior"
  }].map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body metric"
  }, /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, m.label), /*#__PURE__*/React.createElement("div", {
    className: "value"
  }, m.v), /*#__PURE__*/React.createElement("div", {
    className: "sub"
  }, m.s))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      overflow: "hidden"
    }
  }, /*#__PURE__*/React.createElement("table", {
    className: "table"
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Cliente"), /*#__PURE__*/React.createElement("th", null, "Origem"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Valor"), /*#__PURE__*/React.createElement("th", null, "M\xE9todo"), /*#__PURE__*/React.createElement("th", null, "Status"), /*#__PURE__*/React.createElement("th", null, "Vencimento"), /*#__PURE__*/React.createElement("th", null, "Pago em"))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 600
    }
  }, r.cust)), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.origin), /*#__PURE__*/React.createElement("td", {
    className: "num money"
  }, fmtMoney(r.value)), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.method), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("span", {
    className: "badge " + sm[r.status].cls
  }, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }), sm[r.status].label)), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.due), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, r.paid)))))));
}
window.Finance = Finance;
function Settings() {
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", null, "Configura\xE7\xF5es"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Empresa, marca e plano"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("h3", null, "Empresa"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gap: 10,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Nome fantasia"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "Ribeiro El\xE9trica"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "CNPJ"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "12.345.678/0001-90"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Cidade / UF"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "S\xE3o Paulo / SP"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("h3", null, "Identidade visual"), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      padding: 14,
      border: "1px dashed var(--border-1)",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 56,
      height: 56,
      borderRadius: 14,
      background: "linear-gradient(135deg,#0A0A0F,#6D28D9)"
    }
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600
    }
  }, "Ribeiro El\xE9trica"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 12,
      color: "var(--fg-3)"
    }
  }, "Logo \xB7 usado em PDFs e link p\xFAblico")), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      marginLeft: "auto"
    }
  }, "Trocar")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Cor da marca"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "#6D28D9"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Chave Pix"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "12.345.678/0001-90"
  }))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      gridColumn: "1 / -1"
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", null, "Plano Orcivo Mais"), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 13,
      marginTop: 4
    }
  }, "Pr\xF3xima cobran\xE7a em 28/05 \xB7 conforme o plano")), /*#__PURE__*/React.createElement("div", {
    className: "row-flex"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, "Mudar plano"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, "Regularizar")))))));
}
window.Settings = Settings;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/OtherPages.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/QuoteEditor.jsx
try { (() => {
// Quote Editor — multi-step. Right rail keeps a running total summary.
function QuoteEditor({
  onNav
}) {
  const [step, setStep] = React.useState(0);
  const [items, setItems] = React.useState([{
    name: "Visita técnica",
    qty: 1,
    unit: "un",
    price: "180.00"
  }, {
    name: "Instalação câmera CFTV 4MP",
    qty: 4,
    unit: "un",
    price: "320.00"
  }]);
  const [discount, setDiscount] = React.useState("0");
  const subtotal = items.reduce((s, i) => s + i.qty * parseFloat(i.price), 0);
  const total = subtotal - parseFloat(discount || "0");
  const steps = ["Cliente", "Itens", "Desconto e validade", "Termos", "Revisão"];
  return /*#__PURE__*/React.createElement("div", {
    className: "page"
  }, /*#__PURE__*/React.createElement("div", {
    className: "page-header"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("a", {
    onClick: () => onNav("quotes"),
    style: {
      fontSize: 13,
      color: "var(--purple-700)",
      cursor: "pointer"
    }
  }, "\u2190 Or\xE7amentos"), /*#__PURE__*/React.createElement("h1", {
    style: {
      marginTop: 6
    }
  }, "Novo or\xE7amento"), /*#__PURE__*/React.createElement("div", {
    className: "desc"
  }, "Rascunho \xB7 n\xE3o enviado")), /*#__PURE__*/React.createElement("div", {
    className: "row-flex"
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline"
  }, "Salvar rascunho"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pdf",
    size: 16
  }), "Gerar PDF"))), /*#__PURE__*/React.createElement("div", {
    className: "stepper"
  }, steps.map((s, i) => /*#__PURE__*/React.createElement(React.Fragment, {
    key: i
  }, /*#__PURE__*/React.createElement("div", {
    className: "step" + (i === step ? " active" : i < step ? " done" : ""),
    onClick: () => setStep(i)
  }, /*#__PURE__*/React.createElement("div", {
    className: "num"
  }, i < step ? /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 12,
    color: "#fff",
    stroke: 3
  }) : i + 1), /*#__PURE__*/React.createElement("span", null, s)), i < steps.length - 1 && /*#__PURE__*/React.createElement("div", {
    className: "sep"
  })))), /*#__PURE__*/React.createElement("div", {
    className: "editor"
  }, /*#__PURE__*/React.createElement("div", null, step === 0 && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      marginBottom: 14
    }
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Cliente"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "Construtora Vila Nova"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Contato"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "Carlos \xB7 (11) 4002-8922"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      gridColumn: "1 / -1"
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Endere\xE7o da obra"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "Rua das Ac\xE1cias, 248 \xB7 Vila Nova \xB7 Guarulhos / SP"
  }))))), step === 1 && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0
    }
  }, "Itens"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-secondary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "plus",
    size: 14
  }), "Adicionar item")), /*#__PURE__*/React.createElement("table", {
    className: "table",
    style: {
      border: 0
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", null, "Item"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Qtd"), /*#__PURE__*/React.createElement("th", null, "Unidade"), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Pre\xE7o un."), /*#__PURE__*/React.createElement("th", {
    className: "num"
  }, "Subtotal"), /*#__PURE__*/React.createElement("th", null))), /*#__PURE__*/React.createElement("tbody", null, items.map((it, i) => /*#__PURE__*/React.createElement("tr", {
    key: i
  }, /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement("b", {
    style: {
      fontWeight: 600
    }
  }, it.name)), /*#__PURE__*/React.createElement("td", {
    className: "num"
  }, it.qty), /*#__PURE__*/React.createElement("td", {
    className: "muted"
  }, it.unit), /*#__PURE__*/React.createElement("td", {
    className: "num money"
  }, fmtMoney(it.price)), /*#__PURE__*/React.createElement("td", {
    className: "num money"
  }, fmtMoney(it.qty * parseFloat(it.price))), /*#__PURE__*/React.createElement("td", null, /*#__PURE__*/React.createElement(Icon, {
    name: "x",
    size: 14,
    color: "#94A3B8"
  })))))))), step === 2 && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      marginBottom: 14
    }
  }, "Desconto e validade"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Desconto (R$)"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    value: discount,
    onChange: e => setDiscount(e.target.value)
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Validade"), /*#__PURE__*/React.createElement("input", {
    className: "input",
    defaultValue: "15 dias"
  }))))), step === 3 && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      marginBottom: 14
    }
  }, "Termos e observa\xE7\xF5es"), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)"
    }
  }, "Termos"), /*#__PURE__*/React.createElement("textarea", {
    className: "input",
    style: {
      height: 120,
      padding: 12,
      resize: "vertical"
    },
    defaultValue: "Pagamento: 50% no in\xEDcio, 50% na entrega. Garantia de 90 dias sobre a m\xE3o de obra."
  }), /*#__PURE__*/React.createElement("label", {
    style: {
      fontSize: 12,
      color: "var(--fg-2)",
      marginTop: 12,
      display: "block"
    }
  }, "Observa\xE7\xF5es internas"), /*#__PURE__*/React.createElement("textarea", {
    className: "input",
    style: {
      height: 80,
      padding: 12,
      resize: "vertical"
    }
  }))), step === 4 && /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("h3", {
    style: {
      margin: 0,
      marginBottom: 14
    }
  }, "Revis\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 13,
      marginBottom: 10
    }
  }, "Cliente"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontWeight: 600,
      marginBottom: 14
    }
  }, "Construtora Vila Nova \xB7 (11) 4002-8922"), /*#__PURE__*/React.createElement("div", {
    className: "muted",
    style: {
      fontSize: 13,
      marginBottom: 6
    }
  }, "Itens"), items.map((it, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "6px 0",
      borderBottom: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("div", null, it.qty, "\xD7 ", it.name), /*#__PURE__*/React.createElement("div", {
    className: "money num"
  }, fmtMoney(it.qty * parseFloat(it.price))))))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    disabled: step === 0,
    onClick: () => setStep(s => Math.max(0, s - 1))
  }, "Voltar"), step < 4 ? /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary",
    onClick: () => setStep(s => Math.min(4, s + 1))
  }, "Avan\xE7ar") : /*#__PURE__*/React.createElement("button", {
    className: "btn btn-primary"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "check",
    size: 16
  }), "Enviar or\xE7amento"))), /*#__PURE__*/React.createElement("div", {
    className: "right"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card"
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "metric",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "label"
  }, "Total do or\xE7amento"), /*#__PURE__*/React.createElement("div", {
    className: "value"
  }, fmtMoney(total))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      padding: "8px 0",
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "muted"
  }, "Subtotal"), /*#__PURE__*/React.createElement("span", {
    className: "money"
  }, fmtMoney(subtotal))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      fontSize: 13,
      padding: "8px 0",
      borderTop: "1px solid var(--border-2)"
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "muted"
  }, "Desconto"), /*#__PURE__*/React.createElement("span", {
    className: "money"
  }, "\u2212 ", fmtMoney(discount || "0"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      justifyContent: "space-between",
      padding: "10px 0 0",
      borderTop: "1px solid var(--border-1)",
      fontWeight: 700
    }
  }, /*#__PURE__*/React.createElement("span", null, "Total"), /*#__PURE__*/React.createElement("span", {
    className: "money"
  }, fmtMoney(total))))), /*#__PURE__*/React.createElement("div", {
    className: "card",
    style: {
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "card-body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "t-label",
    style: {
      marginBottom: 8
    }
  }, "A\xE7\xF5es r\xE1pidas"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      justifyContent: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "share",
    size: 14
  }), "Compartilhar no WhatsApp"), /*#__PURE__*/React.createElement("button", {
    className: "btn btn-outline",
    style: {
      justifyContent: "flex-start"
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "pdf",
    size: 14
  }), "Baixar PDF")))))));
}
window.QuoteEditor = QuoteEditor;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/QuoteEditor.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/Sidebar.jsx
try { (() => {
// Sidebar — Orcivo web app
const navItems = [{
  id: "dashboard",
  label: "Dashboard",
  icon: "home"
}, {
  id: "customers",
  label: "Clientes",
  icon: "users"
}, {
  id: "catalog",
  label: "Catálogo",
  icon: "pkg"
}, {
  id: "quotes",
  label: "Orçamentos",
  icon: "file"
}, {
  id: "work-orders",
  label: "Ordens de Serviço",
  icon: "clip"
}, {
  id: "agenda",
  label: "Agenda",
  icon: "cal"
}, {
  id: "finance",
  label: "Financeiro",
  icon: "money"
}, {
  id: "documents",
  label: "Documentos",
  icon: "file"
}, {
  id: "settings",
  label: "Configurações",
  icon: "cog"
}];
function Sidebar({
  route,
  onNav
}) {
  return /*#__PURE__*/React.createElement("aside", {
    className: "sidebar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand"
  }, /*#__PURE__*/React.createElement("div", {
    className: "brand-mark"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#fff",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M5 12 10 17 19 7"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "brand-name"
  }, "Orcivo")), /*#__PURE__*/React.createElement("div", {
    className: "nav-section"
  }, "Principal"), navItems.slice(0, 8).map(it => /*#__PURE__*/React.createElement("div", {
    key: it.id,
    className: "nav-item" + (route === it.id ? " active" : ""),
    onClick: () => onNav(it.id)
  }, /*#__PURE__*/React.createElement(Icon, {
    name: it.icon,
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, it.label))), /*#__PURE__*/React.createElement("div", {
    className: "nav-section"
  }, "Conta"), /*#__PURE__*/React.createElement("div", {
    className: "nav-item" + (route === "settings" ? " active" : ""),
    onClick: () => onNav("settings")
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cog",
    size: 18
  }), /*#__PURE__*/React.createElement("span", null, "Configura\xE7\xF5es")), /*#__PURE__*/React.createElement("div", {
    className: "footer"
  }, /*#__PURE__*/React.createElement("div", {
    className: "avatar"
  }, "JR"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "who"
  }, "Jo\xE3o Ribeiro"), /*#__PURE__*/React.createElement("div", {
    className: "biz"
  }, "Ribeiro El\xE9trica \xB7 Orcivo Mais"))));
}
window.Sidebar = Sidebar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/Sidebar.jsx", error: String((e && e.message) || e) }); }

// ui_kits/web/TopBar.jsx
try { (() => {
function TopBar() {
  return /*#__PURE__*/React.createElement("header", {
    className: "topbar"
  }, /*#__PURE__*/React.createElement("div", {
    className: "search"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "search",
    size: 16,
    color: "#64748B"
  }), /*#__PURE__*/React.createElement("input", {
    placeholder: "Buscar clientes, or\xE7amentos, OS\u2026"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grow"
  }), /*#__PURE__*/React.createElement("div", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "bell",
    size: 18
  })), /*#__PURE__*/React.createElement("div", {
    className: "iconbtn"
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "cog",
    size: 18
  })));
}
window.TopBar = TopBar;
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/web/TopBar.jsx", error: String((e && e.message) || e) }); }

})();
