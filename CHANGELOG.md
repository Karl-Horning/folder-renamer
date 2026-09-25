# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

Add new entries here as they're merged, then rename this section when the release is ready.

## [1.0.0] - 2026-09-25

Initial release.

### Added

- A CLI that renames the subfolders of the folder set in `.env`
- Dates converted to `(YYYY-MM-DD)`, from US, European, dotted, ordinal and written-out formats
- Image counts converted to `(x123)` and moved to the end with the date
- Prefixes moved from the start of a name to the end, in square brackets
- Remove and replace patterns from JSON files, with regex and case-insensitive options
- A `--dry-run` option
- A desktop app with Preview and Process Batch
- A **Choose…** button and drag-and-drop for picking the folder
- A File menu with Choose Folder, Preview, Process Batch and Reveal Config Folder, plus Window and Help menus
- Keyboard shortcuts, using Cmd on macOS and Ctrl on other platforms
- A native confirm dialog before renaming
- Log rows showing the old name above the new name
- A running count while a batch or preview is in progress
- Plain-sentence error messages, including for each folder that fails
- A warning when no rules are configured
- A wait for a running batch before quitting, with a message
- Rule files copied to the app's userData folder on first run, or created empty
- Screen reader support: a labelled path, a results table and an announcement when a batch finishes
- A sandboxed window with a Content Security Policy, and blocked navigation and new windows
- IPC calls accepted only from the app's own pages, with their arguments checked
- An app icon
- Unit and end-to-end tests, and ESLint, Prettier and prose-lint checks, run in CI
