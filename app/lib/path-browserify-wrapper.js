import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pathBrowserify = require('path-browserify');

export default pathBrowserify;
