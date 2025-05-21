import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const fxp = require('fast-xml-parser');

export const XMLParser = fxp.XMLParser;
export const XMLValidator = fxp.XMLValidator;
export const XMLBuilder = fxp.XMLBuilder;

export default fxp;
