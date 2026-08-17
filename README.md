# Folder Renamer

A Node.js CLI that batch-renames folders — cleaning up dates, image counts, and known prefixes so messy photo and scan archives end up consistently named.

## Tech stack

- Node.js (ES modules)
- [dotenv](https://www.npmjs.com/package/dotenv) for environment configuration
- [Vitest](https://vitest.dev/) for testing

## Notable decisions

- **In-place renaming** — folders are renamed directly, with no undo. Back up before running.
- **Remove vs. replace patterns are separate files** — `removePatterns.json` strips text entirely (the replacement is always empty), `replacePatterns.json` substitutes text with something else. Splitting them avoids repeating `"replacement": ""` across dozens of entries.
- **Pattern data isn't committed to git** — `src/data/*.json` holds hand-curated, personal scrubbing rules (scene-release tags, download-site cruft) that don't belong in a public repo. It's gitignored, so each clone builds its own list.

## Local development

```bash
git clone https://github.com/Karl-Horning/folder-renamer.git
cd folder-renamer
npm install
npm start
```

## Configuration

Create a `.env` file in the project root:

```env
DIRECTORY_PATH=/absolute/path/to/folder
```

Three files in `src/data/` drive the transform. None of them ship with defaults, so all three need creating:

- **`prefixes.json`** — array of prefix strings to move to the end of a folder name, wrapped in `[]`.

  ```json
  ["MyPhotos", "FamilyPhotos"]
  ```

- **`removePatterns.json`** — strings or regex patterns to strip entirely. Use `isRegex: true` for regex, `caseInsensitive: true` to match regardless of case.

  ```json
  [
    { "text": "(digital)", "caseInsensitive": true },
    { "text": "\\b\\d{2,5}px\\b", "isRegex": true }
  ]
  ```

- **`replacePatterns.json`** — text substitutions, where the match is replaced with something else rather than removed. Supports the same `isRegex` and `caseInsensitive` options.

  ```json
  [
    { "text": " - ", "replacement": ", " },
    { "text": ".nl", "replacement": "NL", "caseInsensitive": true }
  ]
  ```

## Scripts

| Script | Description |
| --- | --- |
| `npm start` | Run the folder-renaming CLI |
| `npm test` | Run the test suite once |
| `npm run test:watch` | Re-run tests on file changes |

## Feedback and issues

Found a bug or have a suggestion? [Open an issue](https://github.com/Karl-Horning/folder-renamer/issues).

## License

Released under the [MIT License](./LICENSE) by [Karl Horning](https://github.com/Karl-Horning).
