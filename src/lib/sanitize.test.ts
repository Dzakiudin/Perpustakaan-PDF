import { describe, it, expect } from 'vitest';
import { sanitizeText, isSafeFilename, sanitizeEmail } from './sanitize';

describe('Sanitize Utilities', () => {
    it('removes null bytes from text', () => {
        expect(sanitizeText('hello\x00world')).toBe('helloworld');
    });

    it('trims leading and trailing whitespace', () => {
        expect(sanitizeText('   hello world   ')).toBe('hello world');
    });

    it('validates safe filenames correctly', () => {
        expect(isSafeFilename('book.pdf')).toBe(true);
        expect(isSafeFilename('my-awesome_book-123.pdf')).toBe(true);
    });

    it('rejects unsafe filenames', () => {
        expect(isSafeFilename('../book.pdf')).toBe(false);
        expect(isSafeFilename('book.exe')).toBe(false);
        expect(isSafeFilename('/etc/passwd')).toBe(false);
    });

    it('sanitizes email addresses to lowercase', () => {
        expect(sanitizeEmail('Test@Example.com')).toBe('test@example.com');
    });
});
