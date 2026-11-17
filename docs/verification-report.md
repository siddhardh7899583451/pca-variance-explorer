# Verification Report — PCA Variance Explorer

**Date:** 2026-11-17  
**Scope:** Static browser-based PCA implementation (Jacobi eigen, pure JS)

## Requirement Status

| Requirement                    | Status      | Evidence |
|--------------------------------|-------------|----------|
| Dataset generator              | PASS        | `js/dataset.js` — seeded PRNG, 4 types, finite values |
| CSV upload                     | PASS        | `js/csv-parser.js` — FileReader, numeric filter, size limit |
| Preprocessing (center / std)   | PASS        | `js/preprocessing.js` + independent ref in tests |
| Covariance matrix              | PASS        | Formula (XᵀX)/(n−1), symmetry check, ref comparison |
| Eigenvalues                    | PASS        | Jacobi; known 2×2 case λ={3,1} verified |
| Eigenvectors                   | PASS        | Unit norms, orthogonality, residual ‖Av−λv‖ |
| Explained variance             | PASS        | Ratios sum to 1; cumulative monotone |
| Scree plot                     | PASS        | Plotly bar+line; interactive |
| 2D projection                  | PASS        | X·W; reconstruction error near zero when k=p |
| 3D projection                  | PASS        | Plotly scatter3d when k≥3 |
| Browser tests                  | PASS        | `tests/index.html` executes full suite |
| Security checks                | PASS        | Local-only, no eval, size limit, HTML-escaped feature names, no tracking |
| Hugging Face compatibility     | PASS        | Static files, root `index.html`, YAML front-matter |
| GitHub Pages compatibility     | PASS        | Relative paths, no server required |

## Independent Mathematical Checks (from test suite)

- Means match reference implementation  
- Centered column means ≈ 0  
- Covariance matches independent (XᵀX)/(n−1)  
- Jacobi on [[2,1],[1,2]] yields λ ≈ 3, 1  
- Residual ‖Cv − λv‖ < 1e-8  
- Eigenvector orthogonality < 1e-8  
- Full-rank projection reconstructs original processed data within 1e-8  
- Zero-variance and p > n cases produce finite results without division-by-zero  

## Stress test (re-verified 2026-11-17)

- 8-feature correlated dataset, standardized, n=300  
- Residual 6.9e-13, orthogonality 4.4e-16, reconstruction error 2.7e-15  
- Explained variance ratios sum exactly to 1.0  
- All 39 unit tests still PASS after XSS hardening  

## Notes

- Eigenvector signs are made deterministic by flipping so the first significant entry is positive; opposite signs remain mathematically equivalent.
- Tiny negative eigenvalues from floating-point error are clipped to zero for variance ratios only; the raw eigen solver still returns the computed values.
- Plotly is loaded from CDN; if the CDN is unreachable the UI shows an explicit error instead of a broken chart.
- Feature names from CSV are HTML-escaped before insertion into the DOM.

## How to re-verify

1. Open `tests/index.html` in a modern browser.  
2. Confirm all tests show PASS.  
3. Open `index.html`, generate an elliptical dataset, inspect residuals and orthogonality reported in the Eigen section.
