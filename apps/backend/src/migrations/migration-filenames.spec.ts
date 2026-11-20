import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * Migration naming guards (#1481). Every migration file starts with a unique
 * 13-digit timestamp, and its exported class ends with that same timestamp.
 */
describe('migration files (#1481)', () => {
  const files = readdirSync(__dirname).filter((f) => /^\d{13}-.+\.ts$/.test(f));

  it('uses a unique timestamp prefix for every migration', () => {
    const stamps = files.map((f) => f.slice(0, 13));

    expect(new Set(stamps).size).toBe(stamps.length);
  });

  it('names each migration class after its timestamp', () => {
    for (const file of files) {
      const stamp = file.slice(0, 13);
      const source = readFileSync(join(__dirname, file), 'utf8');
      const match = source.match(/export class (\w+) implements MigrationInterface/);

      expect(match, `${file} exports a MigrationInterface class`).not.toBeNull();
      expect(match![1].endsWith(stamp), `${file} class name ends with ${stamp}`).toBe(true);
    }
  });
});
