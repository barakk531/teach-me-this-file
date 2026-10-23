import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { detectType, readUpload } from './readUpload.js';

const bytes = (text) => Buffer.from(text, 'latin1');
const sample = (name) => readFile(new URL(`../../../samples/${name}`, import.meta.url));

describe('detectType', () => {
  it('recognises files by their content, not their name', () => {
    expect(detectType(bytes('%PDF-1.7 ...'), 'notes.txt')).toEqual({
      kind: 'binary',
      mimeType: 'application/pdf',
    });
    expect(detectType(bytes('\x89PNG\r\n\x1a\n'), 'scan.pdf').mimeType).toBe('image/png');
    expect(detectType(bytes('\xff\xd8\xff\xe0'), 'photo').mimeType).toBe('image/jpeg');
  });

  it('accepts text files, including UTF-16 with a byte order mark', () => {
    expect(detectType(Buffer.from('שלום עולם'), 'lesson.txt').kind).toBe('text');
    expect(detectType(Buffer.from('﻿hello', 'utf16le'), 'notes.md').kind).toBe('text');
  });

  it('rejects binary content with a text extension and unknown types', () => {
    expect(detectType(Buffer.from([1, 0, 2, 0]), 'fake.txt').kind).toBe('unsupported');
    expect(detectType(bytes('MZ\x90\x00'), 'program.exe').kind).toBe('unsupported');
  });
});

describe('readUpload', () => {
  it('wraps text in a document part and keeps right-to-left text intact', async () => {
    const [part] = await readUpload({
      buffer: Buffer.from('מחזור המים בטבע'),
      originalname: 'מים.txt',
    });
    expect(part.text).toContain('מחזור המים בטבע');
    expect(part.text).toMatch(/^<document format="text">/);
  });

  it('converts a Word document to HTML, keeping headings and tables', async () => {
    const [part] = await readUpload({
      buffer: await sample('cells-plant-vs-animal.docx'),
      originalname: 'cells-plant-vs-animal.docx',
    });
    expect(part.text).toMatch(/^<document format="html">/);
    expect(part.text).toContain('<h1>Cells: Plant and Animal</h1>');
    expect(part.text).toContain('<table>');
    expect(part.text).toContain('Yes, made of cellulose');
  });

  it('sends PDFs to the model as inline data', async () => {
    const [part] = await readUpload({ buffer: bytes('%PDF-1.4 body'), originalname: 'a.pdf' });
    expect(part.inlineData.mimeType).toBe('application/pdf');
  });

  it('rejects empty files with a clear error', async () => {
    await expect(
      readUpload({ buffer: Buffer.from('  \n'), originalname: 'a.txt' }),
    ).rejects.toThrow('This file is empty.');
  });
});
