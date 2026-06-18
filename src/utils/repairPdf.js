import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// ---------------------------------------------------------------------------
// Customer-facing repair report PDF.
//
// This module is intentionally environment-agnostic: the actual layout lives in
// `buildRepairDoc`, which takes a fully-resolved image map and never touches
// the DOM. The browser entry point `generateRepairPdf` resolves the watch's
// photos to data URLs first, then delegates. The same `buildRepairDoc` is
// reused by a Node script to produce sample output.
// ---------------------------------------------------------------------------

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

const GOLD = [176, 137, 58];
const INK = [38, 36, 34];
const MUTED = [120, 113, 108];
const LINE = [223, 219, 214];
const HEADBG = [33, 31, 29];

const fmtRate = (v) => {
  if (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return (n >= 0 ? '+' : '') + n.toFixed(1) + ' s/d';
};

const HORIZONTAL_POSITIONS = ['Dial Up', 'DU', 'Dial Down', 'DD'];

function sessionSummary(session) {
  const rates = (session.readings || [])
    .filter((r) => r.rate !== null && r.rate !== undefined && r.rate !== '')
    .map((r) => Number(r.rate));
  const avgRate = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  const variation = rates.length > 1 ? Math.max(...rates) - Math.min(...rates) : null;
  return { avgRate, variation };
}

/**
 * Build the repair report into a jsPDF document.
 *
 * @param {object} watch  Full watch/repair object (with photos, parts, timingSessions).
 * @param {Record<string, {dataUrl: string, width: number, height: number}>} images
 *        Map of photo filename -> resolved image data. Missing entries are skipped.
 * @param {object} [opts]
 * @param {string} [opts.shopName] Business name shown in the header.
 * @returns {jsPDF}
 */
export function buildRepairDoc(watch, images = {}, opts = {}) {
  const shopName = opts.shopName || 'Watch Repair Report';
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

  let y = 0;

  const setColor = (rgb) => doc.setTextColor(rgb[0], rgb[1], rgb[2]);

  const footer = () => {
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      setColor(MUTED);
      doc.text(
        `Repair #${watch.id ?? ''}`,
        MARGIN,
        PAGE_H - 8
      );
      doc.text(
        `Page ${i} of ${pages}`,
        PAGE_W - MARGIN,
        PAGE_H - 8,
        { align: 'right' }
      );
    }
  };

  const ensureSpace = (needed) => {
    if (y + needed > PAGE_H - 16) {
      doc.addPage();
      y = MARGIN;
    }
  };

  // `minContent` reserves room for the heading *and* the first block of its
  // content, so a heading is never left stranded at the bottom of a page while
  // its content flows onto the next one.
  const sectionHeading = (title, minContent = 10) => {
    ensureSpace(13 + minContent);
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setColor(INK);
    doc.text(title, MARGIN, y);
    y += 2.5;
    doc.setDrawColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y, MARGIN + 26, y);
    doc.setDrawColor(LINE[0], LINE[1], LINE[2]);
    doc.setLineWidth(0.2);
    doc.line(MARGIN + 26, y, PAGE_W - MARGIN, y);
    y += 6;
  };

  // ---- Header band -------------------------------------------------------
  doc.setFillColor(HEADBG[0], HEADBG[1], HEADBG[2]);
  doc.rect(0, 0, PAGE_W, 30, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text(shopName, MARGIN, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(225, 222, 218);
  doc.text('Service Report', MARGIN, 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
  doc.text(`Repair #${watch.id ?? ''}`, PAGE_W - MARGIN, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(190, 186, 181);
  const created = watch.createdAt ? new Date(watch.createdAt).toLocaleDateString() : '';
  const issued = new Date().toLocaleDateString();
  if (created) doc.text(`Received: ${created}`, PAGE_W - MARGIN, 20, { align: 'right' });
  doc.text(`Issued: ${issued}`, PAGE_W - MARGIN, 25.5, { align: 'right' });

  y = 40;

  // ---- Customer + status -------------------------------------------------
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  setColor(MUTED);
  doc.text('PREPARED FOR', MARGIN, y);
  if (watch.status) {
    doc.text('STATUS', PAGE_W - MARGIN, y, { align: 'right' });
  }
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  setColor(INK);
  doc.text(watch.customerName || 'Customer', MARGIN, y);
  if (watch.status) {
    doc.setFontSize(12);
    doc.setTextColor(GOLD[0], GOLD[1], GOLD[2]);
    doc.text(String(watch.status), PAGE_W - MARGIN, y, { align: 'right' });
  }
  y += 8;

  // ---- Watch details -----------------------------------------------------
  const watchRows = [
    ['Brand', watch.brand],
    ['Model', watch.model],
    ['Serial Number', watch.serialNumber],
    ['Year Made', watch.yearMade],
    ['Dial Color', watch.dialColor],
    ['Estimated Completion', watch.estimatedCompletion],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  if (watchRows.length) {
    sectionHeading('Watch Details', 18);
    drawFieldGrid(doc, watchRows, y, { MARGIN, CONTENT_W, INK, MUTED, LINE });
    y = drawFieldGrid.lastY;
    y += 2;
  }

  // ---- Movement details --------------------------------------------------
  const movementRows = [
    ['Movement', watch.movementName],
    ['Manufacturer', watch.manufacturer],
    ['Caliber', watch.caliber],
    ['Jewels', watch.jewels],
    ['Movement Type', watch.movementType],
    ['Frequency', watch.frequency ? `${watch.frequency} bph` : null],
    ['Lift Angle', watch.liftAngle ? `${watch.liftAngle}°` : null],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '');

  if (movementRows.length) {
    sectionHeading('Movement Details', 18);
    drawFieldGrid(doc, movementRows, y, { MARGIN, CONTENT_W, INK, MUTED, LINE });
    y = drawFieldGrid.lastY;
    y += 2;
  }

  // ---- Timing / readings -------------------------------------------------
  const sessions = (watch.timingSessions || []).filter((s) => (s.readings || []).length);
  if (sessions.length) {
    // Reserve heading + first session header + table head + a row.
    sectionHeading('Timing Results', 30);
    sessions.forEach((session) => {
      const { avgRate, variation } = sessionSummary(session);
      ensureSpace(34);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setColor(INK);
      const dateStr = session.createdAt ? new Date(session.createdAt).toLocaleDateString() : 'Session';
      doc.text(dateStr, MARGIN, y);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setColor(MUTED);
      const meta = [];
      if (session.liftAngle) meta.push(`Lift angle ${session.liftAngle}°`);
      meta.push(`Avg ${fmtRate(avgRate)}`);
      if (variation !== null) meta.push(`Variation ${variation.toFixed(1)} s/d`);
      doc.text(meta.join('     '), PAGE_W - MARGIN, y, { align: 'right' });
      y += 2.5;
      if (session.notes) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8.5);
        setColor(MUTED);
        doc.text(String(session.notes), MARGIN, y + 2);
        y += 3.5;
      }
      y += 2;

      autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Position', 'Rate (s/day)', 'Beat Error (ms)']],
        body: (session.readings || []).map((r) => [
          r.position || '—',
          r.rate !== null && r.rate !== undefined && r.rate !== '' ? fmtRate(r.rate) : '—',
          r.beatError !== null && r.beatError !== undefined && r.beatError !== '' ? `${r.beatError}` : '—',
        ]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.1 },
        headStyles: { fillColor: HEADBG, textColor: [235, 232, 228], fontStyle: 'bold' },
        columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      });
      y = doc.lastAutoTable.finalY + 6;
    });
  }

  // ---- Parts (no pricing) ------------------------------------------------
  const parts = watch.parts || [];
  if (parts.length) {
    // Reserve heading + table head + first row.
    sectionHeading('Parts', 22);
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Part Number', 'Description', 'Vendor', 'Date Ordered', 'Status']],
      body: parts.map((p) => [
        p.partNumber || '—',
        p.description || '—',
        p.vendor || '—',
        p.dateOrdered || '—',
        p.received ? 'Received' : 'On order',
      ]),
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0.1 },
      headStyles: { fillColor: HEADBG, textColor: [235, 232, 228], fontStyle: 'bold' },
      columnStyles: { 0: { font: 'courier' } },
    });
    y = doc.lastAutoTable.finalY + 6;
  }

  // ---- Notes -------------------------------------------------------------
  if (watch.notes) {
    sectionHeading('Notes', 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setColor(INK);
    const lines = doc.splitTextToSize(String(watch.notes), CONTENT_W);
    lines.forEach((ln) => {
      ensureSpace(6);
      doc.text(ln, MARGIN, y);
      y += 5;
    });
    y += 2;
  }

  // ---- Photos ------------------------------------------------------------
  const photos = (watch.photos || []).filter((p) => images[p.filename]);
  if (photos.length) {
    const cols = 3;
    const gap = 6;
    const colW = (CONTENT_W - gap * (cols - 1)) / cols;
    const imgBoxH = 38;
    const captionH = 9;
    const rowH = imgBoxH + captionH;
    // Reserve heading + at least one full row of photos so the heading is never
    // stranded on a page by itself.
    sectionHeading('Photos', rowH + 4);

    photos.forEach((photo, i) => {
      const col = i % cols;
      if (col === 0) ensureSpace(rowH + 2);
      const x = MARGIN + col * (colW + gap);
      const img = images[photo.filename];

      // Fit image inside box preserving aspect ratio.
      const ar = img.width && img.height ? img.width / img.height : 4 / 3;
      let dw = colW;
      let dh = dw / ar;
      if (dh > imgBoxH) {
        dh = imgBoxH;
        dw = dh * ar;
      }
      const ix = x + (colW - dw) / 2;
      const iy = y + (imgBoxH - dh) / 2;

      doc.setFillColor(245, 244, 242);
      doc.rect(x, y, colW, imgBoxH, 'F');
      try {
        doc.addImage(img.dataUrl, 'JPEG', ix, iy, dw, dh);
      } catch (e) {
        // Skip images jsPDF cannot decode.
      }

      const label = photo.caption || photo.category || '';
      if (label) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        setColor(MUTED);
        const t = doc.splitTextToSize(label, colW)[0];
        doc.text(t, x, y + imgBoxH + 4);
      }

      if (col === cols - 1 || i === photos.length - 1) {
        y += rowH + 2;
      }
    });
  }

  footer();
  return doc;
}

