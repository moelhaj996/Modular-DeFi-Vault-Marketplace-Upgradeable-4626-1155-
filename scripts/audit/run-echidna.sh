#!/bin/bash

# Echidna Fuzzing Script for DeFi Vault
# This script runs property-based fuzzing tests using Echidna

set -e

echo "🔍 Starting Echidna Fuzzing..."

# Create output directory
mkdir -p audits/echidna/corpus
mkdir -p audits/echidna/reports

# Check if echidna is installed
if ! command -v echidna &> /dev/null; then
    echo "❌ Echidna not found. Please install it first:"
    echo "   https://github.com/crytic/echidna#installation"
    exit 1
fi

# Clean previous reports
rm -f audits/echidna/reports/*

echo "🔨 Compiling contracts..."

# Ensure contracts are compiled
npx hardhat compile

echo "🧪 Running Echidna fuzzing..."

# Run echidna with our configuration
echidna audits/echidna/VaultEchidna.sol \
    --config audits/echidna/echidna.yaml \
    --contract VaultEchidna \
    --corpus-dir audits/echidna/corpus \
    2>&1 | tee audits/echidna/reports/echidna-output.txt

# Check results
echo "📊 Analyzing results..."

if grep -q "FAILED" audits/echidna/reports/echidna-output.txt; then
    echo "🚨 PROPERTY VIOLATIONS FOUND!"
    echo "Failed properties:"
    grep "FAILED" audits/echidna/reports/echidna-output.txt
    exit 1
elif grep -q "PASSED" audits/echidna/reports/echidna-output.txt; then
    echo "✅ All properties passed!"
else
    echo "⚠️  Unclear results - manual review required"
fi

# Generate summary report
echo "📋 Generating summary..."

cat > audits/echidna/reports/summary.md << EOF
# Echidna Fuzzing Results

**Date**: $(date)
**Duration**: $(grep "Running for" audits/echidna/reports/echidna-output.txt | tail -1 || echo "Unknown")
**Test Limit**: 50000 tests

## Properties Tested

1. **echidna_total_assets_consistency**: Total assets = vault balance + strategy assets
2. **echidna_share_price_monotonic**: Share price should never decrease without withdrawals
3. **echidna_allocation_bounds**: Strategy allocations ≤ 100%
4. **echidna_user_balance_consistency**: User shares ≤ total supply
5. **echidna_no_token_creation**: No unexpected token creation
6. **echidna_fee_bounds**: Fees within acceptable limits

## Results

\`\`\`
$(cat audits/echidna/reports/echidna-output.txt | grep -E "(PASSED|FAILED|echidna_)")
\`\`\`

## Coverage Information

$(grep -A 10 "Coverage:" audits/echidna/reports/echidna-output.txt || echo "Coverage information not available")

## Recommendations

$(if grep -q "FAILED" audits/echidna/reports/echidna-output.txt; then
    echo "- Review and fix failed properties"
    echo "- Analyze counterexamples in corpus directory"
    echo "- Enhance property definitions if needed"
else
    echo "- All invariants held during fuzzing"
    echo "- Consider adding more properties for edge cases"
    echo "- Review corpus for interesting test cases"
fi)
EOF

echo "📊 Fuzzing complete. Reports generated:"
echo "   - Full output: audits/echidna/reports/echidna-output.txt"
echo "   - Summary: audits/echidna/reports/summary.md"
echo "   - Corpus: audits/echidna/corpus/"

# Show final status
if grep -q "FAILED" audits/echidna/reports/echidna-output.txt; then
    echo "🚨 Fuzzing found property violations!"
    exit 1
else
    echo "✅ Fuzzing completed successfully!"
fi