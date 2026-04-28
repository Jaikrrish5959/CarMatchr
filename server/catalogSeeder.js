import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from './db.js';

function normalizeBrand(raw) {
  const value = (raw || '').trim();
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower === 'hyundi') return 'Hyundai';
  return value
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function normalizeModel(raw) {
  const value = (raw || '').trim();
  if (!value) return null;
  return value.replace(/\s+/g, ' ');
}

function upsertCatalog(brand, model) {
  db.prepare('INSERT OR IGNORE INTO brands(name) VALUES (?)').run(brand);
  const brandRow = db.prepare('SELECT id FROM brands WHERE name = ?').get(brand);
  db.prepare('INSERT OR IGNORE INTO models(brandId, name) VALUES (?, ?)').run(brandRow.id, model);
}

function importFile(filePath, mapper) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parse(content, { columns: true, skip_empty_lines: true });
  let count = 0;
  for (const row of rows) {
    const mapped = mapper(row);
    if (!mapped) continue;
    upsertCatalog(mapped.brand, mapped.model);
    count += 1;
  }
  return count;
}

export function seedCatalog() {
  const count = db.prepare('SELECT COUNT(*) as c FROM brands').get().c;
  if (count > 0) return 0;
  const carDekhoPath = path.resolve(process.cwd(), 'CAR DETAILS FROM CAR DEKHO.csv');
  const carsExportPath = path.resolve(process.cwd(), 'Cars export 2026-04-28 12-08-05.csv');

  const c1 = importFile(carDekhoPath, (row) => {
    const name = String(row.name || '').trim();
    if (!name) return null;
    const parts = name.split(/\s+/);
    const brand = normalizeBrand(parts[0]);
    const model = normalizeModel(parts[1] || parts[0]);
    if (!brand || !model) return null;
    return { brand, model };
  });

  const c2 = importFile(carsExportPath, (row) => {
    const brand = normalizeBrand(row.Manufacturer);
    const model = normalizeModel(row.model);
    if (!brand || !model) return null;
    return { brand, model };
  });

  return c1 + c2;
}
