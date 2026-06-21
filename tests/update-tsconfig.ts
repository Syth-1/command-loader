import { copyFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";

const testsDir = join(process.cwd(), "tests");
const templateTsconfig = join(testsDir, "_template_", "tsconfig.json");

const testGlob = new Bun.Glob("*/*.test.ts");

const seen = new Set<string>();

for await (const testFile of testGlob.scan({
  cwd: testsDir,
  absolute: false,
  onlyFiles: true,
})) {
  const packageDir = dirname(testFile);
  const packageName = packageDir.split(/[\\/]/).at(-1)!;

  if (packageName.startsWith("_")) continue;
  if (seen.has(packageDir)) continue;

  seen.add(packageDir);

  const targetDir = join(testsDir, packageDir);

  await copyFile(templateTsconfig, join(targetDir, "tsconfig.json"));

  console.log(`Copied tsconfig.json -> ${relative(process.cwd(), targetDir)}/tsconfig.json`);
}

console.log(`Done. Copied ${seen.size}.`);