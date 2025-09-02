import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { DecorationSet } from '@tiptap/pm/view'
import MarkdownIt from 'markdown-it'
import { marked } from 'marked'

export interface MarkdownExtensionOptions {
  html?: boolean
  linkify?: boolean
  typographer?: boolean
  breaks?: boolean
}

// Enhanced HTML to markdown converter using marked
function htmlToMarkdown(html: string): string {
  try {
    // Use marked to parse HTML and convert to markdown
    // First, we need to clean up the HTML to ensure proper parsing
    const cleanHtml = html
      .replace(/<br\s*\/?>/g, '\n') // Convert <br> to newlines first
      .replace(/<p><\/p>/g, '\n') // Convert empty paragraphs to newlines
      .replace(/<p>/g, '') // Remove opening <p> tags
      .replace(/<\/p>/g, '\n\n') // Convert closing </p> tags to double newlines
    
    // Use marked to convert HTML to markdown
    const markdown = marked.parse(cleanHtml, {
      gfm: true,
      breaks: true
    })
    
    // Clean up the result
    return String(markdown)
      .replace(/\n\n\n+/g, '\n\n') // Normalize multiple newlines
      .trim()
  } catch (error) {
    console.warn('Error converting HTML to markdown with marked, falling back to regex:', error)
    
    // Fallback to regex-based conversion
    return html
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<h4>(.*?)<\/h4>/g, '#### $1\n\n')
      .replace(/<h5>(.*?)<\/h5>/g, '##### $1\n\n')
      .replace(/<h6>(.*?)<\/h6>/g, '###### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<b>(.*?)<\/b>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<i>(.*?)<\/i>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```\n\n')
      .replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, '> $1\n\n')
      .replace(/<ul>([\s\S]*?)<\/ul>/g, (match, content) => {
        return content.replace(/<li>([\s\S]*?)<\/li>/g, '- $1\n') + '\n'
      })
      .replace(/<ol>([\s\S]*?)<\/ol>/g, (match, content) => {
        let counter = 1
        return content.replace(/<li>([\s\S]*?)<\/li>/g, () => `${counter++}. $1\n`) + '\n'
      })
      .replace(/<p>([\s\S]*?)<\/p>/g, '$1\n\n')
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<a href="([^"]*?)">([\s\S]*?)<\/a>/g, '[$2]($1)')
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/\n\n\n+/g, '\n\n') // Normalize multiple newlines
      .trim()
  }
}

export const MarkdownExtension = Extension.create<MarkdownExtensionOptions>({
  name: 'markdown',

  addOptions() {
    return {
      html: false,
      linkify: true,
      typographer: false,
      breaks: true,
    }
  },

  addStorage() {
    return {
      markdownIt: new MarkdownIt({
        html: this.options.html,
        linkify: this.options.linkify,
        typographer: this.options.typographer,
        breaks: this.options.breaks,
      }),
      // Add marked instance for HTML to markdown conversion
      marked: marked
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markdown'),
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, set) {
            return set
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },

  onCreate() {
    // Initialize markdown-it with plugins if needed
    // const md = this.storage.markdownIt
    
    // Configure marked options
    marked.use({
      gfm: true,
      breaks: true
    })
  },

  onDestroy() {
    // Cleanup if needed
  },
})

// Export helper functions for external use
export { htmlToMarkdown }

// Export a function to get markdown from editor
export function getMarkdownFromEditor(editor: { getHTML: () => string }): string {
  const content = editor.getHTML()
  return htmlToMarkdown(content)
}

// Export a function to set markdown in editor
export function setMarkdownInEditor(editor: { commands: { setContent: (html: string) => void } }, markdown: string, markdownIt: MarkdownIt): boolean {
  try {
    const html = markdownIt.render(markdown)
    editor.commands.setContent(html)
    return true
  } catch (error) {
    console.error('Error setting markdown content:', error)
    return false
  }
}

export default MarkdownExtension 