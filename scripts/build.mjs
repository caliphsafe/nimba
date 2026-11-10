import {cp, mkdir, readdir, rm} from 'node:fs/promises';

await rm('dist', {recursive: true, force: true});
await mkdir('dist');
await cp('assets', 'dist/assets', {recursive: true});
for (const entry of await readdir('.', {withFileTypes: true})) {
  if (entry.isFile() && /\.(html|css|js)$|^robots\.txt$/.test(entry.name)) {
    await cp(entry.name, `dist/${entry.name}`);
  }
}
