/**
 * Browser-side CSV parser with validation
 * Uses FileReader / text parsing only — no external network
 */

const CSVParser = {
  /**
   * Parse CSV text into headers + numeric matrix
   * @param {string} text
   * @returns {{headers: string[], data: number[][], errors: string[], warnings: string[]}}
   */
  parse(text) {
    const errors = [];
    const warnings = [];

    if (typeof text !== 'string' || text.trim() === '') {
      return { headers: [], data: [], errors: ['Empty file or invalid content.'], warnings };
    }

    // Normalize line endings and split
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length === 0) {
      return { headers: [], data: [], errors: ['No data rows found.'], warnings };
    }

    // Simple CSV split that respects quoted fields
    const splitLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = splitLine(lines[0]).map(h => h.replace(/^"|"$/g, ''));
    if (headers.length === 0) {
      return { headers: [], data: [], errors: ['No headers detected.'], warnings };
    }

    // Duplicate header check
    const seen = new Set();
    for (const h of headers) {
      const key = h.toLowerCase();
      if (seen.has(key)) {
        errors.push(`Duplicate header detected: "${h}"`);
      }
      seen.add(key);
    }

    const data = [];
    const numericMask = new Array(headers.length).fill(true); // start assuming numeric

    for (let r = 1; r < lines.length; r++) {
      const cells = splitLine(lines[r]).map(c => c.replace(/^"|"$/g, ''));
      if (cells.length !== headers.length) {
        warnings.push(`Row ${r + 1}: expected ${headers.length} columns, found ${cells.length}. Skipped.`);
        continue;
      }

      const row = new Array(headers.length);
      let rowValid = true;
      for (let c = 0; c < headers.length; c++) {
        const raw = cells[c].trim();
        if (raw === '' || raw.toLowerCase() === 'nan' || raw.toLowerCase() === 'null') {
          // Missing value — mark column non-numeric later or reject
          numericMask[c] = false;
          row[c] = NaN;
          rowValid = false;
        } else {
          const num = Number(raw);
          if (!Number.isFinite(num)) {
            numericMask[c] = false;
            row[c] = NaN;
            rowValid = false;
          } else {
            row[c] = num;
          }
        }
      }
      if (rowValid) {
        data.push(row);
      } else {
        // We still collect to diagnose, but will filter columns
        data.push(row);
      }
    }

    if (data.length === 0) {
      errors.push('No valid data rows after parsing.');
      return { headers, data: [], errors, warnings };
    }

    // Identify purely numeric columns
    const numericIndices = [];
    const numericHeaders = [];
    for (let c = 0; c < headers.length; c++) {
      let allFinite = true;
      for (let r = 0; r < data.length; r++) {
        if (!Number.isFinite(data[r][c])) {
          allFinite = false;
          break;
        }
      }
      if (allFinite) {
        numericIndices.push(c);
        numericHeaders.push(headers[c]);
      } else {
        warnings.push(`Column "${headers[c]}" excluded: contains non-numeric or missing values.`);
      }
    }

    if (numericIndices.length === 0) {
      errors.push('No numeric columns found. PCA requires numerical features.');
      return { headers, data: [], errors, warnings };
    }

    // Build clean numeric matrix
    const cleanData = data.map(row => numericIndices.map(i => row[i]));

    // Final finite check
    if (!Validation.allFinite(cleanData)) {
      errors.push('After cleaning, non-finite values remain.');
      return { headers: numericHeaders, data: [], errors, warnings };
    }

    if (cleanData.length < 2) {
      errors.push('Need at least 2 samples for sample covariance.');
      return { headers: numericHeaders, data: cleanData, errors, warnings };
    }

    return {
      headers: numericHeaders,
      data: cleanData,
      errors,
      warnings,
      originalHeaders: headers,
      nSamples: cleanData.length,
      nFeatures: numericHeaders.length
    };
  },

  /**
   * Read a File object and parse
   * @param {File} file
   * @param {number} maxSizeBytes
   * @returns {Promise<Object>}
   */
  readFile(file, maxSizeBytes = 5 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No file provided.'));
        return;
      }
      if (file.size > maxSizeBytes) {
        reject(new Error(`File too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum ${maxSizeBytes / 1024 / 1024} MB.`));
        return;
      }
      if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
        // Soft warning, still try
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = this.parse(e.target.result);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsText(file);
    });
  },

  /**
   * Export matrix + headers to CSV string
   */
  toCSV(headers, data) {
    const escape = (v) => {
      const s = String(v);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const lines = [headers.map(escape).join(',')];
    for (const row of data) {
      lines.push(row.map(escape).join(','));
    }
    return lines.join('\n');
  },

  /**
   * Trigger download of a CSV string
   */
  downloadCSV(filename, csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

if (typeof window !== 'undefined') {
  window.CSVParser = CSVParser;
}
