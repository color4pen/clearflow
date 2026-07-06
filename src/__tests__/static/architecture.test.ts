/**
 * Architecture test（歯）— design/static/ の許可依存を実装に強制する。
 *
 * design/rules.json（`aozu export rules` の出力）を正本として:
 *   1. src/ 配下の全実装ファイルがいずれかのモジュールにマップされる（fail-closed）
 *   2. モジュール間の import エッジ（type-only・dynamic import 含む）が許可依存に列挙されている
 *   3. rules.json が設計文書と乖離していない（`aozu export rules --verify`）
 *
 * 契約: aozu spec/integration.md §3
 */

import { describe, it, expect } from "bun:test";
import { readdirSync, readFileSync, existsSync } from "fs";
import { join, resolve, relative, dirname } from "path";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const SRC_DIR = join(REPO_ROOT, "src");
const RULES_PATH = join(REPO_ROOT, "design", "rules.json");

interface Ruleset {
  "format-version": number;
  modules: string[];
  paths: Record<string, string[]>;
  allowed: [string, string][];
}

const ruleset: Ruleset = JSON.parse(readFileSync(RULES_PATH, "utf-8"));
const allowedSet = new Set(ruleset.allowed.map(([from, to]) => `${from} -> ${to}`));

/** src/ 配下の実装ファイル（テスト・型宣言を除く）を列挙する。 */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__") continue;
      collectSourceFiles(fullPath, out);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.(ts|tsx)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      out.push(fullPath);
    }
  }
  return out;
}

/** import / export-from / dynamic import の参照先を抽出する。 */
function scanImports(content: string): { from: string; line: number }[] {
  const results: { from: string; line: number }[] = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const staticMatch = /\bfrom\s+["']([^"']+)["']/.exec(line);
    if (staticMatch && /\b(import|export)\b/.test(line)) {
      results.push({ from: staticMatch[1]!, line: i + 1 });
    }
    const dynamicMatch = /\bimport\(\s*["']([^"']+)["']\s*\)/.exec(line);
    if (dynamicMatch) {
      results.push({ from: dynamicMatch[1]!, line: i + 1 });
    }
  }
  return results;
}

/**
 * import 指定子をリポジトリ相対パスへ解決する。
 * `@/` エイリアス（tsconfig: `@/*` → `./src/*`）と相対パスのみ対象。
 * パッケージ import は null。
 */
function resolveSpecifier(importingFile: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) {
    return join("src", specifier.slice(2));
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return relative(REPO_ROOT, resolve(dirname(importingFile), specifier));
  }
  return null;
}

/**
 * ファイルパスをモジュールへ解決する（最長プレフィクス一致）。
 * 拡張子省略・ディレクトリ import に対応するため候補パスを展開して照合する。
 */
function findModule(filePath: string): string | null {
  const candidates = [
    filePath,
    `${filePath}.ts`,
    `${filePath}.tsx`,
    `${filePath}/index.ts`,
    `${filePath}/index.tsx`,
  ];
  let bestModule: string | null = null;
  let bestLength = -1;
  for (const [moduleId, prefixes] of Object.entries(ruleset.paths)) {
    for (const prefix of prefixes) {
      for (const candidate of candidates) {
        if (candidate.startsWith(prefix) && prefix.length > bestLength) {
          bestModule = moduleId;
          bestLength = prefix.length;
        }
      }
    }
  }
  return bestModule;
}

describe("architecture: design/static/ と実装の突合", () => {
  const sourceFiles = collectSourceFiles(SRC_DIR);

  it("実装ファイルが存在する", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it("全実装ファイルがいずれかのモジュールにマップされる（fail-closed）", () => {
    const unmapped = sourceFiles
      .map((f) => relative(REPO_ROOT, f))
      .filter((f) => findModule(f) === null);
    expect(
      unmapped,
      `design/static/modules.md の実装: 行にマップされないファイル:\n${unmapped.join("\n")}`
    ).toEqual([]);
  });

  it("モジュール間依存がすべて許可依存に列挙されている", () => {
    const violations: string[] = [];
    for (const file of sourceFiles) {
      const relPath = relative(REPO_ROOT, file);
      const fromModule = findModule(relPath);
      if (fromModule === null) continue; // 前のテストで検出済み
      for (const ref of scanImports(readFileSync(file, "utf-8"))) {
        const resolved = resolveSpecifier(file, ref.from);
        if (resolved === null || !resolved.startsWith("src/")) continue;
        const toModule = findModule(resolved);
        if (toModule === null) {
          violations.push(`${relPath}:${ref.line} -> ${resolved}（未マップ）`);
          continue;
        }
        if (toModule === fromModule) continue;
        if (!allowedSet.has(`${fromModule} -> ${toModule}`)) {
          violations.push(
            `${relPath}:${ref.line} — ${fromModule} -> ${toModule}（${ref.from}）は design/static/dependencies.md に無い`
          );
        }
      }
    }
    expect(violations, `許可されない依存:\n${violations.join("\n")}`).toEqual([]);
  });

  it("rules.json が設計文書と一致する（aozu export rules --verify）", () => {
    const aozuBin = join(REPO_ROOT, "node_modules", ".bin", "aozu");
    expect(existsSync(aozuBin), "@color4pen/aozu が devDependency に無い").toBe(true);
    const result = Bun.spawnSync([aozuBin, "export", "rules", "--verify"], {
      cwd: REPO_ROOT,
    });
    const stderr = result.stderr.toString();
    expect(
      result.exitCode,
      `rules.json が design/static/ と乖離している。再生成: bunx aozu export rules --out design/rules.json\n${stderr}`
    ).toBe(0);
  });
});
