const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('newtab.html', 'utf8');
const script = fs.readFileSync('js/app.js', 'utf8');

const dom = new JSDOM(html, { runScripts: "outside-only" });
const window = dom.window;
const document = window.document;

// Mock localStorage
window.localStorage = {
  getItem: () => null,
  setItem: () => {}
};

try {
  window.eval(script);
  
  // Trigger DOMContentLoaded manually since we evaluate after parsing
  const event = document.createEvent('Event');
  event.initEvent('DOMContentLoaded', true, true);
  window.document.dispatchEvent(event);
  
  console.log("No errors on load.");
} catch (e) {
  console.error("Error during execution:", e);
}
