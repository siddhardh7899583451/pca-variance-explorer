/**
 * Validation utilities for PCA Variance Explorer
 * Handles data validation, finite checks, and error reporting
 */

const Validation = {
  /**
   * Check if a value is a finite number
   */
  isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  },

  /**
   * Check if all values in a matrix/array are finite
   */
  allFinite(matrix) {
    if (!Array.isArray(matrix)) return false;
    for (const row of matrix) {
      if (Array.isArray(row)) {
        for (const v of row) {
          if (!this.isFiniteNumber(v)) return false;
        }
      } else {
        if (!this.isFiniteNumber(row)) return false;
      }
    }
    return true;
  },

  /**
   * Validate dataset shape and content
   * @returns {{valid: boolean, error: string|null, nSamples: number, nFeatures: number}}
   */
  validateDataset(data, featureNames = null) {
    if (!data || !Array.isArray(data)) {
      return { valid: false, error: 'Dataset must be a non-empty array of rows.', nSamples: 0, nFeatures: 0 };
    }
    if (data.length === 0) {
      return { valid: false, error: 'Dataset is empty.', nSamples: 0, nFeatures: 0 };
    }

    const nSamples = data.length;
    const firstRow = data[0];
    if (!Array.isArray(firstRow) || firstRow.length === 0) {
      return { valid: false, error: 'Each row must be a non-empty array of numbers.', nSamples, nFeatures: 0 };
    }

    const nFeatures = firstRow.length;

    // Check consistent row lengths
    for (let i = 0; i < nSamples; i++) {
      if (!Array.isArray(data[i]) || data[i].length !== nFeatures) {
        return {
          valid: false,
          error: `Row ${i} has inconsistent length. Expected ${nFeatures} features.`,
          nSamples,
          nFeatures
        };
      }
    }

    // Check finite numbers
    if (!this.allFinite(data)) {
      return {
        valid: false,
        error: 'Dataset contains non-finite values (NaN, Infinity, or non-numeric).',
        nSamples,
        nFeatures
      };
    }

    // Check feature names if provided
    if (featureNames) {
      if (!Array.isArray(featureNames) || featureNames.length !== nFeatures) {
        return {
          valid: false,
          error: 'Feature names length does not match number of columns.',
          nSamples,
          nFeatures
        };
      }
      const unique = new Set(featureNames.map(String));
      if (unique.size !== featureNames.length) {
        return {
          valid: false,
          error: 'Duplicate feature names detected.',
          nSamples,
          nFeatures
        };
      }
    }

    // Warn on more features than samples (still valid but underdetermined)
    if (nFeatures > nSamples) {
      // Allowed, but note it
    }

    return { valid: true, error: null, nSamples, nFeatures };
  },

  /**
   * Validate that selected components is within range
   */
  validateComponents(k, maxComponents) {
    if (!Number.isInteger(k) || k < 1) {
      return { valid: false, error: 'Number of components must be a positive integer.' };
    }
    if (k > maxComponents) {
      return {
        valid: false,
        error: `Cannot select ${k} components. Maximum available is ${maxComponents}.`
      };
    }
    return { valid: true, error: null };
  },

  /**
   * Safe division that returns 0 for zero denominator
   */
  safeDivide(numerator, denominator) {
    if (!this.isFiniteNumber(denominator) || Math.abs(denominator) < 1e-15) {
      return 0;
    }
    return numerator / denominator;
  }
};

// Export for browser
if (typeof window !== 'undefined') {
  window.Validation = Validation;
}
