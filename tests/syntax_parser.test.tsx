/**
 * Test suite for the SyntaxParser class
 * Verifies the parsing functionality for various markdown-like syntax elements:
 * - Headings (h2-h4)
 * - Paragraphs
 * - Text decorations (bold, italic)
 * - Unordered lists
 * - Ordered lists
 * - Complex document structures
 */
import { expect, test } from "vitest";
import { renderToString } from "hono/jsx/dom/server";
import { SyntaxParser } from "../app/libs/syntax_parser/syntax_parser";

const parser = new SyntaxParser();

test("heading parsing", () => {
  expect(renderToString(<>{parser.parse("# Heading 1")}</>)).toBe("<h2>Heading 1</h2>");
  expect(renderToString(<>{parser.parse("## Heading 2")}</>)).toBe("<h3>Heading 2</h3>");
  expect(renderToString(<>{parser.parse("### Heading 3")}</>)).toBe("<h4>Heading 3</h4>");
});

test("paragraph parsing", () => {
  expect(renderToString(<>{parser.parse("This is a paragraph\n\n")}</>)).toBe("<p>This is a paragraph</p>");
});

test("text decoration", () => {
  expect(renderToString(<>{parser.parse("**bold**")}</>)).toBe("<p><strong>bold</strong></p>");
  expect(renderToString(<>{parser.parse("*italic*")}</>)).toBe("<p><em>italic</em></p>");
});

test("list parsing", () => {
  const input = "-Item 1\n-Item 2\n";
  const expected = "<ul><li>Item 1</li><li>Item 2</li></ul>";
  expect(renderToString(<>{parser.parse(input)}</>)).toBe(expected);
});

test("numbered list parsing", () => {
  const input = "+Item 1\n+Item 2\n";
  const expected = "<ol><li>Item 1</li><li>Item 2</li></ol>";
  expect(renderToString(<>{parser.parse(input)}</>)).toBe(expected);
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

  const expected = "<h2>Title</h2><p>This is a <strong>bold</strong> and <em>italic</em> text.</p><h3>Subtitle</h3><ul><li>List item 1</li><li>List item 2</li></ul><ol><li>Numbered item 1</li><li>Numbered item 2</li></ol>";

  expect(renderToString(<>{parser.parse(input)}</>)).toBe(expected);
});

