import mammoth from 'mammoth';
import { AppError } from '../http/errors.js';

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'csv']);
const HEIF_BRANDS = new Set(['heic', 'heix', 'hevc', 'mif1', 'msf1']);
// About 200k tokens: above this a free key would hit its per-minute token limit.
const MAX_TEXT_CHARS = 800_000;

/**
 * Turns an uploaded file into Gemini content parts. PDFs and images go to the
 * model as they are, so it can read scanned pages, tables and formulas itself.
 * Word files are converted to HTML (keeps headings and tables), text is decoded.
 */
export async function readUpload({ buffer, originalname }) {
  if (!buffer?.length) throw emptyFile();
  const type = detectType(buffer, originalname);
  switch (type.kind) {
    case 'binary':
      return [{ inlineData: { mimeType: type.mimeType, data: buffer.toString('base64') } }];
    case 'docx':
      return [documentPart(await docxToHtml(buffer), 'html')];
    case 'text':
      return [documentPart(decodeText(buffer), 'text')];
    default:
      throw new AppError(
        'unsupported_file',
        'This file type is not supported. Use a PDF, an image, a Word document or a text file.',
        { status: 415 },
      );
  }
}

/** Trusts the file's bytes over its name, so a renamed file is caught here and not by the AI. */
export function detectType(buffer, fileName = '') {
  const head = buffer.subarray(0, 16).toString('latin1');
  if (head.startsWith('%PDF-')) return { kind: 'binary', mimeType: 'application/pdf' };
  if (head.startsWith('\x89PNG')) return { kind: 'binary', mimeType: 'image/png' };
  if (head.startsWith('\xff\xd8\xff')) return { kind: 'binary', mimeType: 'image/jpeg' };
  if (head.startsWith('RIFF') && head.slice(8, 12) === 'WEBP') {
    return { kind: 'binary', mimeType: 'image/webp' };
  }
  if (head.slice(4, 8) === 'ftyp' && HEIF_BRANDS.has(head.slice(8, 12))) {
    return { kind: 'binary', mimeType: 'image/heic' };
  }

  const extension = fileName.split('.').pop()?.toLowerCase();
  if (head.startsWith('PK') && extension === 'docx') return { kind: 'docx' };
  if (TEXT_EXTENSIONS.has(extension) && (hasUtf16Bom(buffer) || !hasNullBytes(buffer))) {
    return { kind: 'text' };
  }
  return { kind: 'unsupported' };
}

function decodeText(buffer) {
  if (buffer[0] === 0xff && buffer[1] === 0xfe) return new TextDecoder('utf-16le').decode(buffer);
  if (buffer[0] === 0xfe && buffer[1] === 0xff) return new TextDecoder('utf-16be').decode(buffer);
  return new TextDecoder('utf-8').decode(buffer);
}

async function docxToHtml(buffer) {
  try {
    const { value } = await mammoth.convertToHtml(
      { buffer },
      // Embedded images would be inlined as huge base64 strings; keep only their place.
      { convertImage: mammoth.images.imgElement(() => ({ src: '' })) },
    );
    return value;
  } catch {
    throw new AppError('unreadable_file', 'This Word document could not be opened.', {
      status: 422,
    });
  }
}

function documentPart(content, format) {
  const text = content.trim();
  if (!text) throw emptyFile();
  if (text.length > MAX_TEXT_CHARS) {
    throw new AppError(
      'file_too_long',
      'This document is too long for one lesson. Upload only the chapter you want to teach.',
      { status: 413 },
    );
  }
  return { text: `<document format="${format}">\n${text}\n</document>` };
}

function hasUtf16Bom(buffer) {
  return (buffer[0] === 0xff && buffer[1] === 0xfe) || (buffer[0] === 0xfe && buffer[1] === 0xff);
}

function hasNullBytes(buffer) {
  return buffer.subarray(0, 4096).includes(0);
}

function emptyFile() {
  return new AppError('empty_file', 'This file is empty.', { status: 422 });
}
