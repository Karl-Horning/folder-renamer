# Folder Renamer

## Table of Contents

- [Folder Renamer](#folder-renamer)
  - [Table of Contents](#table-of-contents)
  - [Introduction](#introduction)
  - [Features](#features)
  - [Project Structure](#project-structure)
  - [Getting Started](#getting-started)
    - [1. Install Dependencies](#1-install-dependencies)
    - [2. Create a `.env` file](#2-create-a-env-file)
    - [3. Add Configuration](#3-add-configuration)
    - [4. Run the Script](#4-run-the-script)
  - [Customisation](#customisation)
  - [Safety Tips](#safety-tips)
  - [License](#license)

## Introduction

A Node.js utility to batch-rename folders by cleaning up and restructuring folder names. It standardises patterns like dates, image counts, and known prefixes — perfect for tidying up messy photo archives or scanned documents.

## Features

- Replaces arbitrary strings using a configurable JSON file
- Normalises dates to `YYYY-MM-DD` format
- Standardises image count patterns like `238x`, `110 photos`, or `x220` → `(x220)`
- Moves known prefixes to the end, wrapped in `[]`
- Moves counts and dates to the end of folder names
- Handles redundant punctuation and whitespace
- All transformations are configurable and extendable

## Project Structure

```text
src/
├── app.js                        # Main entry script
├── data/
│   ├── prefixes.json             # List of known prefixes to move
│   ├── removePatterns.json       # Strings/patterns to strip entirely (e.g. scene tags)
│   └── replacePatterns.json      # Text substitutions (e.g. " - " → ", ")
├── helpers/
│   ├── dates.js                  # Date normalisation utilities
│   ├── loadJSON.js               # Loads and parses JSON config files
│   ├── replacePatterns.js        # Applies text replacement patterns
│   ├── text.js                   # Other text manipulation functions
│   ├── transformName.js          # Full pipeline for renaming logic
│   └── validateEnv.js            # Ensures environment variables are set
```

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Create a `.env` file

```env
DIRECTORY_PATH=/absolute/path/to/folder
```

### 3. Add Configuration

- **`src/data/prefixes.json`**
  A JSON array of prefix strings to move to the end of folder names.

  ```json
  ["MyPhotos", "FamilyPhotos"]
  ```

- **`src/data/removePatterns.json`**
  An array of objects defining strings or regex patterns to strip entirely (the replacement is always an empty string, so it doesn't need to be specified). Use `isRegex: true` for regex patterns and `caseInsensitive: true` to match regardless of case.

  ```json
  [
    { "text": "(digital)", "caseInsensitive": true },
    { "text": "\\b\\d{2,5}px\\b", "isRegex": true }
  ]
  ```

- **`src/data/replacePatterns.json`**
  An array of objects defining text substitutions, where the match is replaced with different text rather than removed. Supports the same `isRegex` and `caseInsensitive` options.

  ```json
  [
    { "text": " - ", "replacement": ", " },
    { "text": ".nl", "replacement": "NL", "caseInsensitive": true }
  ]
  ```

### 4. Run the Script

```bash
npm start
```

## Customisation

- Add or remove strip-only patterns in `removePatterns.json`, and text substitutions in `replacePatterns.json`
- Expand `prefixes.json` to handle more known prefixes
- Extend `transformName()` logic in `helpers/transformName.js` if needed

## Safety Tips

- Backup your files before running.
- This tool performs **in-place renaming**, so changes are irreversible unless you keep backups.

## License

MIT — feel free to use and adapt.
