import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../db/index.js';

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

async function upsertCatalog(brand, model) {
  await db.run('INSERT INTO brands(name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [brand]);
  const brandRow = await db.get('SELECT id FROM brands WHERE name = $1', [brand]);
  await db.run(
    'INSERT INTO models(brand_id, name) VALUES ($1, $2) ON CONFLICT (brand_id, name) DO NOTHING',
    [brandRow.id, model]
  );
}

async function importFile(filePath, mapper) {
  if (!fs.existsSync(filePath)) return 0;
  const content = fs.readFileSync(filePath, 'utf8');
  const rows = parse(content, { columns: true, skip_empty_lines: true });
  let count = 0;
  for (const row of rows) {
    const mapped = mapper(row);
    if (!mapped) continue;
    await upsertCatalog(mapped.brand, mapped.model);
    count += 1;
  }
  return count;
}

async function seedLogos() {
  const companiesPath = path.resolve(process.cwd(), 'data', 'companies.csv');
  if (!fs.existsSync(companiesPath)) return;
  const content = fs.readFileSync(companiesPath, 'utf8');
  const rows = parse(content, { columns: true, skip_empty_lines: true });

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
    await db.run('UPDATE brands SET logo_url = $1 WHERE LOWER(name) = LOWER($2)', [
      mapping.logo,
      mapping.name,
    ]);
  }

  for (const row of rows) {
    if (row.name && row.logo_link) {
      await db.run('UPDATE brands SET logo_url = $1 WHERE LOWER(name) = LOWER($2)', [
        row.logo_link,
        row.name,
      ]);
      // Also try normalized version just in case
      await db.run('UPDATE brands SET logo_url = $1 WHERE LOWER(name) = LOWER($2)', [
        row.logo_link,
        normalizeBrand(row.name),
      ]);
    }
  }
}

export async function seedCatalog() {
  const countRow = await db.get('SELECT COUNT(*) as c FROM brands');
  const count = Number(countRow?.c ?? 0);
  if (count === 0) {
    const carDekhoPath = path.resolve(process.cwd(), 'data', 'car_dekho.csv');
    const carsExportPath = path.resolve(process.cwd(), 'data', 'cars_export_2026-04-28.csv');

    await importFile(carDekhoPath, (row) => {
      const name = String(row.name || '').trim();
      if (!name) return null;
      const parts = name.split(/\s+/);
      const brand = normalizeBrand(parts[0]);
      const model = normalizeModel(parts[1] || parts[0]);
      if (!brand || !model) return null;
      return { brand, model };
    });

    await importFile(carsExportPath, (row) => {
      const brand = normalizeBrand(row.Manufacturer);
      const model = normalizeModel(row.model);
      if (!brand || !model) return null;
      return { brand, model };
    });
  }

  await seedLogos();
  const finalCountRow = await db.get('SELECT COUNT(*) as c FROM brands');
  return Number(finalCountRow?.c ?? 0);
}
