# TipTap Markdown Extension

This folder contains a custom TipTap extension that uses `markdown-it` and `marked` to handle markdown parsing and serialization, replacing the problematic `tiptap-markdown` library.

## Features

- **Markdown Parsing**: Uses `markdown-it` to parse markdown to HTML
- **HTML to Markdown Conversion**: Uses `marked` library for robust HTML to markdown conversion
- **Fallback Support**: Includes regex-based fallback conversion if marked fails
- **Configurable**: Supports all `markdown-it` configuration options
- **No External Dependencies**: Uses only libraries already available in the project

## Usage

```typescript
import {
  MarkdownExtension,
  getMarkdownFromEditor,
  setMarkdownInEditor,
  htmlToMarkdown,
  getMarkdownFromHTML,
} from "./tiptap";

// In your TipTap editor configuration
const editor = useEditor({
  extensions: [
    // ... other extensions
    MarkdownExtension.configure({
      html: false,
      linkify: true,
      typographer: false,
      breaks: true,
    }),
  ],
  // ... other options
});

// Convert HTML to markdown
const markdown = htmlToMarkdown(editor.getHTML());

// Get markdown from editor
const markdown = getMarkdownFromEditor(editor);

// Set markdown in editor
const success = setMarkdownInEditor(editor, markdown, markdownItInstance);
```

## Functions

### `htmlToMarkdown(html: string): string`

Converts HTML to markdown using the `marked` library with fallback to regex-based conversion.

### `getMarkdownFromEditor(editor: { getHTML: () => string }): string`

Extracts markdown content from a TipTap editor instance.

### `setMarkdownInEditor(editor, markdown: string, markdownIt: MarkdownIt): boolean`

Sets markdown content in a TipTap editor using markdown-it for parsing.

## Configuration

The extension supports the following options:

- `html`: Enable HTML tags in markdown (default: false)
- `linkify`: Convert URLs to links (default: true)
- `typographer`: Enable typographic replacements (default: false)
- `breaks`: Convert line breaks to `<br>` (default: true)

## Migration from tiptap-markdown

1. Replace the import:

   ```typescript
   // Old
   import { Markdown } from "tiptap-markdown";

   // New
   import { MarkdownExtension, htmlToMarkdown } from "./tiptap";
   ```

2. Update the extension usage:

   ```typescript
   // Old
   Markdown.configure({
     parser: md,
     html: false,
     tightLists: false,
     bulletListMarker: "-",
     linkify: true,
     breaks: true,
   });

   // New
   MarkdownExtension.configure({
     html: false,
     linkify: true,
     typographer: false,
     breaks: true,
   });
   ```

3. Update markdown retrieval:

   ```typescript
   // Old
   (editor.storage as unknown as MarkdownStorage).markdown.getMarkdown();

   // New
   htmlToMarkdown(editor.getHTML());
   ```

## Dependencies

This extension uses the following libraries that are already available in the project:

- `markdown-it`: For markdown to HTML parsing
- `marked`: For HTML to markdown conversion
- `@tiptap/core`: For the extension framework

## Benefits

- **Better Performance**: No external dependency loading
- **Consistent API**: Uses the same libraries as the rest of the project
- **Fallback Support**: Robust conversion with multiple fallback methods
- **Maintainable**: Full control over the markdown processing logic
- **Type Safe**: Full TypeScript support with proper type definitions
