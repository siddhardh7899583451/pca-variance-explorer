/**
 * Main application controller for PCA Variance Explorer
 */

const App = {
  state: {
    data: null,
    featureNames: null,
    source: null, // 'generated' | 'uploaded'
    processed: null,
    pcaResult: null,
    standardize: false,
    nComponents: 2,
    theme: 'light',
    lastError: null
  },

  /**
   * Escape HTML special characters to prevent XSS from uploaded feature names
   */
  escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  init() {
    this.bindEvents();
    this.applyTheme(localStorage.getItem('pca-theme') || 'light');
    this.showSection('intro');
    this.log('Application initialized. All calculations run locally in your browser.');
  },

  bindEvents() {
    // Theme toggle
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        const next = this.state.theme === 'light' ? 'dark' : 'light';
        this.applyTheme(next);
      });
    }

    // Generate dataset
    const genBtn = document.getElementById('btn-generate');
    if (genBtn) {
      genBtn.addEventListener('click', () => this.generateDataset());
    }

    // CSV upload
    const fileInput = document.getElementById('csv-file');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileUpload(e));
    }

    // Standardization toggle
    const stdToggle = document.getElementById('toggle-standardize');
    if (stdToggle) {
      stdToggle.addEventListener('change', (e) => {
        this.state.standardize = e.target.checked;
        if (this.state.data) this.runPipeline();
      });
    }

    // Component selector
    const compSelect = document.getElementById('n-components');
    if (compSelect) {
      compSelect.addEventListener('change', (e) => {
        this.state.nComponents = parseInt(e.target.value, 10);
        this.updateProjection();
      });
    }

    // Run PCA button (explicit)
    const runBtn = document.getElementById('btn-run-pca');
    if (runBtn) {
      runBtn.addEventListener('click', () => {
        if (this.state.data) this.runPipeline();
        else this.showError('Please generate or upload a dataset first.');
      });
    }

    // Export buttons
    const exportProcessed = document.getElementById('btn-export-processed');
    if (exportProcessed) {
      exportProcessed.addEventListener('click', () => this.exportProcessed());
    }
    const exportProjected = document.getElementById('btn-export-projected');
    if (exportProjected) {
      exportProjected.addEventListener('click', () => this.exportProjected());
    }

    // Navigation
    document.querySelectorAll('[data-section]').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        const sec = el.getAttribute('data-section');
        this.showSection(sec);
      });
    });
  },

  applyTheme(theme) {
    this.state.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pca-theme', theme);
    const icon = document.getElementById('theme-icon');
    if (icon) icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    // Re-render charts with new theme if data exists
    if (this.state.pcaResult) {
      this.renderAllVisualizations();
    }
  },

  showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById(`section-${id}`);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    const nav = document.querySelector(`[data-section="${id}"]`);
    if (nav) nav.classList.add('active');
  },

  log(msg) {
    const el = document.getElementById('status-log');
    if (el) {
      const time = new Date().toLocaleTimeString();
      el.textContent = `[${time}] ${msg}`;
    }
  },

  showError(msg) {
    this.state.lastError = msg;
    const el = document.getElementById('error-banner');
    if (el) {
      el.textContent = msg;
      el.classList.remove('hidden');
      setTimeout(() => el.classList.add('hidden'), 8000);
    }
    this.log('Error: ' + msg);
  },

  clearError() {
    this.state.lastError = null;
    const el = document.getElementById('error-banner');
    if (el) el.classList.add('hidden');
  },

  generateDataset() {
    this.clearError();
    const type = document.getElementById('gen-type')?.value || 'elliptical';
    const nSamples = parseInt(document.getElementById('gen-samples')?.value || '200', 10);
    const nFeatures = parseInt(document.getElementById('gen-features')?.value || '3', 10);
    const noise = parseFloat(document.getElementById('gen-noise')?.value || '0.15');
    const correlation = parseFloat(document.getElementById('gen-corr')?.value || '0.75');
    const seed = parseInt(document.getElementById('gen-seed')?.value || '42', 10);

    if (nSamples < 5 || nSamples > 5000) {
      this.showError('Sample count must be between 5 and 5000.');
      return;
    }
    if (nFeatures < 2 || nFeatures > 20) {
      this.showError('Feature count must be between 2 and 20.');
      return;
    }

    try {
      const result = Dataset.generate({ type, nSamples, nFeatures, noise, correlation, seed });
      this.state.data = result.data;
      this.state.featureNames = result.featureNames;
      this.state.source = 'generated';
      this.updateDatasetInfo(result);
      this.runPipeline();
      this.log(`Generated ${type} dataset: ${nSamples} × ${nFeatures}`);
      this.showSection('dataset');
    } catch (err) {
      this.showError('Generation failed: ' + err.message);
    }
  },

  async handleFileUpload(e) {
    this.clearError();
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      this.log('Parsing CSV locally…');
      const result = await CSVParser.readFile(file);
      if (result.errors && result.errors.length > 0) {
        this.showError(result.errors.join(' '));
        if (result.data.length === 0) return;
      }
      if (result.warnings && result.warnings.length > 0) {
        this.log('Warnings: ' + result.warnings.join('; '));
      }

      this.state.data = result.data;
      this.state.featureNames = result.headers;
      this.state.source = 'uploaded';
      this.updateDatasetInfo({
        nSamples: result.nSamples,
        nFeatures: result.nFeatures,
        type: 'uploaded',
        featureNames: result.headers
      });
      this.runPipeline();
      this.log(`Loaded CSV: ${result.nSamples} samples × ${result.nFeatures} numeric features`);
      this.showSection('dataset');
    } catch (err) {
      this.showError(err.message || 'Failed to parse CSV.');
    }
  },

  updateDatasetInfo(info) {
    const el = document.getElementById('dataset-info');
    if (!el) return;
    const stats = Dataset.describe(this.state.data, this.state.featureNames);
    let html = `
      <div class="info-grid">
        <div><strong>Source</strong><br>${info.type || this.state.source}</div>
        <div><strong>Samples</strong><br>${info.nSamples}</div>
        <div><strong>Features</strong><br>${info.nFeatures}</div>
        <div><strong>Features</strong><br>${(this.state.featureNames || []).map(n => this.escapeHtml(n)).join(', ')}</div>
      </div>
    `;
    if (stats) {
      html += '<h4>Descriptive Statistics</h4><div class="table-wrap"><table class="data-table"><thead><tr><th>Feature</th><th>Mean</th><th>Std</th><th>Min</th><th>Max</th></tr></thead><tbody>';
      for (const s of stats) {
        html += `<tr><td>${this.escapeHtml(s.name)}</td><td>${s.mean.toFixed(4)}</td><td>${s.std.toFixed(4)}</td><td>${s.min.toFixed(4)}</td><td>${s.max.toFixed(4)}</td></tr>`;
      }
      html += '</tbody></table></div>';
    }
    // Preview first 8 rows
    html += '<h4>Data Preview (first 8 rows)</h4><div class="table-wrap"><table class="data-table"><thead><tr>';
    (this.state.featureNames || []).forEach(n => { html += `<th>${this.escapeHtml(n)}</th>`; });
    html += '</tr></thead><tbody>';
    const preview = this.state.data.slice(0, 8);
    for (const row of preview) {
      html += '<tr>' + row.map(v => `<td>${v.toFixed(4)}</td>`).join('') + '</tr>';
    }
    html += '</tbody></table></div>';
    el.innerHTML = html;
  },

  runPipeline() {
    if (!this.state.data) return;
    this.clearError();

    const validation = Validation.validateDataset(this.state.data, this.state.featureNames);
    if (!validation.valid) {
      this.showError(validation.error);
      return;
    }

    try {
      // Preprocess
      const prep = Preprocessing.process(this.state.data, this.state.standardize);
      this.state.processed = prep;

      // Fit PCA
      const pca = PCA.fit(prep.processed);
      this.state.pcaResult = pca;

      // Update component selector
      this.updateComponentSelector(pca.nComponents);

      // Render everything
      this.renderPreprocessing(prep);
      this.renderCovariance(pca);
      this.renderEigen(pca);
      this.renderVariance(pca);
      this.renderAllVisualizations();
      this.updateProjection();
      this.renderComparison();

      this.log(`PCA complete. Total variance: ${pca.totalVariance.toFixed(6)}. Residual: ${pca.residual.toExponential(2)}`);
    } catch (err) {
      this.showError('PCA pipeline failed: ' + err.message);
      console.error(err);
    }
  },

  updateComponentSelector(max) {
    const sel = document.getElementById('n-components');
    if (!sel) return;
    const current = this.state.nComponents;
    sel.innerHTML = '';
    for (let k = 1; k <= max; k++) {
      const opt = document.createElement('option');
      opt.value = k;
      opt.textContent = `${k} component${k > 1 ? 's' : ''}`;
      if (k === Math.min(current, max) || (current > max && k === max)) {
        opt.selected = true;
        this.state.nComponents = k;
      }
      sel.appendChild(opt);
    }
  },

  renderPreprocessing(prep) {
    const el = document.getElementById('preprocess-info');
    if (!el) return;
    let html = `
      <p><strong>Standardization:</strong> ${prep.standardized ? 'Yes (z-score)' : 'No (mean-centered only)'}</p>
      <p class="hint">${prep.standardized
        ? 'Each feature has mean ≈ 0 and std ≈ 1. PCA is performed on the correlation structure.'
        : 'Features keep their original scales. PCA is driven by absolute variance (covariance PCA).'}</p>
      <h4>Feature Means</h4>
      <div class="table-wrap"><table class="data-table"><thead><tr><th>Feature</th><th>Mean</th><th>Std (sample)</th></tr></thead><tbody>
    `;
    (this.state.featureNames || []).forEach((name, j) => {
      html += `<tr><td>${this.escapeHtml(name)}</td><td>${prep.means[j].toFixed(6)}</td><td>${prep.stds[j].toFixed(6)}</td></tr>`;
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
  },

  renderCovariance(pca) {
    const el = document.getElementById('cov-table');
    if (!el) return;
    const cov = pca.covariance;
    const names = this.state.featureNames || [];
    let html = '<div class="table-wrap"><table class="data-table matrix"><thead><tr><th></th>';
    names.forEach(n => { html += `<th>${this.escapeHtml(n)}</th>`; });
    html += '</tr></thead><tbody>';
    for (let i = 0; i < cov.length; i++) {
      html += `<tr><th>${this.escapeHtml(names[i])}</th>`;
      for (let j = 0; j < cov.length; j++) {
        html += `<td>${cov[i][j].toFixed(5)}</td>`;
      }
      html += '</tr>';
    }
    html += '</tbody></table></div>';
    html += '<p class="hint">Diagonal entries are feature variances. Off-diagonal entries are pairwise covariances. The matrix is symmetric by construction.</p>';
    el.innerHTML = html;

    Visualizations.plotCovarianceHeatmap('plot-covariance', cov, names, this.state.theme);
  },

  renderEigen(pca) {
    const el = document.getElementById('eigen-info');
    if (!el) return;
    let html = `
      <p><strong>Convergence:</strong> ${pca.converged ? 'Yes' : 'No (max iterations reached)'} · Iterations: ${pca.iterations || '—'}</p>
      <p><strong>Max residual ||Av − λv||:</strong> ${pca.residual.toExponential(3)}</p>
      <p><strong>Max off-diagonal of VᵀV:</strong> ${pca.orthogonality.toExponential(3)}</p>
      <h4>Eigenvalues & Explained Variance</h4>
      <div class="table-wrap"><table class="data-table"><thead><tr>
        <th>PC</th><th>Eigenvalue (λ)</th><th>Explained Var %</th><th>Cumulative %</th>
      </tr></thead><tbody>
    `;
    for (let i = 0; i < pca.eigenvalues.length; i++) {
      html += `<tr>
        <td>PC${i + 1}</td>
        <td>${pca.eigenvalues[i].toFixed(6)}</td>
        <td>${(pca.explainedVarianceRatio[i] * 100).toFixed(2)}%</td>
        <td>${(pca.cumulativeVariance[i] * 100).toFixed(2)}%</td>
      </tr>`;
    }
    html += '</tbody></table></div>';

    // Show first few eigenvectors
    html += '<h4>Eigenvectors (loadings)</h4><div class="table-wrap"><table class="data-table matrix"><thead><tr><th>Feature</th>';
    const maxShow = Math.min(5, pca.eigenvectors.length);
    for (let c = 0; c < maxShow; c++) html += `<th>PC${c + 1}</th>`;
    html += '</tr></thead><tbody>';
    (this.state.featureNames || []).forEach((name, j) => {
      html += `<tr><td>${this.escapeHtml(name)}</td>`;
      for (let c = 0; c < maxShow; c++) {
        html += `<td>${pca.eigenvectors[c][j].toFixed(4)}</td>`;
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    html += '<p class="hint">Eigenvectors are orthonormal. The first principal component is the direction of maximum variance. Sign of a vector is arbitrary (v and −v span the same line).</p>';
    el.innerHTML = html;
  },

  renderVariance(pca) {
    const el = document.getElementById('variance-summary');
    if (!el) return;
    const total = pca.totalVariance;
    const k = this.state.nComponents;
    const ret = PCA.retention(pca.cumulativeVariance, k);
    el.innerHTML = `
      <div class="metric-cards">
        <div class="metric-card">
          <div class="metric-value">${total.toFixed(4)}</div>
          <div class="metric-label">Total Variance</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${(pca.explainedVarianceRatio[0] * 100 || 0).toFixed(1)}%</div>
          <div class="metric-label">PC1 Explains</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${ret.retainedPct.toFixed(1)}%</div>
          <div class="metric-label">Retained (k=${k})</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${ret.lostPct.toFixed(1)}%</div>
          <div class="metric-label">Information Loss</div>
        </div>
      </div>
    `;
  },

  renderAllVisualizations() {
    const pca = this.state.pcaResult;
    if (!pca) return;
    Visualizations.plotScree('plot-scree', pca.explainedVarianceRatio, pca.cumulativeVariance, this.state.theme);
  },

  updateProjection() {
    const pca = this.state.pcaResult;
    const prep = this.state.processed;
    if (!pca || !prep) return;

    const k = this.state.nComponents;
    const projected = PCA.transform(prep.processed, pca.eigenvectors, k);
    this.state.projected = projected;

    // Update metrics
    this.renderVariance(pca);

    // Plots
    if (k >= 2) {
      Visualizations.plot2DProjection('plot-2d', projected, this.state.theme);
    } else {
      Visualizations.clear('plot-2d');
    }
    if (k >= 3) {
      Visualizations.plot3DProjection('plot-3d', projected, this.state.theme);
    } else {
      Visualizations.clear('plot-3d');
    }

    // Projection summary
    const el = document.getElementById('projection-info');
    if (el) {
      const ret = PCA.retention(pca.cumulativeVariance, k);
      el.innerHTML = `
        <p><strong>Original dimensions:</strong> ${prep.nFeatures}</p>
        <p><strong>Reduced dimensions:</strong> ${k}</p>
        <p><strong>Variance retained:</strong> ${ret.retainedPct.toFixed(2)}%</p>
        <p><strong>Information discarded:</strong> ${ret.lostPct.toFixed(2)}%</p>
        <p class="hint">Projection formula: X<sub>reduced</sub> = X<sub>processed</sub> × W, where W contains the first ${k} eigenvectors as columns.</p>
      `;
    }
  },

  renderComparison() {
    const prep = this.state.processed;
    const projected = this.state.projected;
    if (!prep || !projected) return;
    Visualizations.plotComparison(
      'plot-comparison',
      prep.original,
      projected,
      this.state.featureNames,
      this.state.theme
    );
  },

  exportProcessed() {
    if (!this.state.processed) {
      this.showError('No processed data to export.');
      return;
    }
    const headers = this.state.featureNames || [];
    const csv = CSVParser.toCSV(headers, this.state.processed.processed);
    CSVParser.downloadCSV('pca_processed.csv', csv);
    this.log('Exported processed data.');
  },

  exportProjected() {
    if (!this.state.projected) {
      this.showError('No projected data to export.');
      return;
    }
    const k = this.state.projected[0].length;
    const headers = Array.from({ length: k }, (_, i) => `PC${i + 1}`);
    const csv = CSVParser.toCSV(headers, this.state.projected);
    CSVParser.downloadCSV('pca_projected.csv', csv);
    this.log('Exported projected data.');
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
