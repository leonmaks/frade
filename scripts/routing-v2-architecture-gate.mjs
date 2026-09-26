import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();

const ROUTING_ROOT = path.join(
  ROOT,
  'packages',
  'draw',
  'src',
  'routing',
);

const DRAW_TESTS_ROOT = path.join(
  ROOT,
  'packages',
  'draw',
  'tests',
);

const CURRENT_CHANGE_FILE = path.join(
  ROOT,
  'docs',
  'routing-v2',
  'CURRENT_CHANGE.md',
);

const REQUIRED_DOCS = [
  'docs/routing-v2/drawio-routing-master-spec.md',
  'docs/routing-v2/implementation-playbook.md',
  'docs/routing-v2/legacy-boundary.md',
  'docs/routing-v2/CURRENT_CHANGE.md',
];

const V2_CORE_DIRS = new Set([
  'model',
  'geometry',
  'terminal',
  'orthogonal',
  'segment',
  'loop',
  'normalization',
  'validation',
  'interaction',
]);

const LEGACY_ALWAYS_PROTECTED = [
  'packages/draw/src/routing/floatingAttachment.ts',
  'packages/draw/src/routing/terminalPolicy.ts',
  'packages/draw/src/routing/manhattanRoute.ts',
  'packages/draw/src/routing/floatingRoute.ts',
  'packages/draw/src/routing/movingRectangleRoute.ts',

  'packages/draw/src/geometry/normalizeRoute.ts',
  'packages/draw/src/geometry/validateManhattanRoute.ts',
  'packages/draw/src/geometry/routeSnapshot.ts',

  'packages/draw/src/segment-editing/segments.ts',
  'packages/draw/src/segment-editing/dragSession.ts',
  'packages/draw/src/segment-editing/segmentDragController.ts',
  'packages/draw/src/segment-editing/resolveSegmentDrag.ts',
  'packages/draw/src/segment-editing/floatingSegments.ts',

  'packages/draw/src/connections/connectionStateMachine.ts',
  'packages/draw/src/connections/connectionTool.ts',
  'packages/draw/src/connections/previewRoute.ts',
];

const R10_INTEGRATION_BOUNDARY = [
  'packages/draw/src/routing/x6RoutingAdapter.ts',
  'packages/draw/src/routing/roundedConnector.ts',

  'packages/draw/src/segment-editing/x6Adapter.ts',

  'packages/draw/src/editor/createGraph.ts',
  'packages/draw/src/editor/DiagramEditor.tsx',

  'packages/draw/src/document/graphAdapter.ts',
  'packages/draw/src/document/schema.ts',
  'packages/draw/src/document/serialize.ts',
  'packages/draw/src/document/fileAdapter.ts',

  'packages/draw/src/visual/api.ts',

  'packages/ui-workspace/src/FradeDiagramView.tsx',
  'packages/ui-workspace/src/repositoryBundles.ts',
  'packages/ui-workspace/src/DiagramView.tsx',
];

const DRAWIO_REFERENCE_PREFIX =
  'apps/desktop/vendor/drawio/';

const blockers = [];
const warnings = [];

main();

function main() {
  verifyRequiredFiles();

  if (!fs.existsSync(ROUTING_ROOT)) {
    block(
      'Routing root not found',
      relative(ROUTING_ROOT),
    );
  }

  const current = readCurrentChange();
  const changedFiles = getChangedFiles(current.baseCommit);

  verifyLegacyQuarantine(current, changedFiles);
  verifyDrawioReferenceUntouched(changedFiles);
  verifyV2CoreArchitecture();
  verifyChangedTests(changedFiles);
  verifyChangedSourceEscapeHatches(changedFiles);

  printResult(current);
}

function verifyRequiredFiles() {
  for (const rel of REQUIRED_DOCS) {
    if (!fs.existsSync(path.join(ROOT, rel))) {
      block('Required Routing V2 control file is missing', rel);
    }
  }
}

function readCurrentChange() {
  if (!fs.existsSync(CURRENT_CHANGE_FILE)) {
    return {
      activeChange: 'UNKNOWN',
      baseCommit: 'NONE',
      phaseNumber: null,
    };
  }

  const content = fs.readFileSync(
    CURRENT_CHANGE_FILE,
    'utf8',
  );

  const activeChange =
    readField(content, 'ACTIVE_CHANGE') ?? 'UNKNOWN';

  const baseCommit =
    readField(content, 'BASE_COMMIT') ?? 'NONE';

  const match =
    /^routing-v2-(\d{2})-/.exec(activeChange);

  const phaseNumber =
    match ? Number(match[1]) : null;

  return {
    activeChange,
    baseCommit,
    phaseNumber,
  };
}

function readField(content, field) {
  const re = new RegExp(
    `^${escapeRegex(field)}:\\s*(.+?)\\s*$`,
    'm',
  );

  return re.exec(content)?.[1]?.trim();
}

