/**
 * Test Runner Script
 * 
 * This script runs all tests for the hotel booking system
 * and generates a report of the results.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const testDirs = [
  'unit/controllers',
  'integration'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Results storage
const results = {
  passed: 0,
  failed: 0,
  skipped: 0,
  total: 0,
  failedTests: []
};

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, 'reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir);
}

/**
 * Run tests in a specific directory
 * @param {string} testDir - Directory containing test files
 */
function runTestsInDirectory(testDir) {
  const fullPath = path.join(__dirname, testDir);
  
  // Check if directory exists
  if (!fs.existsSync(fullPath)) {
    console.log(`${colors.yellow}⚠️ Directory not found: ${fullPath}${colors.reset}`);
    return;
  }
  
  // Get all test files in directory
  const testFiles = fs.readdirSync(fullPath)
    .filter(file => file.endsWith('.test.js'));
  
  if (testFiles.length === 0) {
    console.log(`${colors.yellow}⚠️ No test files found in: ${fullPath}${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.bright}${colors.blue}Running tests in ${testDir}${colors.reset}`);
  console.log(`${colors.dim}${'='.repeat(50)}${colors.reset}`);
  
  // Run each test file
  testFiles.forEach(file => {
    const testFile = path.join(fullPath, file);
    const relativePath = path.relative(__dirname, testFile);
    
    console.log(`\n${colors.cyan}▶ Running: ${file}${colors.reset}`);
    
    try {
      // Run test with Mocha
      execSync(`npx mocha "${testFile}" --reporter spec`, { 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      console.log(`${colors.green}✓ Passed: ${file}${colors.reset}`);
      results.passed++;
    } catch (error) {
      console.log(`${colors.red}✗ Failed: ${file}${colors.reset}`);
      results.failed++;
      results.failedTests.push(relativePath);
    }
    
    results.total++;
  });
}

/**
 * Generate test report
 */
function generateReport() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportsDir, `test-report-${timestamp}.json`);
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.total,
      passed: results.passed,
      failed: results.failed,
      skipped: results.skipped,
      passRate: results.total > 0 ? (results.passed / results.total * 100).toFixed(2) + '%' : 'N/A'
    },
    failedTests: results.failedTests
  };
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n${colors.bright}Test report saved to: ${reportPath}${colors.reset}`);
}

/**
 * Print test summary
 */
function printSummary() {
  console.log(`\n${colors.bright}${colors.blue}Test Summary${colors.reset}`);
  console.log(`${colors.dim}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}Total Tests:    ${results.total}${colors.reset}`);
  console.log(`${colors.green}Passed:         ${results.passed}${colors.reset}`);
  console.log(`${colors.red}Failed:         ${results.failed}${colors.reset}`);
  console.log(`${colors.yellow}Skipped:        ${results.skipped}${colors.reset}`);
  
  const passRate = results.total > 0 ? (results.passed / results.total * 100).toFixed(2) + '%' : 'N/A';
  console.log(`${colors.bright}Pass Rate:      ${passRate}${colors.reset}`);
  
  if (results.failedTests.length > 0) {
    console.log(`\n${colors.red}${colors.bright}Failed Tests:${colors.reset}`);
    results.failedTests.forEach(test => {
      console.log(`${colors.red}- ${test}${colors.reset}`);
    });
  }
}

/**
 * Main function
 */
function main() {
  console.log(`${colors.bright}${colors.blue}Hotel Booking System Test Runner${colors.reset}`);
  console.log(`${colors.dim}${'='.repeat(50)}${colors.reset}`);
  console.log(`${colors.bright}Starting tests at: ${new Date().toLocaleString()}${colors.reset}`);
  
  // Run tests in each directory
  testDirs.forEach(runTestsInDirectory);
  
  // Print summary and generate report
  printSummary();
  generateReport();
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the main function
main();
