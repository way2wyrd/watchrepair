// Generate a sample customer-facing repair PDF from the real database,
// reusing the same layout module the browser uses (src/utils/repairPdf.js).
//
// Usage: node scripts/genSamplePdf.mjs [watchId]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import initSqlJs from 'sql.js';
import sharp from 'sharp';
import { buildRepairDoc } from '../src/utils/repairPdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DB_PATH = path.join(ROOT, 'public', 'WatchRepair.db3');
const UPLOADS_DIR = path.join(ROOT, 'uploads');

const rowsToObjects = (result) => {
  if (!result.length) return [];
  const { columns, values } = result[0];
  return values.map((v) => Object.fromEntries(columns.map((c, i) => [c, v[i]])));
};

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  let id = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  if (!id) {
    // Pick the repair with the most photos for a representative sample.
    const pick = rowsToObjects(db.exec(`
      SELECT w.id, COUNT(p.id) AS n
      FROM watch w LEFT JOIN photo p ON p.watchId = w.id
      GROUP BY w.id ORDER BY n DESC, w.id ASC LIMIT 1
    `));
    id = pick.length ? pick[0].id : null;
  }
  if (!id) throw new Error('No repairs in database.');

  const watch = rowsToObjects(db.exec(`
    SELECT w.*, m.name as movementName, m.manufacturer, m.jewels, m.caliber,
           m.frequency, m.liftAngle, m.movementType as movementTypeId,
           mt.description as movementType
    FROM watch w
    LEFT JOIN movement m ON w.movement = m.id
    LEFT JOIN movementType mt ON m.movementType = mt.id
    WHERE w.id = ${id}
  `))[0];

  watch.photos = rowsToObjects(db.exec(
    `SELECT id, watchId, filename, caption, createdAt, category, description
     FROM photo WHERE watchId = ${id} ORDER BY category, createdAt DESC`
  ));

  const sessions = rowsToObjects(db.exec(
    `SELECT id, liftAngle, notes, createdAt FROM timing_session WHERE watchId = ${id} ORDER BY createdAt DESC`
  ));
  watch.timingSessions = sessions.map((s) => ({
    ...s,
    readings: rowsToObjects(db.exec(
      `SELECT r.id, r.rate, r.beatError, p.description as position, p.id as positionId
       FROM timing_reading r LEFT JOIN position p ON r.position = p.id
       WHERE r.sessionId = ${s.id} ORDER BY p.id`
    )),
  }));

  watch.parts = rowsToObjects(db.exec(
    `SELECT id, watchId, partNumber, description, vendor, dateOrdered, received, cost, notes, createdAt
     FROM part WHERE watchId = ${id} ORDER BY createdAt DESC`
  ));

  console.log(`Repair #${id} — ${watch.customerName} | ${watch.photos.length} photos, ${watch.parts.length} parts, ${watch.timingSessions.length} timing sessions`);

  // Resolve photos to JPEG data URLs via sharp (mirrors the browser canvas path).
  const images = {};
  for (const photo of watch.photos) {
    const src = path.join(UPLOADS_DIR, photo.filename);
    if (!fs.existsSync(src)) continue;
    try {
      const meta = await sharp(src).metadata();
      const buf = await sharp(src)
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
      images[photo.filename] = {
        dataUrl: 'data:image/jpeg;base64,' + buf.toString('base64'),
        width: meta.width || 4,
        height: meta.height || 3,
      };
    } catch (e) {
      console.warn('  skip image', photo.filename, e.message);
    }
  }

  const doc = buildRepairDoc(watch, images, { shopName: 'Heirloom Watch Co.' });
  const out = path.join(ROOT, `sample-repair-${id}.pdf`);
  fs.writeFileSync(out, Buffer.from(doc.output('arraybuffer')));
  console.log('Wrote', out);
}

main().catch((e) => { console.error(e); process.exit(1); });
