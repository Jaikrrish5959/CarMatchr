import { seedCatalog } from './catalogSeeder.js';

const rows = seedCatalog();
console.log(`Catalog imported. Rows processed: ${rows}`);