function getChangedFiles(baseCommit) {
  if (
    !baseCommit ||
    baseCommit === 'NONE'
  ) {
    return [];
  }

  if (!/^[0-9a-f]{7,40}$/i.test(baseCommit)) {
    block(
      'BASE_COMMIT is not a valid Git SHA',
      baseCommit,
    );

    return [];
  }

  try {
    const stdout = execFileSync(
      'git',
      [
        'diff',
        '--name-only',
        baseCommit,
        '--',
      ],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );

    return stdout
      .split(/\r?\n/)
      .map((x) => normalizePath(x.trim()))
      .filter(Boolean);
  } catch (error) {
    block(
      'Unable to compute Git diff from BASE_COMMIT',
      String(error),
    );

    return [];
  }
}

function verifyLegacyQuarantine(current, changedFiles) {
  if (current.phaseNumber == null) {
    return;
  }

  if (current.phaseNumber >= 1 &&
      current.phaseNumber <= 9) {

    const forbidden = new Set([
      ...LEGACY_ALWAYS_PROTECTED,
      ...R10_INTEGRATION_BOUNDARY,
    ]);

    for (const file of changedFiles) {
      if (forbidden.has(file)) {
        block(
          `R${String(current.phaseNumber).padStart(2, '0')} modified legacy/integration boundary`,
          file,
        );
      }
    }

    return;
  }

  if (current.phaseNumber === 10) {
    const protectedSet =
      new Set(LEGACY_ALWAYS_PROTECTED);

    for (const file of changedFiles) {
      if (protectedSet.has(file)) {
        block(
          'R10 modified protected legacy routing algorithm',
          file,
        );
      }
    }
  }
}

function verifyDrawioReferenceUntouched(changedFiles) {
  for (const file of changedFiles) {
    if (file.startsWith(DRAWIO_REFERENCE_PREFIX)) {
      block(
        'Vendored draw.io reference code was modified',
        file,
      );
    }
  }
}

