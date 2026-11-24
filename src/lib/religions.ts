/**
 * Philippine religious affiliations (PSA census-aligned) used by every form
 * and report filter. Values are deduplicated and kept in a stable order.
 */
export const PHILIPPINE_RELIGIONS = [
  "Islam",
  "Roman Catholic",
  "Iglesia ni Cristo",
  "Evangelical Christian",
  "Seventh-day Adventist",
  "Baptist",
  "United Church of Christ in the Philippines (UCCP)",
  "Aglipayan (Philippine Independent Church)",
  "Jehovah's Witnesses",
  "The Church of Jesus Christ of Latter-day Saints",
  "Born Again Christian",
  "Methodist",
  "Pentecostal",
  "Lutheran",
  "Episcopalian / Anglican",
  "Presbyterian",
  "Church of Christ",
  "Members Church of God International (MCGI)",
  "Jesus Is Lord Church (JIL)",
  "Victory Christian Fellowship",
  "Buddhism",
  "Hinduism",
  "Judaism",
  "Indigenous / Tribal Belief (Lumad / Ancestral)",
  "Other Religious Affiliation",
] as const;

/** Lowercase, accent-free, punctuation-free comparison key. */
export function normalizeReligion(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Keeps user-typed denominations clean without mangling apostrophes. */
export function toReligionTitleCase(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(^|[\s\-/(&.,])([a-z])/g,
      (_match, separator: string, letter: string) => `${separator}${letter.toUpperCase()}`,
    );
}

/** Legacy spellings that should resolve to the same standardized option. */
const ALIAS_GROUPS: readonly string[][] = [
  ["Roman Catholic", "Catholic", "Catholicism", "Roman Catholic Church", "RC"],
  [
    "Evangelical Christian",
    "Born Again Christian",
    "Christian",
    "Christianity",
    "Evangelical",
    "Born Again",
    "Evangelical Christianity",
  ],
  ["Islam", "Muslim", "Islamic"],
  ["Iglesia ni Cristo", "INC"],
  ["Seventh-day Adventist", "Adventist"],
  ["Jehovah's Witnesses", "Jehovah Witness"],
  ["The Church of Jesus Christ of Latter-day Saints", "LDS", "Mormon"],
  ["United Church of Christ in the Philippines (UCCP)", "UCCP"],
  ["Aglipayan (Philippine Independent Church)", "Aglipayan", "Philippine Independent Church"],
  ["Members Church of God International (MCGI)", "MCGI"],
  ["Jesus Is Lord Church (JIL)", "JIL"],
  ["Episcopalian / Anglican", "Episcopalian", "Anglican"],
  ["Indigenous / Tribal Belief (Lumad / Ancestral)", "Indigenous", "Tribal", "Lumad", "Ancestral"],
  ["Other Religious Affiliation", "Other"],
];

const RESOLVED_ALIASES = ALIAS_GROUPS.map((group) => group.map(normalizeReligion));

/**
 * Case-insensitive, normalized comparison. An empty filter matches everything.
 * Selecting "Roman Catholic" also matches legacy "Catholic"/"catholic", and
 * "Evangelical Christian"/"Born Again Christian" match legacy "Christian".
 */
export function sameReligion(
  value: string | null | undefined,
  filter: string | null | undefined,
): boolean {
  if (!filter?.trim()) return true;
  const left = normalizeReligion(value);
  if (!left) return false;
  const right = normalizeReligion(filter);
  if (left === right) return true;
  return RESOLVED_ALIASES.some((group) => group.includes(left) && group.includes(right));
}
