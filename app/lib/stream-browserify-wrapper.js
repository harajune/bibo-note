import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const streamBrowserify = require('stream-browserify');

export default streamBrowserify;
