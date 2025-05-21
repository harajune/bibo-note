window.module = window.module || {};
window.require = window.require || function(mod) {
  console.log('Polyfilled require called for:', mod);
  if (mod === 'stream-browserify') return window.streamBrowserify;
  if (mod === 'path-browserify') return window.pathBrowserify;
  if (mod === 'fast-xml-parser') return window.fastXmlParser;
  throw new Error('Module not found: ' + mod);
};

import streamBrowserify from '../app/lib/stream-browserify-wrapper.js';
import pathBrowserify from '../app/lib/path-browserify-wrapper.js';
import * as fastXmlParser from '../app/lib/xml-parser-wrapper.js';

window.streamBrowserify = streamBrowserify;
window.pathBrowserify = pathBrowserify;
window.fastXmlParser = fastXmlParser;
