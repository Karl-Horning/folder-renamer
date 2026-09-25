# Folder Renamer

Batch-renames folders to clean up dates, image counts and known prefixes. It runs from the command line or as a desktop app.

## Screenshots and demo

![Folder Renamer after a batch, with four folders renamed and one error](public/demo.png)

## Tech stack

- [Node.js](https://nodejs.org/) (ES modules)
- [Electron](https://www.electronjs.org/)
- [electron-builder](https://www.electron.build/)
- [electron-store](https://www.npmjs.com/package/electron-store)
- [dotenv](https://www.npmjs.com/package/dotenv)
- [Vitest](https://vitest.dev/)
- [Playwright](https://playwright.dev/)
- [ESLint](https://eslint.org/) and [Prettier](https://prettier.io/)

## Notable decisions

- **In-place renaming:** renames are permanent. Back up before running.
- **The desktop app keeps its own copy of the rules:** it copies `src/data/` to its userData folder on first run, so app updates keep your rules. A build includes the rule files in `src/data/` on the machine that built it.
- **Preview shows target names only:** collisions show as errors when the batch runs.
- **The app icon comes from `design/assets.af`:** an Affinity Designer file exported to `build/icon.png`.

## Local development

```bash
git clone https://github.com/Karl-Horning/folder-renamer.git
cd folder-renamer
npm install
```

[prose-lint](https://github.com/Karl-Horning/prose-lint) checks the writing in comments and docs. It's a private repo, so remove it before installing if you don't have access. The app doesn't use it.

```bash
npm pkg delete devDependencies.prose-lint
rm prose-lint.test.js
npm install
```

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Run the CLI |
| `npm run electron` | Run the desktop app |
| `npm run dist` | Build a distributable `.app` |
| `npm test` | Run the unit tests and prose checks once |
| `npm run test:watch` | Re-run the unit tests on file changes |
| `npm run test:e2e` | Launch the desktop app and drive it end-to-end |
| `npm run lint` | Lint the codebase |
| `npm run format` | Format the codebase with Prettier |

## Configuration

Three JSON files in `src/data/` hold the rename rules. Rule files are gitignored, so create your own.

- **`prefixes.json`:** prefixes to move from the start of a folder name to the end, in square brackets.

  ```json
  ["MyPhotos", "FamilyPhotos"]
  ```

- **`removePatterns.json`:** strings or regex patterns to strip. Set `isRegex: true` for a regex. Set `caseInsensitive: true` to match any case.

  ```json
  [
    { "text": "(digital)", "caseInsensitive": true },
    { "text": "\\b\\d{2,5}px\\b", "isRegex": true }
  ]
  ```

- **`replacePatterns.json`:** text to replace. It takes the same `isRegex` and `caseInsensitive` options.

  ```json
  [
    { "text": " - ", "replacement": ", " },
    { "text": ".nl", "replacement": "NL", "caseInsensitive": true }
  ]
  ```

The CLI reads the folder to rename from a `.env` file in the project root:

```env
DIRECTORY_PATH=/absolute/path/to/folder
```

Then run the CLI. Add `-- --dry-run` to list what would be renamed.

```bash
npm start
```

## Desktop app

The desktop app runs the same rename logic on a folder you choose. Its settings and rule files are in `~/Library/Application Support/Folder Renamer/`.

```bash
npm run electron
```

Click **Choose…** or drag a folder onto the path. **Reveal Config Folder** opens the rule files. **Preview** lists the changes. **Process Batch** renames the folders.

| Shortcut | Action |
| --- | --- |
| `Cmd+O` | Choose Folder |
| `Cmd+Shift+P` | Preview |
| `Cmd+Return` | Process Batch |
| `Cmd+Shift+R` | Reveal Config Folder |

## Feedback and issues

Found a bug or have a suggestion? [Open an issue](https://github.com/Karl-Horning/folder-renamer/issues).

## License

Released under the [MIT License](./LICENSE) by [Karl Horning](https://github.com/Karl-Horning).
