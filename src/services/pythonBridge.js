const { spawn } = require('child_process');
const path = require('path');

const PYTHON_DIR = path.join(process.cwd(), 'python-ir');

/**
 * Run a Python IR script and return structured results
 * @param {string} scriptName - Python script filename (e.g., 'inverted_index.py')
 * @param {string[]} args - Command-line arguments
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function runPythonScript(scriptName, args = []) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(PYTHON_DIR, scriptName);
    const python = process.platform === 'win32' ? 'python' : 'python3';

    const proc = spawn(python, [scriptPath, ...args], {
      cwd: PYTHON_DIR,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code });
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to run Python script ${scriptName}: ${err.message}`));
    });

    // Timeout after 120 seconds
    setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Python script ${scriptName} timed out after 120s`));
    }, 120000);
  });
}

/**
 * Run IR evaluation and parse results
 */
async function runIrEvaluation() {
  try {
    const result = await runPythonScript('evaluate_ir.py', ['--json']);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'Evaluation script failed');
    }
    return JSON.parse(result.stdout);
  } catch (err) {
    console.error('IR Evaluation error:', err.message);
    return { error: err.message };
  }
}

/**
 * Run PageRank crawler and parse results
 */
async function runPageRankCrawler(baseUrl) {
  try {
    const result = await runPythonScript('crawler_pagerank.py', [baseUrl || 'http://localhost:3000', '--json']);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'Crawler script failed');
    }
    return JSON.parse(result.stdout);
  } catch (err) {
    console.error('PageRank Crawler error:', err.message);
    return { error: err.message };
  }
}

/**
 * Run inverted index search
 */
async function runInvertedIndexSearch(query) {
  try {
    const result = await runPythonScript('inverted_index.py', ['--query', query, '--json']);
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || 'Index search failed');
    }
    return JSON.parse(result.stdout);
  } catch (err) {
    console.error('Inverted index error:', err.message);
    return { error: err.message };
  }
}

module.exports = { runPythonScript, runIrEvaluation, runPageRankCrawler, runInvertedIndexSearch };
