import parts from './watch_parts.json';

export const PARTS_LOOKUP = parts;

export const PARTS_MAP = parts.reduce((acc, p) => {
  acc[p.number] = p;
  return acc;
}, {});
