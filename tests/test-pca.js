/**
 * Deterministic mathematical tests for PCA Variance Explorer
 * Runs entirely in the browser against the same modules used by the app.
 */

const TestPCA = {
  TOL: 1e-8,
  results: [],

  assert(condition, name, detail = '') {
    const passed = !!condition;
    this.results.push({ name, passed, detail });
    return passed;
  },

  approxEqual(a, b, tol = this.TOL) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!this.approxEqual(a[i], b[i], tol)) return false;
      }
      return true;
    }
    return Math.abs(a - b) <= tol;
  },

  // Reference means (independent implementation)
  refMeans(data) {
    const n = data.length, p = data[0].length;
    const m = new Array(p).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < p; j++) m[j] += data[i][j];
    return m.map(v => v / n);
  },

  refCenter(data, means) {
    return data.map(row => row.map((v, j) => v - means[j]));
  },

  refCov(centered) {
    const n = centered.length, p = centered[0].length;
    const C = Array.from({ length: p }, () => new Array(p).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < p; j++) {
        for (let k = j; k < p; k++) {
          C[j][k] += centered[i][j] * centered[i][k];
        }
      }
    }
    const d = n - 1;
    for (let j = 0; j < p; j++) {
      for (let k = j; k < p; k++) {
        C[j][k] /= d;
        C[k][j] = C[j][k];
      }
    }
    return C;
  },

  runAll() {
    this.results = [];
    console.log('=== PCA Variance Explorer — Test Suite ===');

    // ---------- Dataset generation ----------
    this.testDatasetGeneration();

    // ---------- CSV parsing ----------
    this.testCSVParsing();

    // ---------- Preprocessing ----------
    this.testPreprocessing();

    // ---------- Covariance ----------
    this.testCovariance();

    // ---------- Eigen ----------
    this.testEigen();

    // ---------- Explained variance ----------
    this.testExplainedVariance();

    // ---------- Projection ----------
    this.testProjection();

    // ---------- Edge cases ----------
    this.testEdgeCases();

    // Summary
    const passed = this.results.filter(r => r.passed).length;
    const total = this.results.length;
    console.log(`\n=== Results: ${passed}/${total} passed ===`);
    return { results: this.results, passed, total };
  },

  testDatasetGeneration() {
    const ds = Dataset.generate({ type: 'elliptical', nSamples: 100, nFeatures: 3, seed: 123 });
    this.assert(ds.data.length === 100, 'Generate: correct sample count');
    this.assert(ds.data[0].length === 3, 'Generate: correct feature count');
    this.assert(Validation.allFinite(ds.data), 'Generate: all values finite');

    // Reproducibility
    const ds2 = Dataset.generate({ type: 'elliptical', nSamples: 100, nFeatures: 3, seed: 123 });
    let same = true;
    for (let i = 0; i < 5; i++) {
      if (!this.approxEqual(ds.data[i], ds2.data[i], 1e-12)) { same = false; break; }
    }
    this.assert(same, 'Generate: reproducible with same seed');

    const unc = Dataset.generate({ type: 'uncorrelated', nSamples: 50, nFeatures: 4, seed: 7 });
    this.assert(unc.nFeatures === 4, 'Generate uncorrelated: feature count');
  },

  testCSVParsing() {
    const good = `a,b,c\n1.0,2.0,3.0\n4.0,5.0,6.0\n7,8,9`;
    const r1 = CSVParser.parse(good);
    this.assert(r1.errors.length === 0, 'CSV: valid file no errors');
    this.assert(r1.data.length === 3 && r1.headers.length === 3, 'CSV: correct shape');

    const missing = `x,y\n1,2\n3,\n5,6`;
    const r2 = CSVParser.parse(missing);
    this.assert(r2.warnings.length > 0 || r2.errors.length > 0 || r2.headers.length < 2,
      'CSV: missing values handled (column excluded or warned)');

    const dup = `a,a\n1,2\n3,4`;
    const r3 = CSVParser.parse(dup);
    this.assert(r3.errors.some(e => e.toLowerCase().includes('duplicate')), 'CSV: duplicate headers detected');

    const empty = '';
    const r4 = CSVParser.parse(empty);
    this.assert(r4.errors.length > 0, 'CSV: empty content rejected');

    const nonnum = `name,age\nAlice,30\nBob,25`;
    const r5 = CSVParser.parse(nonnum);
    // name column excluded, age kept if numeric
    this.assert(r5.headers.length <= 1, 'CSV: non-numeric column excluded');
  },

  testPreprocessing() {
    const data = [
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10, 11, 12]
    ];
    const means = Preprocessing.computeMeans(data);
    const refM = this.refMeans(data);
    this.assert(this.approxEqual(means, refM), 'Means: match reference', `got ${means}, ref ${refM}`);

    const { centered } = Preprocessing.center(data, means);
    const refC = this.refCenter(data, means);
    this.assert(this.approxEqual(centered, refC), 'Centering: match reference');

    // After centering, column means should be ~0
    const postMeans = Preprocessing.computeMeans(centered);
    this.assert(postMeans.every(m => Math.abs(m) < 1e-12), 'Centering: resulting means ≈ 0');

    const std = Preprocessing.standardize(data);
    // Standardized columns should have sample std ≈ 1 (except constant)
    const stds = Preprocessing.computeStds(std.standardized);
    this.assert(stds.every(s => Math.abs(s - 1) < 1e-10 || Math.abs(s) < 1e-10),
      'Standardization: resulting std ≈ 1');
  },

  testCovariance() {
    const data = [
      [1.0, 2.0],
      [2.0, 3.5],
      [3.0, 5.5],
      [4.0, 7.0],
      [5.0, 8.5]
    ];
    const means = Preprocessing.computeMeans(data);
    const { centered } = Preprocessing.center(data, means);
    const cov = Covariance.compute(centered);
    const ref = this.refCov(centered);

    this.assert(Covariance.isSymmetric(cov), 'Covariance: symmetric');
    this.assert(this.approxEqual(cov, ref, 1e-10), 'Covariance: matches independent reference');

    // Diagonal should be sample variances
    const n = centered.length;
    let var0 = 0;
    for (let i = 0; i < n; i++) var0 += centered[i][0] * centered[i][0];
    var0 /= (n - 1);
    this.assert(Math.abs(cov[0][0] - var0) < 1e-12, 'Covariance: diagonal equals sample variance');
  },

  testEigen() {
    // Simple 2x2 known case
    // Matrix [[2, 1], [1, 2]] has eigenvalues 3 and 1, eigenvectors [1,1]/√2 and [1,-1]/√2
    const A = [[2, 1], [1, 2]];
    const res = Eigen.jacobi(A);
    this.assert(res.converged, 'Eigen: Jacobi converged');
    this.assert(Math.abs(res.values[0] - 3) < 1e-8, 'Eigen: largest eigenvalue ≈ 3', `got ${res.values[0]}`);
    this.assert(Math.abs(res.values[1] - 1) < 1e-8, 'Eigen: second eigenvalue ≈ 1', `got ${res.values[1]}`);

    // Residual
    const resid = Eigen.residual(A, res.values, res.vectors);
    this.assert(resid < 1e-8, 'Eigen: residual ||Av-λv|| small', `resid=${resid}`);

    // Orthogonality
    const ortho = Eigen.orthogonality(res.vectors);
    this.assert(ortho < 1e-8, 'Eigen: eigenvectors orthogonal', `max off=${ortho}`);

    // Unit norms
    const norms = Eigen.norms(res.vectors);
    this.assert(norms.every(n => Math.abs(n - 1) < 1e-8), 'Eigen: unit-length eigenvectors');

    // Identity matrix
    const I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
    const resI = Eigen.jacobi(I);
    this.assert(resI.values.every(v => Math.abs(v - 1) < 1e-8), 'Eigen: identity eigenvalues = 1');
  },

  testExplainedVariance() {
    // Construct data with known variance structure
    const data = [];
    const rand = Dataset.createPRNG(99);
    for (let i = 0; i < 200; i++) {
      const x = Dataset.gaussian(rand) * 3;
      const y = Dataset.gaussian(rand) * 1;
      const z = Dataset.gaussian(rand) * 0.2;
      data.push([x, y, z]);
    }
    const prep = Preprocessing.process(data, false);
    const pca = PCA.fit(prep.processed);

    const sumRatio = pca.explainedVarianceRatio.reduce((a, b) => a + b, 0);
    this.assert(Math.abs(sumRatio - 1) < 1e-8, 'Explained variance ratios sum to ≈ 1', `sum=${sumRatio}`);

    // Cumulative should be non-decreasing and end at ~1
    let prev = 0;
    let mono = true;
    for (const c of pca.cumulativeVariance) {
      if (c + 1e-10 < prev) mono = false;
      prev = c;
    }
    this.assert(mono, 'Cumulative variance is non-decreasing');
    this.assert(Math.abs(pca.cumulativeVariance[pca.cumulativeVariance.length - 1] - 1) < 1e-8,
      'Final cumulative variance ≈ 1');

    // First component should capture most variance for this anisotropic data
    this.assert(pca.explainedVarianceRatio[0] > 0.7, 'PC1 captures majority of variance on anisotropic data',
      `PC1=${pca.explainedVarianceRatio[0]}`);
  },

  testProjection() {
    const data = [
      [1, 0], [2, 0], [3, 0], [4, 0], [5, 0],
      [1, 1], [2, 1], [3, 1], [4, 1], [5, 1]
    ];
    const prep = Preprocessing.process(data, false);
    const pca = PCA.fit(prep.processed);

    // 1-component projection
    const p1 = PCA.transform(prep.processed, pca.eigenvectors, 1);
    this.assert(p1.length === data.length && p1[0].length === 1, 'Projection: 1-component shape');

    // 2-component projection
    const p2 = PCA.transform(prep.processed, pca.eigenvectors, 2);
    this.assert(p2.length === data.length && p2[0].length === 2, 'Projection: 2-component shape');

    // Reconstruction residual should be small when using all components
    // X ≈ X_red * W^T  (since W is orthogonal)
    const W = pca.eigenvectors;
    let maxErr = 0;
    for (let i = 0; i < prep.processed.length; i++) {
      const recon = new Array(2).fill(0);
      for (let c = 0; c < 2; c++) {
        for (let j = 0; j < 2; j++) {
          recon[j] += p2[i][c] * W[c][j];
        }
      }
      for (let j = 0; j < 2; j++) {
        maxErr = Math.max(maxErr, Math.abs(recon[j] - prep.processed[i][j]));
      }
    }
    this.assert(maxErr < 1e-8, 'Projection: full reconstruction error near zero', `maxErr=${maxErr}`);
  },

  testEdgeCases() {
    // Constant feature
    const constData = [[1, 5], [2, 5], [3, 5], [4, 5]];
    const prepC = Preprocessing.process(constData, true);
    const pcaC = PCA.fit(prepC.processed);
    this.assert(pcaC.eigenvalues.every(v => v >= -1e-10), 'Edge: non-negative eigenvalues on constant feature');
    this.assert(Number.isFinite(pcaC.totalVariance), 'Edge: total variance finite');

    // Zero-variance (all constant)
    const zero = [[3, 3], [3, 3], [3, 3]];
    const prepZ = Preprocessing.process(zero, false);
    const pcaZ = PCA.fit(prepZ.processed);
    this.assert(pcaZ.totalVariance < 1e-12, 'Edge: zero total variance for constant data');
    this.assert(pcaZ.explainedVarianceRatio.every(r => r === 0 || Number.isFinite(r)),
      'Edge: no NaN ratios on zero-variance data');

    // More features than samples
    const wide = [[1, 2, 3, 4], [5, 6, 7, 8]];
    const prepW = Preprocessing.process(wide, false);
    const pcaW = PCA.fit(prepW.processed);
    this.assert(pcaW.nComponents === 4, 'Edge: handles p > n');
    this.assert(pcaW.eigenvalues.length === 4, 'Edge: returns p eigenvalues even when p > n');

    // Invalid component selection is guarded by UI / Validation
    const val = Validation.validateComponents(10, 3);
    this.assert(!val.valid, 'Validation: rejects k > max components');
  }
};

if (typeof window !== 'undefined') {
  window.TestPCA = TestPCA;
}
