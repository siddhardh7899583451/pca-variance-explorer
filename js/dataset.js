/**
 * Dataset generation and basic statistics for PCA Variance Explorer
 */

const Dataset = {
  /**
   * Seeded PRNG (Mulberry32) for reproducibility
   */
  createPRNG(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  },

  /**
   * Box-Muller transform for standard normal samples
   */
  gaussian(rand) {
    let u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  },

  /**
   * Generate synthetic dataset
   * @param {Object} options
   * @param {string} options.type - 'gaussian3d' | 'correlated' | 'uncorrelated' | 'elliptical'
   * @param {number} options.nSamples
   * @param {number} options.nFeatures
   * @param {number} options.noise
   * @param {number} options.correlation - for correlated type (0-1)
   * @param {number} options.seed
   */
  generate(options = {}) {
    const {
      type = 'gaussian3d',
      nSamples = 200,
      nFeatures = 3,
      noise = 0.1,
      correlation = 0.8,
      seed = 42
    } = options;

    const rand = this.createPRNG(seed);
    const data = [];
    const featureNames = [];

    for (let f = 0; f < nFeatures; f++) {
      featureNames.push(`Feature_${f + 1}`);
    }

    if (type === 'gaussian3d' || (type === 'uncorrelated' && nFeatures === 3)) {
      // Independent Gaussians with optional noise scaling
      for (let i = 0; i < nSamples; i++) {
        const row = [];
        for (let j = 0; j < nFeatures; j++) {
          row.push(this.gaussian(rand) * (1 + noise * (j + 1) * 0.3));
        }
        data.push(row);
      }
    } else if (type === 'uncorrelated') {
      for (let i = 0; i < nSamples; i++) {
        const row = [];
        for (let j = 0; j < nFeatures; j++) {
          row.push(this.gaussian(rand) * (1 + noise));
        }
        data.push(row);
      }
    } else if (type === 'correlated') {
      // Generate correlated features via common latent factors
      const nFactors = Math.min(3, Math.max(1, Math.floor(nFeatures / 2)));
      for (let i = 0; i < nSamples; i++) {
        const factors = [];
        for (let k = 0; k < nFactors; k++) {
          factors.push(this.gaussian(rand));
        }
        const row = [];
        for (let j = 0; j < nFeatures; j++) {
          let val = 0;
          for (let k = 0; k < nFactors; k++) {
            // Loading based on correlation strength
            const loading = correlation * (0.5 + 0.5 * Math.cos((j + k) * 0.7));
            val += loading * factors[k];
          }
          val += this.gaussian(rand) * noise * (1 - correlation * 0.5);
          row.push(val);
        }
        data.push(row);
      }
    } else if (type === 'elliptical') {
      // Elongated / anisotropic Gaussian
      const scales = [];
      for (let j = 0; j < nFeatures; j++) {
        scales.push(Math.pow(2.5, nFeatures - 1 - j) * (1 + noise));
      }
      // Simple rotation for first two dims
      const theta = 0.6;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      for (let i = 0; i < nSamples; i++) {
        const raw = [];
        for (let j = 0; j < nFeatures; j++) {
          raw.push(this.gaussian(rand) * scales[j]);
        }
        // Rotate first two coordinates
        if (nFeatures >= 2) {
          const x = raw[0];
          const y = raw[1];
          raw[0] = cos * x - sin * y;
          raw[1] = sin * x + cos * y;
        }
        data.push(raw);
      }
    } else {
      // Fallback: standard isotropic
      for (let i = 0; i < nSamples; i++) {
        const row = [];
        for (let j = 0; j < nFeatures; j++) {
          row.push(this.gaussian(rand));
        }
        data.push(row);
      }
    }

    return {
      data,
      featureNames,
      nSamples: data.length,
      nFeatures: featureNames.length,
      type,
      seed
    };
  },

  /**
   * Compute basic descriptive statistics
   */
  describe(data, featureNames = null) {
    if (!data || data.length === 0) return null;
    const n = data.length;
    const p = data[0].length;
    const names = featureNames || Array.from({ length: p }, (_, i) => `F${i + 1}`);

    const stats = [];
    for (let j = 0; j < p; j++) {
      let sum = 0;
      let min = Infinity;
      let max = -Infinity;
      const vals = [];
      for (let i = 0; i < n; i++) {
        const v = data[i][j];
        sum += v;
        if (v < min) min = v;
        if (v > max) max = v;
        vals.push(v);
      }
      const mean = sum / n;
      let varSum = 0;
      for (let i = 0; i < n; i++) {
        const d = data[i][j] - mean;
        varSum += d * d;
      }
      const variance = n > 1 ? varSum / (n - 1) : 0;
      const std = Math.sqrt(variance);

      stats.push({
        name: names[j],
        mean,
        std,
        variance,
        min,
        max,
        n
      });
    }
    return stats;
  },

  /**
   * Create a deep copy of a matrix
   */
  clone(matrix) {
    return matrix.map(row => row.slice());
  }
};

if (typeof window !== 'undefined') {
  window.Dataset = Dataset;
}
