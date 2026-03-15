import fs from 'node:fs/promises';
import path from 'node:path';

const workspaceRoot = process.cwd();
const distDir = path.join(workspaceRoot, 'dist');
const pagesDir = path.join(distDir, 'hp');
const sourceHtmlPath = path.join(distDir, 'index.html');
const targetHtmlPath = path.join(pagesDir, 'kalokagathia.html');
const sourceAssetsPath = path.join(distDir, 'assets');
const targetAssetsPath = path.join(pagesDir, 'assets');
const noJekyllPath = path.join(distDir, '.nojekyll');

async function main() {
  const sourceHtml = await fs.readFile(sourceHtmlPath, 'utf8');

  await fs.mkdir(pagesDir, { recursive: true });
  await fs.writeFile(targetHtmlPath, sourceHtml, 'utf8');
  await fs.cp(sourceAssetsPath, targetAssetsPath, { recursive: true });
  await fs.writeFile(noJekyllPath, '', 'utf8');

  console.log(JSON.stringify({
    source: path.relative(workspaceRoot, sourceHtmlPath),
    target: path.relative(workspaceRoot, targetHtmlPath),
    assets: path.relative(workspaceRoot, targetAssetsPath),
    noJekyll: path.relative(workspaceRoot, noJekyllPath),
    passed: true,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
