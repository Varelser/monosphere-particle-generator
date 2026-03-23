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
  let sourceHtml = await fs.readFile(sourceHtmlPath, 'utf8');

  // Inject service-worker unregistration script to prevent root SW cache interference
  const swCleanupScript = `<script>
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(regs) {
          regs.forEach(function(r) { if (r.scope.includes('/hp') || r.scope === location.origin + '/') r.unregister(); });
        });
        caches.keys().then(function(names) {
          names.filter(function(n) { return n.startsWith('thought-workbench'); }).forEach(function(n) { caches.delete(n); });
        });
      }
    </script>`;
  sourceHtml = sourceHtml.replace(
    /<script type="module"/,
    swCleanupScript + '\n    <script type="module"'
  );

  await fs.mkdir(pagesDir, { recursive: true });
  await fs.writeFile(targetHtmlPath, sourceHtml, 'utf8');

  // Write noop service worker for /hp/ scope
  const noopSw = `self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter(n => n.startsWith('thought-workbench')).map(n => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});`;
  await fs.writeFile(path.join(pagesDir, 'sw.js'), noopSw, 'utf8');
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
