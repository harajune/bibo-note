import { createElement, Fragment } from 'hono/jsx';

type JSXNode = any;
type Child = any;

export class SyntaxParser {
  private pos: number = 0;
  private input: string = '';
  private lines: string[] = [];

  parse(input: string): JSXNode {
    this.pos = 0;
    this.input = input;
    this.lines = input.split('\n');
    return this.parseDocument();
  }

  private parseDocument(): JSXNode {
    const elements: Child[] = [];
    while (this.pos < this.lines.length) {
      const block = this.parseBlock();
      if (block) {
        elements.push(block);
      }
    }
    return createElement(Fragment, null, ...elements);
  }

  private parseBlock(): JSXNode | null {
    const line = this.lines[this.pos];
    
    if (!line) {
      this.pos++;
      return null;
    }
    
    if (line.startsWith('### ')) return this.parseHeading3();
    if (line.startsWith('## ')) return this.parseHeading2();
    if (line.startsWith('# ')) return this.parseHeading1();
    if (line.startsWith('-')) return this.parseList();
    if (line.startsWith('+')) return this.parseNumberedList();
    if (line.trim() === '') {
      this.pos++;
      return null;
    }
    return this.parseParagraph();
  }

  // Because the page should have the title, the heading should start with h2
  private parseHeading1(): JSXNode {
    const text = this.lines[this.pos].substring(2);
    this.pos++;
    return createElement('h2', null, text);
  }

  private parseHeading2(): JSXNode {
    const text = this.lines[this.pos].substring(3);
    this.pos++;
    return createElement('h3', null, text);
  }

  private parseHeading3(): JSXNode {
    const text = this.lines[this.pos].substring(4);
    this.pos++;
    return createElement('h4', null, text);
  }

  private parseParagraph(): JSXNode {
    let textContent = '';
    while (this.pos < this.lines.length && this.lines[this.pos].trim() !== '') {
      textContent += this.lines[this.pos] + ' ';
      this.pos++;
    }
    this.pos++; // Skip blank line
    
    return createElement('p', null, this.parseInlineText(textContent.trim()));
  }

  private parseList(): JSXNode {
    const items: Child[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].startsWith('-')) {
      const text = this.lines[this.pos].substring(1);
      items.push(createElement('li', null, text));
      this.pos++;
    }
    return createElement('ul', null, ...items);
  }

  private parseNumberedList(): JSXNode {
    const items: Child[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].startsWith('+')) {
      const text = this.lines[this.pos].substring(1);
      items.push(createElement('li', null, text));
      this.pos++;
    }
    return createElement('ol', null, ...items);
  }

  private parseInlineText(text: string): Child | Child[] {
    // Process bold and italic text
    const parts: Child[] = [];
    let currentText = '';
    let i = 0;
    
    while (i < text.length) {
      // Check for bold text
      if (i + 1 < text.length && text[i] === '*' && text[i + 1] === '*') {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        // Find the end of the bold text
        const startPos = i + 2;
        let endPos = text.indexOf('**', startPos);
        if (endPos === -1) {
          currentText += '**';
          i += 2;
        } else {
          const boldContent = text.substring(startPos, endPos);
          // Process the bold content for italic markers
          parts.push(createElement('strong', null, this.processItalic(boldContent)));
          i = endPos + 2;
        }
      } 
      // Check for italic text
      else if (text[i] === '*') {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        // Find the end of the italic text
        const startPos = i + 1;
        let endPos = text.indexOf('*', startPos);
        if (endPos === -1) {
          currentText += '*';
          i += 1;
        } else {
          const italicContent = text.substring(startPos, endPos);
          parts.push(createElement('em', null, italicContent));
          i = endPos + 1;
        }
      } 
      else {
        currentText += text[i];
        i++;
      }
    }
    
    if (currentText) {
      parts.push(currentText);
    }
    
    return parts.length === 1 ? parts[0] : parts;
  }
  
  private processItalic(text: string): Child | Child[] {
    const parts: Child[] = [];
    let currentText = '';
    let i = 0;
    
    while (i < text.length) {
      // Check for italic text
      if (text[i] === '*') {
        if (currentText) {
          parts.push(currentText);
          currentText = '';
        }
        
        // Find the end of the italic text
        const startPos = i + 1;
        let endPos = text.indexOf('*', startPos);
        if (endPos === -1) {
          currentText += '*';
          i += 1;
        } else {
          const italicContent = text.substring(startPos, endPos);
          parts.push(createElement('em', null, italicContent));
          i = endPos + 1;
        }
      } 
      else {
        currentText += text[i];
        i++;
      }
    }
    
    if (currentText) {
      parts.push(currentText);
    }
    
    return parts.length === 1 ? parts[0] : parts;
  }
}
