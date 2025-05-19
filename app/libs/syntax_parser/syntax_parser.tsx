import { jsx } from 'hono/jsx'

export class SyntaxParser {
  private pos: number = 0;
  private input: string = '';
  private lines: string[] = [];

  parse(input: string): JSX.Element {
    this.pos = 0;
    this.input = input;
    this.lines = input.split('\n');
    return this.parseDocument();
  }

  private parseDocument(): JSX.Element {
    const elements: JSX.Element[] = [];
    while (this.pos < this.lines.length) {
      const block = this.parseBlock();
      if (block) elements.push(block);
    }
    return <>{elements}</>;
  }

  private parseBlock(): JSX.Element | null {
    const line = this.lines[this.pos];
    
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
  private parseHeading1(): JSX.Element {
    const text = this.parseText(this.lines[this.pos].substring(2));
    this.pos++;
    return <h2>{text}</h2>;
  }

  private parseHeading2(): JSX.Element {
    const text = this.parseText(this.lines[this.pos].substring(3));
    this.pos++;
    return <h3>{text}</h3>;
  }

  private parseHeading3(): JSX.Element {
    const text = this.parseText(this.lines[this.pos].substring(4));
    this.pos++;
    return <h4>{text}</h4>;
  }

  private parseParagraph(): JSX.Element {
    let text = '';
    while (this.pos < this.lines.length && this.lines[this.pos].trim() !== '') {
      text += this.parseText(this.lines[this.pos]) + ' ';
      this.pos++;
    }
    this.pos++; // Skip blank line
    return <p>{text.trim()}</p>;
  }

  private parseList(): JSX.Element {
    const items: JSX.Element[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].startsWith('-')) {
      const text = this.parseText(this.lines[this.pos].substring(1));
      items.push(<li>{text}</li>);
      this.pos++;
    }
    return <ul>{items}</ul>;
  }

  private parseNumberedList(): JSX.Element {
    const items: JSX.Element[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].startsWith('+')) {
      const text = this.parseText(this.lines[this.pos].substring(1));
      items.push(<li>{text}</li>);
      this.pos++;
    }
    return <ol>{items}</ol>;
  }

  private parseText(text: string): JSX.Element[] {
    const elements: JSX.Element[] = [];
    let currentText = '';
    let i = 0;
    
    while (i < text.length) {
      if (i < text.length - 3 && text.substring(i, i + 2) === '**') {
        if (currentText) {
          elements.push(<>{currentText}</>);
          currentText = '';
        }
        
        const boldStartIdx = i + 2;
        let boldEndIdx = text.indexOf('**', boldStartIdx);
        if (boldEndIdx === -1) boldEndIdx = text.length;
        
        elements.push(<strong>{text.substring(boldStartIdx, boldEndIdx)}</strong>);
        
        i = boldEndIdx + 2;
      }
      else if (i < text.length - 1 && text[i] === '*') {
        if (currentText) {
          elements.push(<>{currentText}</>);
          currentText = '';
        }
        
        const italicStartIdx = i + 1;
        let italicEndIdx = text.indexOf('*', italicStartIdx);
        if (italicEndIdx === -1) italicEndIdx = text.length;
        
        elements.push(<em>{text.substring(italicStartIdx, italicEndIdx)}</em>);
        
        i = italicEndIdx + 1;
      }
      else {
        currentText += text[i];
        i++;
      }
    }
    
    if (currentText) {
      elements.push(<>{currentText}</>);
    }
    
    return elements;
  }
}   