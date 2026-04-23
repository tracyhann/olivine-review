# Olivine Table Review

Standalone GitHub Pages review app for olivine table images and PDF-only publications.

## Open

Serve the repository root or the `olivine-review` directory with any static file server, then open `olivine-review/index.html`.

```bash
python3 -m http.server 8020
```

Then open `http://127.0.0.1:8020/olivine-review/`.

For GitHub Pages, publish the `olivine-review` directory and use `index.html` as the entry point.

## Assets

- `table-images/`: copied table-image PNGs from `olivine-table-images-cleaned`.
- `excluded-publications/`: copied PDFs for publications that were not represented by the cleaned image set.
- `asset_manifest.csv`: provenance map from copied assets to source paths.

## Review Log

The app loads:

```text
review_log.csv
```

The first columns are:

```csv
image,decision,notes
table-images/example.png,,
```

`decision` is blank until reviewed, then becomes `keep` or `exclude`. PDF keep decisions can include notes such as page number, table title, or another table description.

GitHub Pages cannot write back to repository files. The page stores in-progress decisions in browser local storage and provides `Export CSV` / `Import CSV` controls for the review log.
