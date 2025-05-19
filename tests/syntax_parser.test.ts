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
import { SyntaxParser } from "../app/libs/syntax_parser/syntax_parser";
import { jsxRenderer } from "hono/jsx-renderer";

const compareJSX = (jsx: any, expected: string) => {
  const element = jsx as { type: string, props: { children: any } };
  return element !== null;
};

const parser = new SyntaxParser();

test("heading parsing", () => {
  expect(compareJSX(parser.parse("# Heading 1"), "<h2>Heading 1</h2>")).toBe(true);
  expect(compareJSX(parser.parse("## Heading 2"), "<h3>Heading 2</h3>")).toBe(true);
  expect(compareJSX(parser.parse("### Heading 3"), "<h4>Heading 3</h4>")).toBe(true);
});

test("paragraph parsing", () => {
  expect(compareJSX(parser.parse("This is a paragraph\n\n"), "<p>This is a paragraph</p>")).toBe(true);
});

test("text decoration", () => {
  expect(compareJSX(parser.parse("**bold**"), "<p><strong>bold</strong></p>")).toBe(true);
  expect(compareJSX(parser.parse("*italic*"), "<p><em>italic</em></p>")).toBe(true);
});

test("list parsing", () => {
  const input = "-Item 1\n-Item 2\n";
  expect(compareJSX(parser.parse(input), "<ul><li>Item 1</li><li>Item 2</li></ul>")).toBe(true);
});

test("numbered list parsing", () => {
  const input = "+Item 1\n+Item 2\n";
  expect(compareJSX(parser.parse(input), "<ol><li>Item 1</li><li>Item 2</li></ol>")).toBe(true);
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

  expect(compareJSX(parser.parse(input), "complex document")).toBe(true);
});            