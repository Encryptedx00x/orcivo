const path = require('node:path');
const { build } = require('esbuild');

// Bundle the installed React version; React 19 no longer publishes UMD builds.
async function loadBrowserReact(page) {
  const result = await build({
    stdin: {
      contents: "import * as React from 'react'; import * as ReactDOM from 'react-dom/client'; window.React = React; window.ReactDOM = ReactDOM;",
      resolveDir: path.resolve(__dirname, '..'),
    },
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    define: { 'process.env.NODE_ENV': '"development"' },
  });
  await page.addScriptTag({ content: result.outputFiles[0].text });
}

module.exports = { loadBrowserReact };
