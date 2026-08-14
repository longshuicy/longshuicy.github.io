# longshuicy.github.io

Personal homepage of Chen Wang — Senior Research Software Engineer at NCSA, University of Illinois Urbana-Champaign.

Live at **https://longshuicy.github.io**

## Stack

Plain static HTML + CSS, no build step. GitHub Pages serves `index.html` from the `main` branch root.

```
index.html    # all content
styles.css    # theme, layout (light/dark aware)
.nojekyll     # skip Jekyll processing
```

## Local preview

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000

## Editing

All content lives in `index.html` as plain markup — edit the relevant `<section>` and push to `main`. GitHub Pages redeploys in about a minute.
