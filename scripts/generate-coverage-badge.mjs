import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import istanbulCoverage from 'istanbul-lib-coverage';

const { createCoverageMap } = istanbulCoverage;

const coverageDir = process.argv[2] ?? 'coverage/ngx-diff-highlight/coverage-final.json';
const outputFile = process.argv[3] ?? 'demo/public/coverage-badge.json';

const rawCoverage = JSON.parse(await readFile(coverageDir, 'utf8'));
const summary = createCoverageMap(rawCoverage).getCoverageSummary();
const percent = Math.round(summary.lines.pct);

const badge = {
  schemaVersion: 1,
  label: 'coverage',
  message: `${percent}%`,
  color: pickColor(percent),
};

await mkdir(path.dirname(outputFile), { recursive: true });
await writeFile(outputFile, `${JSON.stringify(badge, null, 2)}\n`, 'utf8');

function pickColor(percent) {
  if (percent >= 95) return 'brightgreen';
  if (percent >= 90) return 'green';
  if (percent >= 80) return 'yellowgreen';
  if (percent >= 70) return 'yellow';
  if (percent >= 60) return 'orange';
  return 'red';
}
