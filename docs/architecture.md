# Architecture — PCA Variance Explorer

## Design Goals

1. **100 % client-side** — no backend, no build step required at runtime.
2. **Mathematical transparency** — every step (means, centering, covariance, eigen, projection) is visible and verifiable.
3. **Static hosting compatibility** — works on GitHub Pages and Hugging Face Static Spaces from a single codebase.
4. **Educational clarity** — beginner-friendly explanations alongside professional visualizations.

## Directory Layout

```
pca-variance-explorer/
├── index.html              # Single-page application entry
├── css/styles.css          # Theme-aware dashboard styles
├── js/
│   ├── validation.js       # Finite checks, shape validation
│   ├── dataset.js          # Synthetic data generators + PRNG
│   ├── preprocessing.js    # Means, centering, standardization
│   ├── covariance.js       # Sample covariance matrix
│   ├── eigen.js            # Jacobi eigenvalue decomposition
│   ├── pca.js              # Explained variance + projection
│   ├── csv-parser.js       # Browser File API + CSV parsing
│   ├── visualizations.js   # Plotly.js wrappers
│   └── app.js              # UI controller / state machine
├── tests/
│   ├── index.html          # Test runner page
│   └── test-pca.js         # Deterministic mathematical tests
└── docs/
    ├── architecture.md
    └── mathematical-explanation.md
```

## Module Responsibilities

| Module            | Responsibility                                      |
|-------------------|-----------------------------------------------------|
| validation.js     | Shape, finite-value, and component-count checks     |
| dataset.js        | Seeded Gaussian generators, descriptive statistics  |
| preprocessing.js  | Column means, centering, optional z-score           |
| covariance.js     | Symmetric sample covariance                         |
| eigen.js          | Jacobi rotations, residual & orthogonality metrics  |
| pca.js            | Variance ratios, cumulative variance, transform     |
| csv-parser.js     | Local FileReader, numeric column detection          |
| visualizations.js | Plotly scree, heatmap, 2-D/3-D scatter              |
| app.js            | Event binding, state, section routing, orchestration|

## Data Flow

```
[Generate] or [CSV Upload]
        │
        ▼
   Validation
        │
        ▼
   Preprocessing  ──► means, centered / standardized matrix
        │
        ▼
   Covariance     ──► p × p symmetric matrix
        │
        ▼
   Jacobi Eigen   ──► λ (desc), V (orthonormal)
        │
        ▼
   Explained Var  ──► ratios, cumulative, loss
        │
        ▼
   Projection     ──► X_red = X_proc · W[:, 1:k]
        │
        ▼
   Plotly charts + tables
```

## State Management

A single `App.state` object holds:

- `data`, `featureNames`, `source`
- `processed` (output of Preprocessing)
- `pcaResult` (output of PCA.fit)
- `projected`, `nComponents`, `standardize`, `theme`

Re-running the pipeline after a toggle or new data replaces the relevant state and re-renders only the affected views.

## External Dependencies

- **Plotly.js 2.27** (CDN) — interactive charts only. All mathematics are pure vanilla JavaScript.
- Google Fonts (Inter + JetBrains Mono) — optional; system fonts are fallbacks.

No npm, no bundler, no Python runtime.

## Security Considerations

- Uploaded files never leave the browser.
- File size limited to 5 MB.
- CSV content is never inserted via `innerHTML` as raw markup; tables are built from validated numeric data.
- No `eval`, no dynamic `Function` constructors.
- No analytics or tracking scripts.

## Testing Strategy

The `tests/` folder loads the identical mathematical modules and runs an independent reference implementation for means, centering, and covariance. Eigen residuals and orthogonality are measured directly. Results are displayed as PASS/FAIL with numeric detail.
