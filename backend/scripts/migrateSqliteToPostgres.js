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

const tableMap = {
  users: 'users',
  requirements: 'requirements',
  offers: 'offers',
  brokerListings: 'broker_listings',
  brands: 'brands',
  models: 'models',
  features: 'features',
  modelFeatures: 'model_features',
  contactEvents: 'contact_events',
  listingImages: 'listing_images',
};

const conflictTargets = {
  users: '(id)',
  requirements: '(id)',
  offers: '(id)',
  broker_listings: '(id)',
  brands: '(id)',
  models: '(id)',
  features: '(id)',
  model_features: '(model_id, feature_id)',
  contact_events: '(id)',
  listing_images: '(id)',
};

function camelToSnake(str) {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function normalizeRow(table, columns, values) {
  if (table === 'offers') {
    const idx = columns.indexOf('isRead');
    if (idx >= 0) {
      values[idx] = Boolean(values[idx]);
    }
  }
  return values;
}

async function insertRows(tx, sqliteTable, columns, rows) {
  if (!rows.length) return 0;
  const pgTable = tableMap[sqliteTable] || sqliteTable;
  const pgColumns = columns.map(camelToSnake);

  const colList = pgColumns.map((c) => `"${c}"`).join(', ');
  const placeholders = pgColumns.map((_, i) => `$${i + 1}`).join(', ');
  const conflict = conflictTargets[pgTable] ? ` ON CONFLICT ${conflictTargets[pgTable]} DO NOTHING` : '';
  const sql = `INSERT INTO "${pgTable}" (${colList}) VALUES (${placeholders})${conflict}`;

  let inserted = 0;
  for (const row of rows) {
    const normalized = normalizeRow(sqliteTable, columns, [...row]);
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
      console.log(`Migrated ${count} rows into ${tableMap[table] || table}`);
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
      "SELECT setval(pg_get_serial_sequence('contact_events','id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM contact_events), 1), true)"
    );
    await tx.run(
      "SELECT setval(pg_get_serial_sequence('listing_images','id'), GREATEST((SELECT COALESCE(MAX(id), 0) FROM listing_images), 1), true)"
    );
  });

  console.log('Migration complete.');
}

await migrate();
