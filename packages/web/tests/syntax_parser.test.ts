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
import { Fragment } from "hono/jsx";

const parser = new SyntaxParser();

test("debug JSX structure", () => {
  const h1Result = parser.parse("# Heading 1");
  
  const boldResult = parser.parse("**bold**");
});

test("heading parsing", () => {
  const h1Result = parser.parse("# Heading 1");
  
  expect(Array.isArray(h1Result.children)).toBe(true);
  expect(h1Result.children.length).toBe(1);
  expect(h1Result.children[0].tag).toBe('h2');
  expect(h1Result.children[0].children[0]).toBe('Heading 1');

  const h2Result = parser.parse("## Heading 2");
  expect(h2Result.children[0].tag).toBe('h3');
  expect(h2Result.children[0].children[0]).toBe('Heading 2');

  const h3Result = parser.parse("### Heading 3");
  expect(h3Result.children[0].tag).toBe('h4');
  expect(h3Result.children[0].children[0]).toBe('Heading 3');
});

test("paragraph parsing", () => {
  const result = parser.parse("This is a paragraph\n\n");
  expect(result.children[0].tag).toBe('p');
  
  // Check if the content is a string and contains "This is a paragraph"
  const content = result.children[0].children[0];
  expect(typeof content).toBe('string');
  expect(content).toContain('This is a paragraph');
});

test("text decoration", () => {
  const boldResult = parser.parse("**bold**");
  expect(boldResult.children[0].tag).toBe('p');
  
  // Check if the content is a strong element with "bold" text
  const boldContent = boldResult.children[0].children[0];
  expect(boldContent.tag).toBe('strong');
  expect(boldContent.children[0]).toBe('bold');

  const italicResult = parser.parse("*italic*");
  expect(italicResult.children[0].tag).toBe('p');
  
  // Check if the content is an em element with "italic" text
  const italicContent = italicResult.children[0].children[0];
  expect(italicContent.tag).toBe('em');
  expect(italicContent.children[0]).toBe('italic');
});

test("list parsing", () => {
  const input = "-Item 1\n-Item 2\n";
  const result = parser.parse(input);
  expect(result.children[0].tag).toBe('ul');
  expect(Array.isArray(result.children[0].children)).toBe(true);
  expect(result.children[0].children.length).toBe(2);
  expect(result.children[0].children[0].tag).toBe('li');
  
  // Check if the content is a string and contains "Item 1"
  const content = result.children[0].children[0].children[0];
  expect(typeof content).toBe('string');
  expect(content).toContain('Item 1');
});

test("numbered list parsing", () => {
  const input = "+Item 1\n+Item 2\n";
  const result = parser.parse(input);
  expect(result.children[0].tag).toBe('ol');
  expect(Array.isArray(result.children[0].children)).toBe(true);
  expect(result.children[0].children.length).toBe(2);
  expect(result.children[0].children[0].tag).toBe('li');
  
  // Check if the content is a string and contains "Item 1"
  const content = result.children[0].children[0].children[0];
  expect(typeof content).toBe('string');
  expect(content).toContain('Item 1');
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

  const result = parser.parse(input);
  
  expect(result.children.length).toBe(5);
  
  expect(result.children[0].tag).toBe('h2');
  expect(result.children[0].children[0]).toBe('Title');
  
  expect(result.children[1].tag).toBe('p');
  
  expect(result.children[2].tag).toBe('h3');
  expect(result.children[2].children[0]).toBe('Subtitle');
  
  expect(result.children[3].tag).toBe('ul');
  expect(result.children[3].children.length).toBe(2);
  
  expect(result.children[4].tag).toBe('ol');
  expect(result.children[4].children.length).toBe(2);
});                           