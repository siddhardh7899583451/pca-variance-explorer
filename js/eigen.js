/**
 * Jacobi eigenvalue decomposition for real symmetric matrices
 * Returns eigenvalues (descending) and corresponding orthonormal eigenvectors
 */

const Eigen = {
  /**
   * Jacobi rotation method for symmetric eigenvalue problem
   * @param {number[][]} A - symmetric p x p matrix (will be copied)
   * @param {number} maxIter - maximum sweeps
   * @param {number} tol - convergence tolerance on off-diagonal
   * @returns {{values: number[], vectors: number[][], converged: boolean, iterations: number}}
   */
  jacobi(A, maxIter = 100, tol = 1e-12) {
    const p = A.length;
    if (p === 0) {
      return { values: [], vectors: [], converged: true, iterations: 0 };
    }

    // Deep copy
    const a = A.map(row => row.slice());
    // Eigenvectors start as identity
    const V = Array.from({ length: p }, (_, i) => {
      const row = new Array(p).fill(0);
      row[i] = 1;
      return row;
    });

    let iterations = 0;
    let converged = false;

    for (let sweep = 0; sweep < maxIter; sweep++) {
      // Find largest off-diagonal element
      let maxOff = 0;
      let pIdx = 0, qIdx = 1;
      for (let i = 0; i < p; i++) {
        for (let j = i + 1; j < p; j++) {
          const absVal = Math.abs(a[i][j]);
          if (absVal > maxOff) {
            maxOff = absVal;
            pIdx = i;
            qIdx = j;
          }
        }
      }

      if (maxOff < tol) {
        converged = true;
        iterations = sweep;
        break;
      }

      // Compute rotation
      const app = a[pIdx][pIdx];
      const aqq = a[qIdx][qIdx];
      const apq = a[pIdx][qIdx];

      let theta;
      if (Math.abs(apq) < 1e-15) {
        theta = 0;
      } else {
        const diff = aqq - app;
        // tau = (a_qq - a_pp) / (2 * a_pq)
        const tau = diff / (2 * apq);
        let t;
        if (tau >= 0) {
          t = 1 / (tau + Math.sqrt(1 + tau * tau));
        } else {
          t = -1 / (-tau + Math.sqrt(1 + tau * tau));
        }
        const c = 1 / Math.sqrt(1 + t * t);
        const s = t * c;

        // Apply rotation to A
        // Update diagonal
        a[pIdx][pIdx] = app - t * apq;
        a[qIdx][qIdx] = aqq + t * apq;
        a[pIdx][qIdx] = 0;
        a[qIdx][pIdx] = 0;

        // Update remaining elements
        for (let k = 0; k < p; k++) {
          if (k !== pIdx && k !== qIdx) {
            const aik = a[k][pIdx];
            const aiq = a[k][qIdx];
            a[k][pIdx] = c * aik - s * aiq;
            a[pIdx][k] = a[k][pIdx];
            a[k][qIdx] = s * aik + c * aiq;
            a[qIdx][k] = a[k][qIdx];
          }
        }

        // Update eigenvectors
        for (let k = 0; k < p; k++) {
          const vip = V[k][pIdx];
          const viq = V[k][qIdx];
          V[k][pIdx] = c * vip - s * viq;
          V[k][qIdx] = s * vip + c * viq;
        }
      }
      iterations = sweep + 1;
    }

    // Extract eigenvalues from diagonal
    const values = new Array(p);
    for (let i = 0; i < p; i++) {
      values[i] = a[i][i];
    }

    // Sort by descending eigenvalue absolute? No: descending algebraic value (largest first)
    // For variance we want largest positive first; negative eigenvalues are rare for cov but possible numerically
    const indices = Array.from({ length: p }, (_, i) => i);
    indices.sort((i, j) => values[j] - values[i]); // descending

    const sortedValues = indices.map(i => values[i]);
    const sortedVectors = indices.map(i => {
      // column i of V is the eigenvector
      const vec = new Array(p);
      for (let r = 0; r < p; r++) {
        vec[r] = V[r][i];
      }
      // Normalize (should already be unit, but enforce)
      let norm = 0;
      for (let r = 0; r < p; r++) norm += vec[r] * vec[r];
      norm = Math.sqrt(norm);
      if (norm > 1e-15) {
        for (let r = 0; r < p; r++) vec[r] /= norm;
      }
      // Optional: make first significant component positive for determinism
      let firstNonZero = 0;
      while (firstNonZero < p && Math.abs(vec[firstNonZero]) < 1e-12) firstNonZero++;
      if (firstNonZero < p && vec[firstNonZero] < 0) {
        for (let r = 0; r < p; r++) vec[r] = -vec[r];
      }
      return vec;
    });

    return {
      values: sortedValues,
      vectors: sortedVectors, // array of column vectors
      converged,
      iterations
    };
  },

  /**
   * Verify A * v ≈ λ * v
   * @returns {number} max residual norm
   */
  residual(A, values, vectors) {
    const p = A.length;
    let maxRes = 0;
    for (let k = 0; k < p; k++) {
      const v = vectors[k];
      const lambda = values[k];
      const Av = new Array(p).fill(0);
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          Av[i] += A[i][j] * v[j];
        }
      }
      let resNorm = 0;
      for (let i = 0; i < p; i++) {
        const d = Av[i] - lambda * v[i];
        resNorm += d * d;
      }
      resNorm = Math.sqrt(resNorm);
      if (resNorm > maxRes) maxRes = resNorm;
    }
    return maxRes;
  },

  /**
   * Check orthogonality of eigenvectors: V^T V ≈ I
   * @returns {number} max off-diagonal absolute value
   */
  orthogonality(vectors) {
    const p = vectors.length;
    let maxOff = 0;
    for (let i = 0; i < p; i++) {
      for (let j = i + 1; j < p; j++) {
        let dot = 0;
        for (let k = 0; k < p; k++) {
          dot += vectors[i][k] * vectors[j][k];
        }
        if (Math.abs(dot) > maxOff) maxOff = Math.abs(dot);
      }
    }
    return maxOff;
  },

  /**
   * Check that vectors are unit length
   */
  norms(vectors) {
    return vectors.map(v => {
      let n = 0;
      for (const x of v) n += x * x;
      return Math.sqrt(n);
    });
  }
};

if (typeof window !== 'undefined') {
  window.Eigen = Eigen;
}
