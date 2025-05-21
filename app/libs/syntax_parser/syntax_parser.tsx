import type { Child } from 'hono/jsx';

export class SyntaxParser {
  private pos: number = 0;
  private input: string = '';
  private lines: string[] = [];

  parse(input: string): Child[] {
    this.pos = 0;
    this.input = input;
    this.lines = input.split('\n');
    return this.parseDocument();
  }

  private parseDocument(): Child[] {
    const nodes: Child[] = [];
    while (this.pos < this.lines.length) {
      const node = this.parseBlock();
      if (node !== null) {
        nodes.push(node);
      }
    }
    return nodes;
  }

  private parseBlock(): Child | null {
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
  private parseHeading1(): Child {
    const text = this.parseText(this.lines[this.pos].substring(2));
    this.pos++;
    return <h2>{text}</h2>;
  }

  private parseHeading2(): Child {
    const text = this.parseText(this.lines[this.pos].substring(3));
    this.pos++;
    return <h3>{text}</h3>;
  }

  private parseHeading3(): Child {
    const text = this.parseText(this.lines[this.pos].substring(4));
    this.pos++;
    return <h4>{text}</h4>;
  }

  private parseParagraph(): Child {
    let text = '';
    while (this.pos < this.lines.length && this.lines[this.pos].trim() !== '') {
      text += this.lines[this.pos] + ' ';
      this.pos++;
    }
    this.pos++; // Skip blank line
    return <p>{this.parseText(text.trim())}</p>;
  }

  private parseList(): Child {
    const items: Child[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].startsWith('-')) {
      const text = this.parseText(this.lines[this.pos].substring(1));
      items.push(<li>{text}</li>);
      this.pos++;
    }
    return <ul>{items}</ul>;
  }

  private parseNumberedList(): Child {
    const items: Child[] = [];
    while (this.pos < this.lines.length && this.lines[this.pos].startsWith('+')) {
      const text = this.parseText(this.lines[this.pos].substring(1));
      items.push(<li>{text}</li>);
      this.pos++;
    }
    return <ol>{items}</ol>;
  }

  private parseText(text: string): Child[] {
    const nodes: Child[] = [];
    let buffer = '';
    for (let i = 0; i < text.length; ) {
      if (text.startsWith('**', i)) {
        const end = text.indexOf('**', i + 2);
        if (end !== -1) {
          if (buffer) {
            nodes.push(buffer);
            buffer = '';
          }
          nodes.push(<strong>{text.slice(i + 2, end)}</strong>);
          i = end + 2;
          continue;
        }
      }
      if (text.startsWith('*', i)) {
        const end = text.indexOf('*', i + 1);
        if (end !== -1) {
          if (buffer) {
            nodes.push(buffer);
            buffer = '';
          }
          nodes.push(<em>{text.slice(i + 1, end)}</em>);
          i = end + 1;
          continue;
        }
      }
      buffer += text[i];
      i++;
    }
    if (buffer) {
      nodes.push(buffer);
    }
    return nodes;
  }
}
