import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import { db } from '../src/db/index.js';

const sqlitePath = process.env.SQLITE_DB_PATH
  ? path.resolve(process.env.SQLITE_DB_PATH)
  : path.resolve(process.cwd(), 'db', 'carmatchr.sqlite');

if (!fs.existsSync(sqlitePath)) {
  console.error(`SQLite database not found at: ${sqlitePath}`);
  process.exit(1);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const SQL = await initSqlJs({
  locateFile: (file) => path.resolve(scriptDir, '..', 'node_modules', 'sql.js', 'dist', file),
});
const sqliteDb = new SQL.Database(fs.readFileSync(sqlitePath));

const tableOrder = [
  'users',
  'requirements',
  'offers',
  'brokerListings',
  'brands',
  'models',
  'features',
  'modelFeatures',
  'contactEvents',
  'listingImages',
];

const conflictTargets = {
  users: '(id)',
  requirements: '(id)',
  offers: '(id)',
  brokerListings: '(id)',
  brands: '(id)',
  models: '(id)',
  features: '(id)',
  modelFeatures: '(modelId, featureId)',
  contactEvents: '(id)',
  listingImages: '(id)',
};

function normalizeRow(table, columns, values) {
  if (table === 'offers') {
    const idx = columns.indexOf('isRead');
    if (idx >= 0) {
      values[idx] = Boolean(values[idx]);
    }
  }
  return values;
}

async function insertRows(tx, table, columns, rows) {
  if (!rows.length) return 0;
  const colList = columns.map((c) => `"${c}"`).join(', ');
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
  const conflict = conflictTargets[table] ? ` ON CONFLICT ${conflictTargets[table]} DO NOTHING` : '';
  const sql = `INSERT INTO "${table}" (${colList}) VALUES (${placeholders})${conflict}`;

  let inserted = 0;
  for (const row of rows) {
    const normalized = normalizeRow(table, columns, [...row]);
    await tx.run(sql, normalized);
    inserted += 1;
  }
  return inserted;
}

async function migrate() {
  console.log('Starting SQLite -> Postgres migration...');
  await db.transaction(async (tx) => {
    for (const table of tableOrder) {
      const result = sqliteDb.exec(`SELECT * FROM ${table}`);
      if (!result.length) {
        console.log(`Skipping ${table} (no rows)`);
        continue;
      }
      const { columns, values } = result[0];
      const count = await insertRows(tx, table, columns, values);
      console.log(`Migrated ${count} rows into ${table}`);
    }

    await tx.run(
      "SELECT setval(pg_get_serial_sequence('brands','id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM brands), 1), true)"
    );
    await tx.run(
      "SELECT setval(pg_get_serial_sequence('models','id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM models), 1), true)"
    );
    await tx.run(
      "SELECT setval(pg_get_serial_sequence('features','id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM features), 1), true)"
    );
    await tx.run(
      "SELECT setval(pg_get_serial_sequence('contactEvents','id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM contactEvents), 1), true)"
    );
    await tx.run(
      "SELECT setval(pg_get_serial_sequence('listingImages','id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM listingImages), 1), true)"
    );
  });

  console.log('Migration complete.');
}

await migrate();
