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

function seedLogos() {
  const companiesPath = path.resolve(process.cwd(), 'companies.csv');
  if (!fs.existsSync(companiesPath)) return;
  const content = fs.readFileSync(companiesPath, 'utf8');
  const rows = parse(content, { columns: true, skip_empty_lines: true });
  const updateStmt = db.prepare('UPDATE brands SET logoUrl = ? WHERE LOWER(name) = LOWER(?)');

  // Manual mappings for brands missing from companies.csv or with different names
  const manualMappings = [
    { name: 'Maruti', logo: 'https://www.carlogos.org/car-logos/suzuki-logo.png' },
    { name: 'Maruti Suzuki', logo: 'https://www.carlogos.org/car-logos/suzuki-logo.png' },
    { name: 'Tata', logo: 'https://www.carlogos.org/car-logos/tata-logo.png' },
    { name: 'Mahindra', logo: 'https://www.carlogos.org/car-logos/mahindra-logo.png' },
    { name: 'Skoda', logo: 'https://www.carlogos.org/car-logos/skoda-logo.png' },
    { name: 'Toyota', logo: 'https://www.carlogos.org/car-logos/toyota-logo.png' },
  ];

  for (const mapping of manualMappings) {
    updateStmt.run(mapping.logo, mapping.name);
  }

  for (const row of rows) {
    if (row.name && row.logo_link) {
      updateStmt.run(row.logo_link, row.name);
      // Also try normalized version just in case
      updateStmt.run(row.logo_link, normalizeBrand(row.name));
    }
  }
}

export function seedCatalog() {
  const count = db.prepare('SELECT COUNT(*) as c FROM brands').get().c;
  if (count === 0) {
    const carDekhoPath = path.resolve(process.cwd(), 'CAR DETAILS FROM CAR DEKHO.csv');
    const carsExportPath = path.resolve(process.cwd(), 'Cars export 2026-04-28 12-08-05.csv');

    importFile(carDekhoPath, (row) => {
      const name = String(row.name || '').trim();
      if (!name) return null;
      const parts = name.split(/\s+/);
      const brand = normalizeBrand(parts[0]);
      const model = normalizeModel(parts[1] || parts[0]);
      if (!brand || !model) return null;
      return { brand, model };
    });

    importFile(carsExportPath, (row) => {
      const brand = normalizeBrand(row.Manufacturer);
      const model = normalizeModel(row.model);
      if (!brand || !model) return null;
      return { brand, model };
    });
  }

  seedLogos();
  return db.prepare('SELECT COUNT(*) as c FROM brands').get().c;
}
