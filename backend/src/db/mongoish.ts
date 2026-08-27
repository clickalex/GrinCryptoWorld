/**
 * Minimal MongoDB-compatible document filter / update evaluator.
 * Supports the subset of Mongo query syntax used across the app:
 *   equality, $eq, $ne, $gt, $gte, $lt, $lte, $in, $nin, $exists, $regex,
 *   $or, $and, $nor  |  updates: $set, $unset, $inc, $push, $pull
 */

type Doc = Record<string, any>;

export function getPath(doc: Doc, path: string): any {
  return path.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), doc);
}

export function setPath(doc: Doc, path: string, value: any): void {
  const parts = path.split('.');
  let obj = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof obj[parts[i]] !== 'object' || obj[parts[i]] === null) obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  obj[parts[parts.length - 1]] = value;
}

export function unsetPath(doc: Doc, path: string): void {
  const parts = path.split('.');
  let obj: any = doc;
  for (let i = 0; i < parts.length - 1; i++) {
    obj = obj?.[parts[i]];
    if (!obj) return;
  }
  delete obj[parts[parts.length - 1]];
}

function cmp(a: any, b: any): number {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  return a < b ? -1 : 1;
}

function deepEqual(a: any, b: any): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Mongo equality semantics: matches whole value OR any element of an array field. */
function eqMatch(value: any, operand: any): boolean {
  if (deepEqual(value, operand)) return true;
  if (Array.isArray(value) && value.some((el) => deepEqual(el, operand))) return true;
  return false;
}

export function matches(doc: Doc, filter: Doc = {}): boolean {
  for (const [key, cond] of Object.entries(filter)) {
    if (key === '$or') {
      if (!(cond as Doc[]).some((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$nor') {
      if ((cond as Doc[]).some((sub) => matches(doc, sub))) return false;
      continue;
    }
    if (key === '$and') {
      if (!(cond as Doc[]).every((sub) => matches(doc, sub))) return false;
      continue;
    }

    const value = getPath(doc, key);

    if (cond !== null && typeof cond === 'object' && !Array.isArray(cond)) {
      for (const [op, operand] of Object.entries(cond as Doc)) {
        if (op === '$options') continue; // handled inside $regex
        switch (op) {
          case '$eq': if (!eqMatch(value, operand)) return false; break;
          case '$ne': if (eqMatch(value, operand)) return false; break;
          case '$gt': if (!(cmp(value, operand) > 0)) return false; break;
          case '$gte': if (!(cmp(value, operand) >= 0)) return false; break;
          case '$lt': if (!(cmp(value, operand) < 0)) return false; break;
          case '$lte': if (!(cmp(value, operand) <= 0)) return false; break;
          case '$in':
            if (!Array.isArray(operand) || !operand.some((v) => eqMatch(value, v))) return false;
            break;
          case '$nin':
            if (Array.isArray(operand) && operand.some((v) => eqMatch(value, v))) return false;
            break;
          case '$exists':
            if ((value !== undefined) !== Boolean(operand)) return false;
            break;
          case '$regex': {
            const flags = (cond as any).$options || 'i';
            if (!(typeof value === 'string' && new RegExp(operand as string, flags).test(value))) return false;
            break;
          }
          default: return false;
        }
      }
    } else if (!eqMatch(value, cond)) {
      return false;
    }
  }
  return true;
}

export function applyUpdate(doc: Doc, update: Doc): Doc {
  const hasOps = Object.keys(update).some((k) => k.startsWith('$'));
  if (!hasOps) {
    return { ...doc, ...update };
  }
  const out: Doc = JSON.parse(JSON.stringify(doc));
  for (const [op, payload] of Object.entries(update)) {
    switch (op) {
      case '$set':
        for (const [k, v] of Object.entries(payload as Doc)) setPath(out, k, v);
        break;
      case '$unset':
        for (const k of Object.keys(payload as Doc)) unsetPath(out, k);
        break;
      case '$inc':
        for (const [k, v] of Object.entries(payload as Doc)) {
          const cur = getPath(out, k) ?? 0;
          setPath(out, k, (typeof cur === 'number' ? cur : 0) + (v as number));
        }
        break;
      case '$push': {
        for (const [k, v] of Object.entries(payload as Doc)) {
          const cur = getPath(out, k);
          if (Array.isArray(cur)) cur.push(v);
          else setPath(out, k, [v]);
        }
        break;
      }
      case '$pull': {
        for (const [k, v] of Object.entries(payload as Doc)) {
          const cur = getPath(out, k);
          if (Array.isArray(cur)) {
            setPath(out, k, cur.filter((item) => !deepEqual(item, v)));
          }
        }
        break;
      }
    }
  }
  return out;
}

export function sortDocs<T extends Doc>(docs: T[], sort?: Record<string, 1 | -1>): T[] {
  if (!sort || !Object.keys(sort).length) return docs;
  const entries = Object.entries(sort);
  return [...docs].sort((a, b) => {
    for (const [field, dir] of entries) {
      const res = cmp(getPath(a, field), getPath(b, field));
      if (res !== 0) return res * (dir === -1 ? -1 : 1);
    }
    return 0;
  });
}
