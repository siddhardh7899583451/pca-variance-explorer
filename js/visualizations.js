/**
 * Plotly.js visualization helpers for PCA Variance Explorer
 */

const Visualizations = {
  /**
   * Ensure Plotly is available
   */
  checkPlotly() {
    if (typeof Plotly === 'undefined') {
      console.error('Plotly.js is not loaded. Charts will not render.');
      return false;
    }
    return true;
  },

  /**
   * Scree plot + cumulative variance
   */
  plotScree(containerId, explainedRatio, cumulative, theme = 'light') {
    if (!this.checkPlotly()) return;
    const isDark = theme === 'dark';
    const n = explainedRatio.length;
    const x = Array.from({ length: n }, (_, i) => `PC${i + 1}`);

    const trace1 = {
      x,
      y: explainedRatio.map(r => r * 100),
      type: 'bar',
      name: 'Individual Explained Variance (%)',
      marker: { color: isDark ? '#60a5fa' : '#3b82f6' },
      text: explainedRatio.map(r => (r * 100).toFixed(1) + '%'),
      textposition: 'auto'
    };

    const trace2 = {
      x,
      y: cumulative.map(c => c * 100),
      type: 'scatter',
      mode: 'lines+markers',
      name: 'Cumulative Explained Variance (%)',
      line: { color: isDark ? '#f472b6' : '#db2777', width: 3 },
      marker: { size: 8 }
    };

    const layout = {
      title: { text: 'Scree Plot & Cumulative Explained Variance', font: { size: 16 } },
      xaxis: { title: 'Principal Component' },
      yaxis: { title: 'Explained Variance (%)', range: [0, 105] },
      barmode: 'group',
      legend: { orientation: 'h', y: -0.2 },
      margin: { t: 50, b: 80 },
      paper_bgcolor: isDark ? '#1e293b' : '#ffffff',
      plot_bgcolor: isDark ? '#0f172a' : '#f8fafc',
      font: { color: isDark ? '#e2e8f0' : '#1e293b' },
      hovermode: 'x unified'
    };

    Plotly.newPlot(containerId, [trace1, trace2], layout, { responsive: true, displayModeBar: true });
  },

  /**
   * Covariance heatmap
   */
  plotCovarianceHeatmap(containerId, cov, featureNames, theme = 'light') {
    if (!this.checkPlotly()) return;
    const isDark = theme === 'dark';
    const z = cov;
    const text = cov.map(row => row.map(v => v.toFixed(4)));

    const data = [{
      z,
      x: featureNames,
      y: featureNames,
      type: 'heatmap',
      colorscale: isDark ? 'Viridis' : 'Blues',
      text,
      texttemplate: '%{text}',
      textfont: { size: 10 },
      hoverongaps: false,
      colorbar: { title: 'Covariance' }
    }];

    const layout = {
      title: { text: 'Covariance Matrix', font: { size: 16 } },
      xaxis: { title: '', side: 'bottom', tickangle: -45 },
      yaxis: { title: '', autorange: 'reversed' },
      margin: { t: 50, l: 100, r: 50, b: 100 },
      paper_bgcolor: isDark ? '#1e293b' : '#ffffff',
      plot_bgcolor: isDark ? '#0f172a' : '#f8fafc',
      font: { color: isDark ? '#e2e8f0' : '#1e293b' }
    };

    Plotly.newPlot(containerId, data, layout, { responsive: true });
  },

  /**
   * 2D PCA scatter
   */
  plot2DProjection(containerId, projected, theme = 'light', title = 'PCA Projection (PC1 vs PC2)') {
    if (!this.checkPlotly()) return;
    const isDark = theme === 'dark';
    if (!projected || projected.length === 0 || projected[0].length < 2) {
      Plotly.purge(containerId);
      return;
    }

    const x = projected.map(r => r[0]);
    const y = projected.map(r => r[1]);

    const data = [{
      x,
      y,
      mode: 'markers',
      type: 'scatter',
      marker: {
        size: 8,
        color: isDark ? '#38bdf8' : '#0ea5e9',
        opacity: 0.75,
        line: { width: 0.5, color: isDark ? '#0f172a' : '#ffffff' }
      },
      name: 'Samples'
    }];

    const layout = {
      title: { text: title, font: { size: 16 } },
      xaxis: { title: 'PC1', zeroline: true },
      yaxis: { title: 'PC2', zeroline: true, scaleanchor: 'x', scaleratio: 1 },
      margin: { t: 50 },
      paper_bgcolor: isDark ? '#1e293b' : '#ffffff',
      plot_bgcolor: isDark ? '#0f172a' : '#f8fafc',
      font: { color: isDark ? '#e2e8f0' : '#1e293b' },
      hovermode: 'closest'
    };

    Plotly.newPlot(containerId, data, layout, { responsive: true });
  },

  /**
   * 3D PCA scatter
   */
  plot3DProjection(containerId, projected, theme = 'light') {
    if (!this.checkPlotly()) return;
    const isDark = theme === 'dark';
    if (!projected || projected.length === 0 || projected[0].length < 3) {
      Plotly.purge(containerId);
      return;
    }

    const x = projected.map(r => r[0]);
    const y = projected.map(r => r[1]);
    const z = projected.map(r => r[2]);

    const data = [{
      x, y, z,
      mode: 'markers',
      type: 'scatter3d',
      marker: {
        size: 4,
        color: z,
        colorscale: isDark ? 'Viridis' : 'Portland',
        opacity: 0.85
      },
      name: 'Samples'
    }];

    const layout = {
      title: { text: 'PCA 3D Projection (PC1, PC2, PC3)', font: { size: 16 } },
      scene: {
        xaxis: { title: 'PC1' },
        yaxis: { title: 'PC2' },
        zaxis: { title: 'PC3' },
        bgcolor: isDark ? '#0f172a' : '#f8fafc'
      },
      margin: { t: 50 },
      paper_bgcolor: isDark ? '#1e293b' : '#ffffff',
      font: { color: isDark ? '#e2e8f0' : '#1e293b' }
    };

    Plotly.newPlot(containerId, data, layout, { responsive: true });
  },

  /**
   * Original vs projected comparison (side-by-side 2D if possible)
   */
  plotComparison(containerId, original, projected, featureNames, theme = 'light') {
    if (!this.checkPlotly()) return;
    const isDark = theme === 'dark';

    // If original has >=2 features, plot first two original dims vs first two PCs
    const traces = [];

    if (original && original[0] && original[0].length >= 2) {
      traces.push({
        x: original.map(r => r[0]),
        y: original.map(r => r[1]),
        mode: 'markers',
        type: 'scatter',
        name: `Original (${featureNames[0] || 'F1'} vs ${featureNames[1] || 'F2'})`,
        marker: { size: 7, color: isDark ? '#a78bfa' : '#7c3aed', opacity: 0.7 },
        xaxis: 'x',
        yaxis: 'y'
      });
    }

    if (projected && projected[0] && projected[0].length >= 2) {
      traces.push({
        x: projected.map(r => r[0]),
        y: projected.map(r => r[1]),
        mode: 'markers',
        type: 'scatter',
        name: 'PCA (PC1 vs PC2)',
        marker: { size: 7, color: isDark ? '#34d399' : '#059669', opacity: 0.7 },
        xaxis: 'x2',
        yaxis: 'y2'
      });
    }

    const layout = {
      title: { text: 'Original Features vs PCA Projection', font: { size: 16 } },
      grid: { rows: 1, columns: 2, pattern: 'independent' },
      xaxis: { title: featureNames[0] || 'Feature 1', domain: [0, 0.45] },
      yaxis: { title: featureNames[1] || 'Feature 2' },
      xaxis2: { title: 'PC1', domain: [0.55, 1] },
      yaxis2: { title: 'PC2', anchor: 'x2' },
      margin: { t: 50 },
      paper_bgcolor: isDark ? '#1e293b' : '#ffffff',
      plot_bgcolor: isDark ? '#0f172a' : '#f8fafc',
      font: { color: isDark ? '#e2e8f0' : '#1e293b' },
      showlegend: true,
      legend: { orientation: 'h', y: -0.15 }
    };

    Plotly.newPlot(containerId, traces, layout, { responsive: true });
  },

  /**
   * Clear a plot container
   */
  clear(containerId) {
    if (typeof Plotly !== 'undefined') {
      Plotly.purge(containerId);
    }
  }
};

if (typeof window !== 'undefined') {
  window.Visualizations = Visualizations;
}