function verifyV2CoreArchitecture() {
  if (!fs.existsSync(ROUTING_ROOT)) {
    return;
  }

  walk(ROUTING_ROOT, (file) => {
    if (!isSourceFile(file)) {
      return;
    }

    const relFromRouting =
      normalizePath(path.relative(ROUTING_ROOT, file));

    const firstSegment =
      relFromRouting.split('/')[0];

    if (!V2_CORE_DIRS.has(firstSegment)) {
      return;
    }

    const content = fs.readFileSync(
      file,
      'utf8',
    );

    const rel = relative(file);

    const forbiddenFrameworkRules = [
      [
        /from\s+['"]react(?:\/[^'"]*)?['"]/,
        'React import inside V2 routing core',
      ],
      [
        /from\s+['"]react-dom(?:\/[^'"]*)?['"]/,
        'React DOM import inside V2 routing core',
      ],
      [
        /from\s+['"]@antv\/x6(?:\/[^'"]*)?['"]/,
        'AntV X6 import inside V2 routing core',
      ],
      [
        /from\s+['"]electron(?:\/[^'"]*)?['"]/,
        'Electron import inside V2 routing core',
      ],
      [
        /\bwindow\b/,
        'window usage inside V2 routing core',
      ],
      [
        /\bdocument\b/,
        'document usage inside V2 routing core',
      ],
      [
        /\bdevicePixelRatio\b/,
        'devicePixelRatio usage inside V2 routing core',
      ],
      [
        /\brequestAnimationFrame\b/,
        'requestAnimationFrame usage inside V2 routing core',
      ],
      [
        /\bMath\.random\s*\(/,
        'Math.random usage inside deterministic V2 routing core',
      ],
    ];

    for (const [re, reason] of forbiddenFrameworkRules) {
      reportMatches(
        content,
        re,
        reason,
        rel,
        blockers,
      );
    }

    const forbiddenLegacyImports = [
      'floatingAttachment',
      'terminalPolicy',
      'manhattanRoute',
      'floatingRoute',
      'movingRectangleRoute',
      'x6RoutingAdapter',
      'roundedConnector',
      'segment-editing',
      'connections/previewRoute',
    ];

    for (const legacyName of forbiddenLegacyImports) {
      const re = new RegExp(
        `from\\s+['"][^'"]*${escapeRegex(legacyName)}[^'"]*['"]`,
      );

      reportMatches(
        content,
        re,
        `V2 routing core imports legacy implementation: ${legacyName}`,
        rel,
        blockers,
      );
    }

    const adapterImport =
      /from\s+['"][^'"]*adapters\/x6[^'"]*['"]/;

    reportMatches(
      content,
      adapterImport,
      'V2 routing core depends on X6 adapter layer',
      rel,
      blockers,
    );

    const directPointMutation =
      /\.points\s*\[[^\]]+\]\s*=/g;

    reportMatches(
      content,
      directPointMutation,
      'Possible direct mutation of route points; review semantic-state contract',
      rel,
      warnings,
    );
  });
}

function verifyChangedTests(changedFiles) {
  for (const rel of changedFiles) {
    if (!isRoutingRelatedTest(rel)) {
      continue;
    }

    const absolute = path.join(ROOT, rel);

    if (!fs.existsSync(absolute)) {
      continue;
    }

    const content = fs.readFileSync(
      absolute,
      'utf8',
    );

    const rules = [
      [
        /\b(?:test|it|describe)\.skip\s*\(/g,
        'Skipped routing test',
      ],
      [
        /\b(?:test|it|describe)\.only\s*\(/g,
        'Focused .only routing test',
      ],
      [
        /@ts-nocheck/g,
        '@ts-nocheck in routing test',
      ],
      [
        /@ts-ignore/g,
        '@ts-ignore in routing test',
      ],
    ];

    for (const [re, reason] of rules) {
      reportMatches(
        content,
        re,
        reason,
        rel,
        blockers,
      );
    }
  }

  const routingV2Tests =
    path.join(DRAW_TESTS_ROOT, 'routing-v2');

  if (fs.existsSync(routingV2Tests)) {
    walk(routingV2Tests, (file) => {
      if (!isSourceFile(file)) {
        return;
      }

      const content =
        fs.readFileSync(file, 'utf8');

      const rel = relative(file);

      for (const [re, reason] of [
        [
          /\b(?:test|it|describe)\.skip\s*\(/g,
          'Skipped Routing V2 test',
        ],
        [
          /\b(?:test|it|describe)\.only\s*\(/g,
          'Focused .only Routing V2 test',
        ],
      ]) {
        reportMatches(
          content,
          re,
          reason,
          rel,
          blockers,
        );
      }
    });
  }
}

function verifyChangedSourceEscapeHatches(changedFiles) {
  for (const rel of changedFiles) {
    if (!isSourcePath(rel)) {
      continue;
    }

    const absolute = path.join(ROOT, rel);

    if (!fs.existsSync(absolute)) {
      continue;
    }

    const content =
      fs.readFileSync(absolute, 'utf8');

    for (const [re, reason] of [
      [
        /@ts-nocheck/g,
        '@ts-nocheck introduced in changed source',
      ],
      [
        /@ts-ignore/g,
        '@ts-ignore introduced in changed source',
      ],
    ]) {
      reportMatches(
        content,
        re,
        reason,
        rel,
        blockers,
      );
    }
  }
}

function isRoutingRelatedTest(rel) {
  const p = normalizePath(rel);

  return (
    p.startsWith('packages/draw/tests/') ||
    p.startsWith('packages/ui-workspace/tests/') ||
    p.startsWith('apps/desktop/tests/') ||
    p.startsWith('tests/contract/')
  );
}

function isSourcePath(rel) {
  return /\.(?:ts|tsx|mts|cts)$/.test(rel);
}

function isSourceFile(file) {
  return isSourcePath(file);
}

function walk(dir, visitor) {
  for (
    const entry of fs.readdirSync(
      dir,
      { withFileTypes: true },
    )
  ) {
    if (
      entry.name === 'node_modules' ||
      entry.name === 'dist' ||
      entry.name === 'build' ||
      entry.name === 'coverage' ||
      entry.name === '.git'
    ) {
      continue;
    }

    const full =
      path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full, visitor);
    } else {
      visitor(full);
    }
  }
}

function reportMatches(
  content,
  regex,
  reason,
  file,
  destination,
) {
  regex.lastIndex = 0;

  let match;

  while ((match = regex.exec(content)) !== null) {
    destination.push({
      file,
      line: lineAt(content, match.index),
      reason,
    });

    if (!regex.global) {
      break;
    }
  }
}

function lineAt(content, index) {
  return content
    .slice(0, index)
    .split('\n')
    .length;
}

function relative(file) {
  return normalizePath(
    path.relative(ROOT, file),
  );
}

function normalizePath(value) {
  return value.replaceAll('\\', '/');
}

function block(reason, file) {
  blockers.push({
    file,
    line: null,
    reason,
  });
}

function escapeRegex(value) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
}

function printResult(current) {
  console.log(
    `ACTIVE_CHANGE: ${current.activeChange}`,
  );

  if (warnings.length > 0) {
    console.log('\nWARNINGS:\n');

    for (const item of warnings) {
      console.log(formatFinding('WARN', item));
    }
  }

  if (blockers.length > 0) {
    console.error('\nGATE_STATUS: FAIL\n');

    for (const item of blockers) {
      console.error(formatFinding('FAIL', item));
    }

    process.exit(1);
  }

  console.log('\nGATE_STATUS: PASS');
}

function formatFinding(prefix, finding) {
  const line =
    finding.line == null
      ? ''
      : `:${finding.line}`;

  return (
    `${prefix} ${finding.file}${line}` +
    ` — ${finding.reason}`
  );
}
