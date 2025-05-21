
class Stream {
  constructor() {
    this.readable = false;
    this.writable = false;
    this.listeners = {};
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }

  emit(event, ...args) {
    const callbacks = this.listeners[event] || [];
    callbacks.forEach(callback => callback(...args));
    return callbacks.length > 0;
  }

  removeListener(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
    return this;
  }

  pipe(destination) {
    this.on('data', chunk => {
      if (destination.writable) {
        destination.write(chunk);
      }
    });

    this.on('end', () => {
      if (destination.writable) {
        destination.end();
      }
    });

    return destination;
  }
}

class Readable extends Stream {
  constructor(options) {
    super();
    this.readable = true;
    this.options = options || {};
    this._readableState = {
      ended: false,
      flowing: false
    };
  }

  push(chunk) {
    if (chunk === null) {
      this._readableState.ended = true;
      this.emit('end');
      return false;
    }

    this.emit('data', chunk);
    return true;
  }

  read() {
    return null;
  }
}

class Writable extends Stream {
  constructor(options) {
    super();
    this.writable = true;
    this.options = options || {};
    this._writableState = {
      ended: false
    };
  }

  write(chunk, encoding, callback) {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = null;
    }

    this.emit('data', chunk);

    if (callback) {
      callback();
    }

    return true;
  }

  end(chunk, encoding, callback) {
    if (chunk) {
      this.write(chunk, encoding);
    }

    this._writableState.ended = true;
    this.emit('finish');

    if (callback) {
      callback();
    }

    return this;
  }
}

class Duplex extends Readable {
  constructor(options) {
    super(options);
    this.writable = true;
    this._writableState = {
      ended: false
    };
  }

  write(chunk, encoding, callback) {
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = null;
    }

    this.emit('data', chunk);

    if (callback) {
      callback();
    }

    return true;
  }

  end(chunk, encoding, callback) {
    if (chunk) {
      this.write(chunk, encoding);
    }

    this._writableState.ended = true;
    this.emit('finish');

    if (callback) {
      callback();
    }

    return this;
  }
}

class Transform extends Duplex {
  constructor(options) {
    super(options);
    this._transformState = {
      transforming: false,
      writecb: null,
      writechunk: null
    };
  }

  _transform(chunk, encoding, callback) {
    throw new Error('_transform() is not implemented');
  }

  _flush(callback) {
    callback();
  }
}

class PassThrough extends Transform {
  constructor(options) {
    super(options);
  }

  _transform(chunk, encoding, callback) {
    this.push(chunk);
    callback();
  }
}

export default {
  Stream,
  Readable,
  Writable,
  Duplex,
  Transform,
  PassThrough,
  pipeline: (source, ...transforms) => {
    let current = source;
    for (const transform of transforms) {
      current = current.pipe(transform);
    }
    return current;
  },
  finished: (stream, callback) => {
    const onfinish = () => {
      stream.removeListener('finish', onfinish);
      stream.removeListener('error', onerror);
      callback();
    };
    
    const onerror = (err) => {
      stream.removeListener('finish', onfinish);
      stream.removeListener('error', onerror);
      callback(err);
    };
    
    stream.on('finish', onfinish);
    stream.on('error', onerror);
    
    return () => {
      stream.removeListener('finish', onfinish);
      stream.removeListener('error', onerror);
    };
  }
};
