import { initDb } from '../db';
import { seedIfEmpty } from './seed';

initDb()
  .then(() => seedIfEmpty())
  .then((r) => {
    console.log(r.seeded ? 'Seed complete.' : 'Database already has data — nothing to do.');
    process.exit(0);
  })
  .catch((e) => {
    console.error('Seed failed', e);
    process.exit(1);
  });
