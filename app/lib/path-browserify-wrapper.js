const moduleShim = { exports: {} };
const globalShim = typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : {};

const pathBrowserify = {
  sep: '/',
  delimiter: ':',
  resolve: function() {
    let resolvedPath = '';
    let resolvedAbsolute = false;
    
    for (let i = arguments.length - 1; i >= -1 && !resolvedAbsolute; i--) {
      const path = (i >= 0) ? arguments[i] : '/';
      
      if (typeof path !== 'string') {
        throw new TypeError('Arguments to path.resolve must be strings');
      } else if (!path) {
        continue;
      }
      
      resolvedPath = path + '/' + resolvedPath;
      resolvedAbsolute = path.charAt(0) === '/';
    }
    
    resolvedPath = resolvedPath.replace(/\/\/+/g, '/');
    
    if (!resolvedAbsolute) {
      resolvedPath = '/' + resolvedPath;
    }
    
    if (resolvedPath.length > 1 && resolvedPath.endsWith('/')) {
      resolvedPath = resolvedPath.slice(0, -1);
    }
    
    return resolvedPath;
  },
  
  basename: function(path, ext) {
    if (ext !== undefined && typeof ext !== 'string') {
      throw new TypeError('ext must be a string');
    }
    
    const base = path.split('/').pop() || '';
    
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length);
    }
    
    return base;
  },
  
  dirname: function(path) {
    if (path.length === 0) return '.';
    
    const hasRoot = path.charAt(0) === '/';
    let end = -1;
    
    for (let i = path.length - 1; i >= 1; --i) {
      if (path.charAt(i) === '/') {
        end = i;
        break;
      }
    }
    
    if (end === -1) {
      return hasRoot ? '/' : '.';
    }
    
    if (hasRoot && end === 1) {
      return '//';
    }
    
    return path.slice(0, end);
  },
  
  extname: function(path) {
    const base = pathBrowserify.basename(path);
    const lastDotPos = base.lastIndexOf('.');
    
    if (lastDotPos <= 0) {
      return '';
    }
    
    return base.slice(lastDotPos);
  },
  
  join: function() {
    if (arguments.length === 0) {
      return '.';
    }
    
    let joined = '';
    
    for (let i = 0; i < arguments.length; ++i) {
      const arg = arguments[i];
      
      if (typeof arg !== 'string') {
        throw new TypeError('Arguments to path.join must be strings');
      }
      
      if (arg) {
        if (joined) {
          joined += '/' + arg;
        } else {
          joined = arg;
        }
      }
    }
    
    return pathBrowserify.normalize(joined);
  },
  
  normalize: function(path) {
    if (path.length === 0) return '.';
    
    const isAbsolute = path.charAt(0) === '/';
    const trailingSeparator = path.substr(-1) === '/';
    
    path = path.replace(/\/\/+/g, '/');
    
    if (path.length === 0) {
      return trailingSeparator ? '/' : '.';
    }
    
    if (trailingSeparator) {
      path = path.slice(0, -1);
    }
    
    return isAbsolute ? '/' + path : path;
  }
};

export default pathBrowserify;
