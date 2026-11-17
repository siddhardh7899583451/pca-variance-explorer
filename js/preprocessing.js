/**
 * Preprocessing: means, centering, standardization
 */

const Preprocessing = {
  /**
   * Compute column means
   * @param {number[][]} data - n x p matrix
   * @returns {number[]} means of length p
   */
  computeMeans(data) {
    const n = data.length;
    if (n === 0) return [];
    const p = data[0].length;
    const means = new Array(p).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        means[j] += data[i][j];
      }
    }
    for (let j = 0; j < p; j++) {
      means[j] /= n;
    }
    return means;
  },

  /**
   * Mean-center the data
   * @param {number[][]} data
   * @param {number[]} means - optional precomputed means
   * @returns {{centered: number[][], means: number[]}}
   */
  center(data, means = null) {
    const n = data.length;
    if (n === 0) return { centered: [], means: [] };
    const p = data[0].length;
    const m = means || this.computeMeans(data);
    const centered = new Array(n);
    for (let i = 0; i < n; i++) {
      centered[i] = new Array(p);
      for (let j = 0; j < p; j++) {
        centered[i][j] = data[i][j] - m[j];
      }
    }
    return { centered, means: m };
  },

  /**
   * Sample standard deviations (ddof=1)
   * @param {number[][]} centered - already centered data
   * @returns {number[]}
   */
  computeStds(centered) {
    const n = centered.length;
    if (n < 2) return new Array(centered[0]?.length || 0).fill(0);
    const p = centered[0].length;
    const stds = new Array(p).fill(0);
    for (let j = 0; j < p; j++) {
      let sumSq = 0;
      for (let i = 0; i < n; i++) {
        sumSq += centered[i][j] * centered[i][j];
      }
      stds[j] = Math.sqrt(sumSq / (n - 1));
    }
    return stds;
  },

  /**
   * Standardize (z-score) using provided or computed means and stds
   * Features with near-zero std are left as zeros after centering
   */
  standardize(data, means = null, stds = null) {
    const { centered, means: m } = this.center(data, means);
    const s = stds || this.computeStds(centered);
    const n = centered.length;
    const p = centered[0].length;
    const standardized = new Array(n);
    const safeStds = s.map(st => (Math.abs(st) < 1e-12 ? 1 : st)); // avoid div by zero; constant cols become 0

    for (let i = 0; i < n; i++) {
      standardized[i] = new Array(p);
      for (let j = 0; j < p; j++) {
        if (Math.abs(s[j]) < 1e-12) {
          standardized[i][j] = 0; // zero-variance feature
        } else {
          standardized[i][j] = centered[i][j] / s[j];
        }
      }
    }
    return {
      standardized,
      means: m,
      stds: s,
      centered
    };
  },

  /**
   * Full preprocessing pipeline
   * @param {number[][]} data
   * @param {boolean} doStandardize
   * @returns {Object}
   */
  process(data, doStandardize = false) {
    const means = this.computeMeans(data);
    const { centered } = this.center(data, means);
    const stds = this.computeStds(centered);

    let processed;
    if (doStandardize) {
      const result = this.standardize(data, means, stds);
      processed = result.standardized;
    } else {
      processed = centered;
    }

    return {
      original: data,
      processed,
      means,
      stds,
      centered,
      standardized: doStandardize,
      nSamples: data.length,
      nFeatures: data[0].length
    };
  }
};

if (typeof window !== 'undefined') {
  window.Preprocessing = Preprocessing;
}