// Draw a two-column label/value grid. Stores the resulting y on `.lastY`.
function drawFieldGrid(doc, rows, startY, { MARGIN, CONTENT_W, INK, MUTED, LINE }) {
  const cols = 2;
  const colGap = 10;
  const colW = (CONTENT_W - colGap) / cols;
  const rowH = 9;
  let y = startY;

  rows.forEach((row, i) => {
    const col = i % cols;
    const x = MARGIN + col * (colW + colGap);
    if (col === 0 && i > 0) y += rowH;
    if (col === 0) {
      // light separator under each pair-row
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(String(row[0]).toUpperCase(), x, y);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    doc.text(String(row[1]), x, y + 5);
  });

  // account for last row height
  const usedRows = Math.ceil(rows.length / cols);
  drawFieldGrid.lastY = startY + usedRows * rowH;
}

// ---------------------------------------------------------------------------
// Browser entry point
// ---------------------------------------------------------------------------

// Resolve an image URL to a JPEG data URL with natural dimensions.
function loadImageData(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        // Cap dimension to keep PDF size reasonable.
        const maxDim = 1200;
        let { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, maxDim / Math.max(w, h));
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.82), width: w, height: h });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Generate (and download) a customer-facing PDF for a repair in the browser.
 * @param {object} watch Full watch object including photos/parts/timingSessions.
 * @param {object} [opts] { shopName }
 */
export async function generateRepairPdf(watch, opts = {}) {
  const images = {};
  await Promise.all(
    (watch.photos || []).map(async (photo) => {
      const data = await loadImageData(`/uploads/${photo.filename}`);
      if (data) images[photo.filename] = data;
    })
  );

  const doc = buildRepairDoc(watch, images, opts);
  const safeName = (watch.customerName || 'customer').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
  doc.save(`repair-${watch.id}-${safeName || 'report'}.pdf`);
}
