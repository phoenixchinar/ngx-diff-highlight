
/**
 * Normalizes a single path segment.
 * If the segment is a number, it's converted to a string.
 * Whitespace is trimmed.
 */
export function normalizeDiffSegment(segment: string | number | null | undefined): string | null {
  if (segment === null || segment === undefined) return null;
  const s = String(segment).trim();
  return s === '' ? null : s;
}

/**
 * Normalizes a full path.
 * - Trims whitespace.
 * - Converts ".[index]" to "[index]".
 * - Removes leading/trailing dots.
 * - Removes spaces around separators.
 */
export function normalizeDiffPath(path: string | null | undefined): string | null {
  if (path === null || path === undefined) return null;
  let p = path.trim()
    .replace(/\s*\.\s*/g, '.')
    .replace(/\s*\[\s*/g, '[')
    .replace(/\s*\]\s*/g, ']')
    .replace(/\.\[/g, '[');

  // Convert dot-numeric segments to bracket segments: items.0.name -> items[0].name
  p = p.replace(/\.(\d+)(?=\.|$)/g, '[$1]')
       .replace(/^(\d+)(?=\.|$)/, '[$1]');

  while (p.startsWith('.')) p = p.substring(1);
  while (p.endsWith('.')) p = p.substring(0, p.length - 1);

  return p === '' ? null : p;
}

/**
 * Checks if a string represents a numeric index.
 */
function isNumericIndex(val: string): boolean {
  return /^\d+$/.test(val);
}

/**
 * Joins two path segments correctly.
 * - If child is a number or looks like a numeric index, it joins as `[index]`.
 * - If child starts with `[`, it joins without a dot.
 * - Otherwise, it joins with a dot.
 */
export function joinDiffPath(parent: string | null, child: string | number | null | undefined): string | null {
  const normParent = normalizeDiffPath(parent);
  const normChild = normalizeDiffSegment(child);

  if (!normParent) {
    if (!normChild) return null;
    return isNumericIndex(normChild) ? `[${normChild}]` : normChild;
  }
  if (!normChild) return normParent;

  if (isNumericIndex(normChild) || normChild.startsWith('[')) {
    const segment = normChild.startsWith('[') ? normChild : `[${normChild}]`;
    return normParent + segment;
  }

  return normParent + '.' + normChild;
}

/**
 * Builds a path from an array of segments.
 */
export function buildDiffPath(segments: (string | number | null | undefined)[]): string | null {
  return segments.reduce<string | null>((acc, curr) => joinDiffPath(acc, curr), null);
}

/**
 * Checks if two paths match based on:
 * - Exact match.
 * - Descendant match (candidate starts with target).
 * - Ancestor match (target starts with candidate).
 *
 * Matching must work both downward and upward.
 */
export function pathsMatch(candidate: string | null, target: string | null): boolean {
  if (!candidate || !target) return false;
  if (candidate === target) return true;

  const isMatch = (c: string, t: string) => c.startsWith(t + '.') || c.startsWith(t + '[');

  return isMatch(candidate, target) || isMatch(target, candidate);
}
