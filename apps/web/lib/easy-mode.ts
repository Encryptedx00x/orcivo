// Shared by the server root layout (pre-paint script) and the client toggle.
export const EASY_KEY = 'orcivo.easyMode';

/** Runs before first paint so the page never flashes the normal UI in easy mode. */
export const EASY_MODE_BOOT = `try{if(localStorage.getItem('${EASY_KEY}')==='1')document.documentElement.dataset.easy='1'}catch(e){}`;
