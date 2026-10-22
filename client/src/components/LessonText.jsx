import 'katex/dist/katex.min.css';
import ReactMarkdown from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

const remarkPlugins = [remarkGfm, remarkMath];
// A formula the model wrote badly is shown as text instead of breaking the message.
const rehypePlugins = [[rehypeKatex, { throwOnError: false }]];

/** Renders tutor messages and source passages: Markdown, tables and LaTeX math. */
export function LessonText({ text, dir, className = '' }) {
  return (
    <div dir={dir} className={`lesson-text ${className}`}>
      <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
