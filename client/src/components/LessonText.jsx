import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

const remarkPlugins = [remarkGfm, remarkMath];
// A formula the model wrote badly is shown as text instead of breaking the message.
const rehypePlugins = [[rehypeKatex, { throwOnError: false }]];

// Model output is untrusted: an uploaded file can carry instructions. Images are never
// rendered, so a reply cannot leak the conversation through an image URL, and links open
// in a new tab without passing on this page.
const disallowedElements = ['img'];
const components = {
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow">
      {children}
    </a>
  ),
};

/** Renders tutor messages and source passages: Markdown, tables and LaTeX math. */
export function LessonText({ text, dir, className = '' }) {
  return (
    <div dir={dir} className={`lesson-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        rehypePlugins={rehypePlugins}
        disallowedElements={disallowedElements}
        components={components}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
