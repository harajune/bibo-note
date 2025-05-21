const moduleShim = { exports: {} };

export class XMLParser {
  constructor(options = {}) {
    this.options = options;
  }

  parse(xmlData) {
    if (typeof xmlData !== 'string') {
      throw new Error('XML data must be a string');
    }

    const result = {};
    
    const rootMatch = xmlData.match(/<([^\s>]+)([^>]*)>([\s\S]*?)<\/\1>/);
    if (rootMatch) {
      const rootName = rootMatch[1];
      const rootContent = rootMatch[3].trim();
      
      result[rootName] = this.parseContent(rootContent);
    }
    
    return result;
  }
  
  parseContent(content) {
    const result = {};
    
    const elementRegex = /<([^\s>]+)([^>]*)>([\s\S]*?)<\/\1>/g;
    let match;
    
    while ((match = elementRegex.exec(content)) !== null) {
      const elementName = match[1];
      const elementContent = match[3].trim();
      
      if (/<[^\s>]+[^>]*>/.test(elementContent)) {
        result[elementName] = this.parseContent(elementContent);
      } else {
        result[elementName] = elementContent;
      }
    }
    
    return result;
  }
}

export class XMLValidator {
  static validate(xmlData) {
    try {
      if (typeof xmlData !== 'string') {
        return { err: { code: 'INVALID_XML', msg: 'XML data must be a string' } };
      }
      
      if (!xmlData.match(/<[^\s>]+[^>]*>[\s\S]*?<\/[^\s>]+>/)) {
        return { err: { code: 'INVALID_XML', msg: 'Invalid XML structure' } };
      }
      
      return { err: null };
    } catch (error) {
      return { err: { code: 'INVALID_XML', msg: error.message } };
    }
  }
}

export class XMLBuilder {
  constructor(options = {}) {
    this.options = options;
  }
  
  build(jsObject) {
    let xml = '';
    
    for (const key in jsObject) {
      if (Object.prototype.hasOwnProperty.call(jsObject, key)) {
        const value = jsObject[key];
        
        if (typeof value === 'object' && value !== null) {
          xml += `<${key}>${this.build(value)}</${key}>`;
        } else {
          xml += `<${key}>${value}</${key}>`;
        }
      }
    }
    
    return xml;
  }
}

export default {
  XMLParser,
  XMLValidator,
  XMLBuilder
};
