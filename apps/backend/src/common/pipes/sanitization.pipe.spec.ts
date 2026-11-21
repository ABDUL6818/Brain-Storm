import { SanitizationPipe } from './sanitization.pipe';

/**
 * Pins what the global SanitizationPipe does to request bodies (#1478), so
 * every endpoint that receives it gets the same cleanup.
 */
describe('SanitizationPipe (#1478)', () => {
  const pipe = new SanitizationPipe();

  it('removes null bytes and surrounding whitespace', async () => {
    await expect(pipe.transform({ title: '  a\0b  ' })).resolves.toEqual({ title: 'ab' });
  });

  it('strips HTML tags and keeps the text', async () => {
    await expect(pipe.transform({ bio: '<b>bold</b> text' })).resolves.toEqual({ bio: 'bold text' });
  });

  it('cleans nested objects and arrays', async () => {
    const input = { items: [{ name: ' <i>n</i> ' }] };

    await expect(pipe.transform(input)).resolves.toEqual({ items: [{ name: 'n' }] });
  });

  it('passes primitives and null through unchanged', async () => {
    await expect(pipe.transform(42)).resolves.toBe(42);
    await expect(pipe.transform(null)).resolves.toBeNull();
  });
});
