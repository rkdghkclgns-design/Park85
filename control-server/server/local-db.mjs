import { readdir, readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';

export async function createPreviewDb() {
  const database = new DatabaseSync(':memory:');
  const directory = new URL('../drizzle/', import.meta.url);
  const migrations = (await readdir(directory)).filter(name => name.endsWith('.sql')).sort();
  for (const migration of migrations) {
    database.exec(await readFile(new URL(migration, directory), 'utf8'));
  }
  return {
    prepare(sql) {
      const statement = database.prepare(sql);
      return {
        bind(...args) {
          return {
            first: async () => statement.get(...args) ?? null,
            all: async () => ({ results: statement.all(...args) }),
            run: async () => ({ meta: { changes: Number(statement.run(...args).changes) } }),
          };
        },
        first: async () => statement.get() ?? null,
        all: async () => ({ results: statement.all() }),
      };
    },
  };
}
