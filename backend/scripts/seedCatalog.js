import { seedCatalog } from '../src/services/catalogSeeder.js';

const rows = await seedCatalog();
console.log(`Catalog imported. Rows processed: ${rows}`);
