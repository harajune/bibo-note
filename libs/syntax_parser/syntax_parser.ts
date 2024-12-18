export class SyntaxParser {
  private pos: number = 0;
  private input: string = '';
  private lines: string[] = [];

  parse(input: string): string {
    this.pos = 0;
    this.input = input;
    this.lines = input.split('\n');
    return this.parseDocument();
  }

  private parseDocument(): string {
    let html = '';
    while (this.pos < this.lines.length) {
      html += this.parseBlock();
    }
    return html;
  }

  private parseBlock(): string {
    const line = this.lines[this.pos];
    
    if (line.startsWith('### ')) return this.parseHeading3();
    if (line.startsWith('## ')) return this.parseHeading2();
    if (line.startsWith('# ')) return this.parseHeading1();
    if (line.startsWith('-')) return this.parseList();
    if (line.startsWith('+')) return this.parseNumberedList();
    if (line.trim() === '') {
      this.pos++;
      return '';
    }
    return this.parseParagraph();
  }

  // Because the page should have the title, the heading should start with h2
  private parseHeading1(): string {
    const text = this.parseText(this.lines[this.pos].substring(2));
    this.pos++;
    return `<h2>${text}</h2>\n`;
  }

  private parseHeading2(): string {
    const text = this.parseText(this.lines[this.pos].substring(3));
    this.pos++;
    return `<h3>${text}</h3>\n`;
  }

  private parseHeading3(): string {
    const text = this.parseText(this.lines[this.pos].substring(4));
    this.pos++;
    return `<h4>${text}</h4>\n`;
  }

  private parseParagraph(): string {
    let text = '';
    while (this.pos < this.lines.length && this.lines[this.pos].trim() !== '') {
      text += this.parseText(this.lines[this.pos]) + ' ';
      this.pos++;
    }
    this.pos++; // Skip blank line
    return `<p>${text.trim()}</p>\n`;
  }

  private parseList(): string {
    let items = '<ul>\n';
    while (this.pos < this.lines.length && this.lines[this.pos].startsWith('-')) {
      const text = this.parseText(this.lines[this.pos].substring(1));
      items += `  <li>${text}</li>\n`;
      this.pos++;
    }
    return items + '</ul>\n';
  }

  private parseNumberedList(): string {
    let items = '<ol>\n';
    while (this.pos < this.lines.length && this.lines[this.pos].startsWith('+')) {
      const text = this.parseText(this.lines[this.pos].substring(1));
      items += `  <li>${text}</li>\n`;
      this.pos++;
    }
    return items + '</ol>\n';
  }

  private parseText(text: string): string {
    // Bold
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    return text.trim();
  }
} 