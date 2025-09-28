#!/bin/bash

# Slither Analysis Script for DeFi Vault
# This script runs comprehensive static analysis using Slither

set -e

echo "🔍 Starting Slither Analysis..."

# Create output directory
mkdir -p audits/slither/

# Install slither if not present
if ! command -v slither &> /dev/null; then
    echo "Installing Slither..."
    pip install slither-analyzer
fi

# Clean previous reports
rm -f audits/slither/slither-report.*

echo "📊 Running Slither analysis..."

# Run slither with comprehensive checks
slither . \
    --config-file audits/slither/slither.conf.json \
    --json audits/slither/slither-report.json \
    --sarif audits/slither/slither.sarif \
    --checklist \
    --markdown audits/slither/slither-report.md \
    --zip audits/slither/slither-report.zip \
    --hardhat-ignore-compile \
    --exclude-dependencies \
    --exclude-informational \
    --exclude naming-convention,pragma,solc-version

# Generate summary
echo "📋 Generating analysis summary..."

# Check if critical or high severity issues found
if grep -q '"impact": "High"' audits/slither/slither-report.json; then
    echo "🚨 HIGH SEVERITY ISSUES FOUND!"
    exit 1
elif grep -q '"impact": "Medium"' audits/slither/slither-report.json; then
    echo "⚠️  Medium severity issues found - review required"
else
    echo "✅ No high or medium severity issues found"
fi

# Print summary
echo "📊 Analysis complete. Reports generated:"
echo "   - JSON: audits/slither/slither-report.json"
echo "   - SARIF: audits/slither/slither.sarif"
echo "   - Markdown: audits/slither/slither-report.md"
echo "   - Archive: audits/slither/slither-report.zip"

# Generate quick stats
echo "📈 Quick Stats:"
if [ -f audits/slither/slither-report.json ]; then
    HIGH_COUNT=$(jq '[.results.detectors[] | select(.impact == "High")] | length' audits/slither/slither-report.json 2>/dev/null || echo "0")
    MEDIUM_COUNT=$(jq '[.results.detectors[] | select(.impact == "Medium")] | length' audits/slither/slither-report.json 2>/dev/null || echo "0")
    LOW_COUNT=$(jq '[.results.detectors[] | select(.impact == "Low")] | length' audits/slither/slither-report.json 2>/dev/null || echo "0")
    INFO_COUNT=$(jq '[.results.detectors[] | select(.impact == "Informational")] | length' audits/slither/slither-report.json 2>/dev/null || echo "0")

    echo "   - High severity: $HIGH_COUNT"
    echo "   - Medium severity: $MEDIUM_COUNT"
    echo "   - Low severity: $LOW_COUNT"
    echo "   - Informational: $INFO_COUNT"
fi

echo "🔍 Slither analysis complete!"