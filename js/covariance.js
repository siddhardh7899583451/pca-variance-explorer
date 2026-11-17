/**
 * Sample covariance matrix calculation
 * Cov = (X_centered^T * X_centered) / (n - 1)
 */

const Covariance = {
  /**
   * Compute sample covariance matrix
   * @param {number[][]} centered - n x p mean-centered matrix
   * @returns {number[][]} p x p symmetric covariance matrix
   */
  compute(centered) {
    const n = centered.length;
    if (n < 2) {
      const p = centered[0]?.length || 0;
      return Array.from({ length: p }, () => new Array(p).fill(0));
    }
    const p = centered[0].length;
    const cov = Array.from({ length: p }, () => new Array(p).fill(0));

    // X^T X
    for (let i = 0; i < n; i++) {
      const row = centered[i];
      for (let j = 0; j < p; j++) {
        const xj = row[j];
        for (let k = j; k < p; k++) { // exploit symmetry
          cov[j][k] += xj * row[k];
        }
      }
    }

    const denom = n - 1;
    for (let j = 0; j < p; j++) {
      for (let k = j; k < p; k++) {
        cov[j][k] /= denom;
        if (j !== k) {
          cov[k][j] = cov[j][k];
        }
      }
    }

    return cov;
  },

  /**
   * Check symmetry within tolerance
   */
  isSymmetric(matrix, tol = 1e-10) {
    const p = matrix.length;
    for (let i = 0; i < p; i++) {
      for (let j = i + 1; j < p; j++) {
        if (Math.abs(matrix[i][j] - matrix[j][i]) > tol) return false;
      }
    }
    return true;
  },

  /**
   * Frobenius norm of difference (for residual checks)
   */
  frobeniusDiff(A, B) {
    let sum = 0;
    const p = A.length;
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        const d = A[i][j] - B[i][j];
        sum += d * d;
      }
    }
    return Math.sqrt(sum);
  }
};

if (typeof window !== 'undefined') {
  window.Covariance = Covariance;
}
