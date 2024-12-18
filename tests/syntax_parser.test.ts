import { expect, test } from "vitest";
import { SyntaxParser } from "../libs/syntax_parser/syntax_parser";

const parser = new SyntaxParser();

test("heading parsing", () => {
  expect(parser.parse("# Heading 1")).toBe("<h2>Heading 1</h2>\n");
  expect(parser.parse("## Heading 2")).toBe("<h3>Heading 2</h3>\n");
  expect(parser.parse("### Heading 3")).toBe("<h4>Heading 3</h4>\n");
});

test("paragraph parsing", () => {
  expect(parser.parse("This is a paragraph\n\n")).toBe("<p>This is a paragraph</p>\n");
});

test("text decoration", () => {
  expect(parser.parse("**bold**")).toBe("<p><strong>bold</strong></p>\n");
  expect(parser.parse("*italic*")).toBe("<p><em>italic</em></p>\n");
});

test("list parsing", () => {
  const input = "-Item 1\n-Item 2\n";
  const expected = "<ul>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ul>\n";
  expect(parser.parse(input)).toBe(expected);
});

test("numbered list parsing", () => {
  const input = "+Item 1\n+Item 2\n";
  const expected = "<ol>\n  <li>Item 1</li>\n  <li>Item 2</li>\n</ol>\n";
  expect(parser.parse(input)).toBe(expected);
});

test("complex document", () => {
  const input = `# Title
This is a **bold** and *italic* text.

## Subtitle
-List item 1
-List item 2

+Numbered item 1
+Numbered item 2
`;

  const expected = `<h2>Title</h2>
<p>This is a <strong>bold</strong> and <em>italic</em> text.</p>
<h3>Subtitle</h3>
<ul>
  <li>List item 1</li>
  <li>List item 2</li>
</ul>
<ol>
  <li>Numbered item 1</li>
  <li>Numbered item 2</li>
</ol>
`;

  expect(parser.parse(input)).toBe(expected);
}); 