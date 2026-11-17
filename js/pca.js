/**
 * PCA core: explained variance, projection, full pipeline
 */

const PCA = {
  /**
   * Full PCA from processed (centered or standardized) data
   * @param {number[][]} processed - n x p
   * @returns {Object}
   */
  fit(processed) {
    const n = processed.length;
    const p = processed[0]?.length || 0;

    if (n < 2 || p === 0) {
      return {
        covariance: [],
        eigenvalues: [],
        eigenvectors: [],
        explainedVariance: [],
        explainedVarianceRatio: [],
        cumulativeVariance: [],
        totalVariance: 0,
        nComponents: 0,
        residual: 0,
        orthogonality: 0,
        converged: true
      };
    }

    const cov = Covariance.compute(processed);
    const eigen = Eigen.jacobi(cov);

    // Ensure non-negative eigenvalues for variance interpretation (clip tiny negatives)
    const eigenvalues = eigen.values.map(v => (v < 0 && Math.abs(v) < 1e-10 ? 0 : v));

    const totalVariance = eigenvalues.reduce((s, v) => s + Math.max(0, v), 0);

    const explainedVariance = eigenvalues.map(v => Math.max(0, v));
    const explainedVarianceRatio = explainedVariance.map(v =>
      Validation.safeDivide(v, totalVariance)
    );

    let cum = 0;
    const cumulativeVariance = explainedVarianceRatio.map(r => {
      cum += r;
      return cum;
    });

    const residual = Eigen.residual(cov, eigenvalues, eigen.vectors);
    const orthogonality = Eigen.orthogonality(eigen.vectors);

    return {
      covariance: cov,
      eigenvalues,
      eigenvectors: eigen.vectors, // columns as arrays
      explainedVariance,
      explainedVarianceRatio,
      cumulativeVariance,
      totalVariance,
      nComponents: p,
      residual,
      orthogonality,
      converged: eigen.converged,
      iterations: eigen.iterations
    };
  },

  /**
   * Project data onto first k principal components
   * X_reduced = X * W  where W is p x k matrix of selected eigenvectors
   * @param {number[][]} processed - n x p
   * @param {number[][]} eigenvectors - array of p-vectors (length p)
   * @param {number} k - number of components
   * @returns {number[][]} n x k
   */
  transform(processed, eigenvectors, k) {
    const n = processed.length;
    const p = processed[0].length;
    k = Math.min(k, eigenvectors.length, p);
    if (k < 1) return [];

    const reduced = new Array(n);
    for (let i = 0; i < n; i++) {
      reduced[i] = new Array(k);
      for (let c = 0; c < k; c++) {
        let sum = 0;
        const vec = eigenvectors[c];
        for (let j = 0; j < p; j++) {
          sum += processed[i][j] * vec[j];
        }
        reduced[i][c] = sum;
      }
    }
    return reduced;
  },

  /**
   * Information retained / lost for k components
   */
  retention(cumulativeVariance, k) {
    if (!cumulativeVariance || cumulativeVariance.length === 0) {
      return { retained: 0, lost: 1, retainedPct: 0, lostPct: 100 };
    }
    const idx = Math.min(k, cumulativeVariance.length) - 1;
    const retained = cumulativeVariance[idx] || 0;
    return {
      retained,
      lost: 1 - retained,
      retainedPct: retained * 100,
      lostPct: (1 - retained) * 100
    };
  }
};

if (typeof window !== 'undefined') {
  window.PCA = PCA;
}
