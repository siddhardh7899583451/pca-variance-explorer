---
title: PCA Variance Explorer
emoji: 📊
colorFrom: blue
colorTo: indigo
sdk: static
pinned: false
license: mit
---

# PCA Variance Explorer

**Interactive, fully client-side Principal Component Analysis educational application.**

All matrix algebra, eigenvalue decomposition (Jacobi method), variance calculations and visualizations run inside the browser. No Python backend, no server, no API keys. The same static files deploy to **GitHub Pages** and **Hugging Face Static Spaces**.

## Problem Statement

Beginners often treat PCA as a black-box “fit-transform” call. This project makes every mathematical step visible and interactive:

- How centering and optional standardization change the covariance structure
- How eigenvalues quantify variance along orthogonal directions
- How a scree plot guides the choice of dimensionality
- How projection actually discards information

## Objectives

- Implement PCA from first principles in pure JavaScript
- Provide synthetic data generators and local CSV upload
- Visualize covariance, eigenvalues, explained variance and projections
- Ship a self-contained static site that needs only a browser

## Features

- Synthetic datasets: elliptical, correlated, uncorrelated, 3-D Gaussian
- CSV upload with numeric-column detection and validation
- Mean centering + optional feature standardization
- Sample covariance matrix (table + heatmap)
- Jacobi eigenvalue decomposition with residual & orthogonality metrics
- Explained-variance ratios, cumulative variance, information-loss %
- Interactive scree plot (Plotly)
- 2-D and 3-D PCA projections
- Original-vs-reduced comparison chart
- Light / dark themes
- Browser-based mathematical test suite
- Export of processed and projected data as CSV

## Technology Stack

| Layer            | Choice                          |
|------------------|---------------------------------|
| Markup           | HTML5                           |
| Styling          | CSS3 (custom properties, themes)|
| Logic            | Vanilla ES6+ JavaScript         |
| Linear algebra   | Hand-written (Jacobi eigen)     |
| Charts           | Plotly.js 2.27 (CDN)            |
| Hosting          | Static only                     |

**Prohibited (and not used):** Python, Flask, Gradio, Streamlit, Node servers, databases, paid APIs.

## Mathematical Workflow

1. Load or generate **X** (*n × p*)
2. Compute column means → center → optional z-score
3. Sample covariance **C = X_cᵀ X_c / (n−1)**
4. Jacobi eigen-decomposition → λ (descending), V (orthonormal)
5. Explained variance ratios = λᵢ / Σλ
6. Project **X_red = X_proc · W** (first *k* eigenvectors)

See [`docs/mathematical-explanation.md`](docs/mathematical-explanation.md) for formulas and [`docs/architecture.md`](docs/architecture.md) for module layout.

## Project Structure

```
pca-variance-explorer/
├── index.html
├── README.md
├── LICENSE
├── .gitignore
├── css/styles.css
├── js/
│   ├── app.js
│   ├── dataset.js
│   ├── preprocessing.js
│   ├── covariance.js
│   ├── eigen.js
│   ├── pca.js
│   ├── visualizations.js
│   ├── csv-parser.js
│   └── validation.js
├── tests/
│   ├── index.html
│   └── test-pca.js
└── docs/
    ├── architecture.md
    ├── mathematical-explanation.md
    └── verification-report.md
```

## How to Run Locally

1. Download or clone the repository.
2. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
3. No build step, no `npm install`, no local server required (although a simple static server is fine).

Optional: open `tests/index.html` to run the mathematical test suite.

## How to Upload a CSV

1. Go to the **Upload** section.
2. Select a `.csv` file (≤ 5 MB).
3. The file is parsed entirely in the browser. Non-numeric columns are excluded with a visible warning.
4. At least two numeric columns and two samples are required.

## How to Use the Application

1. **Generate** a synthetic dataset or **Upload** a CSV.
2. Inspect the **Dataset** preview and descriptive statistics.
3. Toggle **Standardize** if features have different scales.
4. Explore the **Covariance** matrix and heatmap.
5. Review **Eigenvalues**, residuals and loadings.
6. Examine the **Scree plot** and choose the number of components.
7. View **2-D / 3-D projections** and the original-vs-reduced comparison.
8. Optionally export processed or projected data as CSV.

## Testing

Open `tests/index.html`. The page loads the same mathematical modules and runs deterministic checks against an independent reference implementation for means, centering and covariance, plus residual / orthogonality / reconstruction tests for the eigen solver and projection.

## Hugging Face Static Space Deployment

1. Create a new Space → **Static**.
2. Upload the entire project (or push via Git).
3. Ensure `index.html` sits at the repository root.
4. The YAML front-matter at the top of this README is already configured for a static SDK.
5. The Space will serve the files directly; no `app.py` or Gradio is needed.

## GitHub Pages Deployment

1. Create a new GitHub repository.
2. Upload / push all project files.
3. Go to **Settings → Pages**.
4. Under **Source** choose **Deploy from a branch**.
5. Select branch `main` (or `master`) and folder `/ (root)`.
6. Save. After a minute the site is available at `https://<user>.github.io/<repo>/`.

The identical `index.html` works on both platforms because all asset paths are relative and there is no server-side code.

## Limitations

- Jacobi method is O(p³) per sweep; practical for the educational feature counts (≤ 20) used here.
- PCA is linear; non-linear structure is not captured.
- Outliers can dominate variance-based components.
- Plotly is loaded from a CDN; offline use requires a local copy of Plotly.

## Future Enhancements

- Kernel PCA demonstration
- Biplot with feature loadings
- Bootstrap confidence intervals for eigenvalues
- Incremental / online PCA for streaming data

## License

MIT — see [LICENSE](LICENSE).
