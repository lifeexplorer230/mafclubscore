#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 * Analyzes JavaScript files and provides optimization recommendations
 *
 * Usage:
 *   node scripts/analyze-bundle.js
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const CONFIG = {
  rootDir: join(__dirname, '..'),
  exclude: ['node_modules', '.git', 'coverage', 'playwright-report', 'mafclubscore-worktrees'],
  maxFileSize: 50 * 1024, // 50 KB warning threshold
  extensions: ['.js', '.mjs']
};

/**
 * Formats bytes to human-readable size
 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Recursively gets all JS files
 */
function getAllJSFiles(dir, files = []) {
  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    // Skip excluded directories
    if (stat.isDirectory()) {
      if (CONFIG.exclude.some(ex => fullPath.includes(ex))) {
        continue;
      }
      getAllJSFiles(fullPath, files);
    } else if (CONFIG.extensions.includes(extname(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Analyzes file for optimization opportunities
 */
function analyzeFile(filePath) {
  const content = readFileSync(filePath, 'utf8');
  const size = statSync(filePath).size;
  const relativePath = filePath.replace(CONFIG.rootDir + '/', '');

  const analysis = {
    path: relativePath,
    size,
    lines: content.split('\n').length,
    issues: []
  };

  // Check for large files
  if (size > CONFIG.maxFileSize) {
    analysis.issues.push({
      type: 'large-file',
      severity: 'warning',
      message: `File is large (${formatSize(size)}). Consider code splitting.`
    });
  }

  // Check for commented code
  const commentedLines = content.split('\n').filter(line =>
    line.trim().startsWith('//') && line.length > 20
  ).length;

  if (commentedLines > 10) {
    analysis.issues.push({
      type: 'commented-code',
      severity: 'info',
      message: `${commentedLines} commented lines detected. Remove unused comments.`
    });
  }

  // Check for console.log statements
  const consoleCount = (content.match(/console\.(log|debug|info)/g) || []).length;
  if (consoleCount > 5) {
    analysis.issues.push({
      type: 'debug-statements',
      severity: 'info',
      message: `${consoleCount} console statements found. Remove for production.`
    });
  }

  // Check for large dependencies
  const imports = content.match(/import .+ from ['"](.+)['"]/g) || [];
  if (imports.length > 10) {
    analysis.issues.push({
      type: 'many-imports',
      severity: 'info',
      message: `${imports.length} imports detected. Consider reducing dependencies.`
    });
  }

  // Check for duplicate code patterns
  const functions = content.match(/function \w+\(/g) || [];
  const arrows = content.match(/(?:const|let|var) \w+ = \(/g) || [];
  const totalFunctions = functions.length + arrows.length;

  if (totalFunctions > 20) {
    analysis.issues.push({
      type: 'many-functions',
      severity: 'info',
      message: `${totalFunctions} functions detected. Consider extracting to modules.`
    });
  }

  return analysis;
}

/**
 * Groups files by directory
 */
function groupByDirectory(files) {
  const groups = {};

  for (const file of files) {
    const dir = dirname(file.path).split('/')[0] || 'root';
    if (!groups[dir]) {
      groups[dir] = [];
    }
    groups[dir].push(file);
  }

  return groups;
}

/**
 * Generates optimization recommendations
 */
function generateRecommendations(analyses) {
  const recommendations = [];

  // Find largest files
  const largeFiles = analyses
    .filter(a => a.size > CONFIG.maxFileSize)
    .sort((a, b) => b.size - a.size);

  if (largeFiles.length > 0) {
    recommendations.push({
      title: 'Large Files Detected',
      priority: 'high',
      files: largeFiles.map(f => `${f.path} (${formatSize(f.size)})`),
      suggestion: 'Consider code splitting these files into smaller modules'
    });
  }

  // Find files with many issues
  const problematicFiles = analyses
    .filter(a => a.issues.length > 3)
    .sort((a, b) => b.issues.length - a.issues.length);

  if (problematicFiles.length > 0) {
    recommendations.push({
      title: 'Files Needing Refactoring',
      priority: 'medium',
      files: problematicFiles.map(f => `${f.path} (${f.issues.length} issues)`),
      suggestion: 'Refactor these files to improve maintainability'
    });
  }

  // Calculate total size
  const totalSize = analyses.reduce((sum, a) => sum + a.size, 0);
  const avgSize = totalSize / analyses.length;

  recommendations.push({
    title: 'Bundle Statistics',
    priority: 'info',
    stats: {
      totalFiles: analyses.length,
      totalSize: formatSize(totalSize),
      avgSize: formatSize(avgSize),
      largestFile: formatSize(Math.max(...analyses.map(a => a.size)))
    },
    suggestion: totalSize > 500 * 1024
      ? 'Total bundle > 500KB. Implement aggressive code splitting.'
      : 'Bundle size is reasonable.'
  });

  return recommendations;
}

/**
 * Prints analysis report
 */
function printReport(analyses, recommendations) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║              BUNDLE SIZE ANALYSIS REPORT                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // Summary statistics
  const totalSize = analyses.reduce((sum, a) => sum + a.size, 0);
  const totalLines = analyses.reduce((sum, a) => sum + a.lines, 0);
  const filesWithIssues = analyses.filter(a => a.issues.length > 0).length;

  console.log('📊 SUMMARY');
  console.log('─'.repeat(60));
  console.log(`Total Files:        ${analyses.length}`);
  console.log(`Total Size:         ${formatSize(totalSize)}`);
  console.log(`Total Lines:        ${totalLines.toLocaleString()}`);
  console.log(`Files with Issues:  ${filesWithIssues}`);
  console.log();

  // Top 10 largest files
  console.log('📦 TOP 10 LARGEST FILES');
  console.log('─'.repeat(60));
  const largest = [...analyses]
    .sort((a, b) => b.size - a.size)
    .slice(0, 10);

  largest.forEach((file, i) => {
    const sizeStr = formatSize(file.size).padEnd(10);
    const linesStr = `${file.lines} lines`.padEnd(12);
    console.log(`${(i + 1).toString().padStart(2)}. ${sizeStr} ${linesStr} ${file.path}`);
  });
  console.log();

  // Files by directory
  console.log('📁 FILES BY DIRECTORY');
  console.log('─'.repeat(60));
  const groups = groupByDirectory(analyses);

  Object.entries(groups)
    .sort((a, b) => {
      const sizeA = a[1].reduce((sum, f) => sum + f.size, 0);
      const sizeB = b[1].reduce((sum, f) => sum + f.size, 0);
      return sizeB - sizeA;
    })
    .forEach(([dir, files]) => {
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      console.log(`${dir.padEnd(20)} ${files.length.toString().padStart(3)} files  ${formatSize(totalSize)}`);
    });
  console.log();

  // Issues summary
  const allIssues = analyses.flatMap(a => a.issues);
  if (allIssues.length > 0) {
    console.log('⚠️  ISSUES SUMMARY');
    console.log('─'.repeat(60));

    const issueTypes = {};
    allIssues.forEach(issue => {
      issueTypes[issue.type] = (issueTypes[issue.type] || 0) + 1;
    });

    Object.entries(issueTypes)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`${type.padEnd(20)} ${count} occurrences`);
      });
    console.log();
  }

  // Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('─'.repeat(60));

  recommendations.forEach((rec, i) => {
    const icon = rec.priority === 'high' ? '🔴' :
                 rec.priority === 'medium' ? '🟡' : '🔵';

    console.log(`\n${icon} ${rec.title}`);

    if (rec.files) {
      rec.files.slice(0, 5).forEach(file => {
        console.log(`   - ${file}`);
      });
      if (rec.files.length > 5) {
        console.log(`   ... and ${rec.files.length - 5} more`);
      }
    }

    if (rec.stats) {
      Object.entries(rec.stats).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    console.log(`   💬 ${rec.suggestion}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log('✅ Analysis complete!\n');
}

// Main execution
console.log('🔍 Analyzing JavaScript bundle...\n');

const jsFiles = getAllJSFiles(CONFIG.rootDir);
console.log(`Found ${jsFiles.length} JavaScript files\n`);

const analyses = jsFiles.map(analyzeFile);
const recommendations = generateRecommendations(analyses);

printReport(analyses, recommendations);

// Exit with code 1 if critical issues found
const criticalIssues = analyses.filter(a =>
  a.issues.some(i => i.severity === 'error')
);

if (criticalIssues.length > 0) {
  console.error(`\n❌ Found ${criticalIssues.length} files with critical issues`);
  process.exit(1);
}
