#!/bin/bash
# ============================================
# IBS Pro - Push to GitHub Script
# ============================================
# Run this script from your local machine after cloning/copying the project

set -e

REPO_NAME="ibspro.com-xver"
GITHUB_USER="${1:-xver-group}"  # Pass your GitHub username as first argument

echo "========================================="
echo "  IBS Pro - GitHub Push Setup"
echo "========================================="
echo ""
echo "Repo: github.com/$GITHUB_USER/$REPO_NAME"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "ERROR: GitHub CLI (gh) is not installed."
    echo ""
    echo "Install it from: https://cli.github.com/"
    echo ""
    echo "Or create the repo manually at:"
    echo "  https://github.com/new"
    echo ""
    echo "Then run:"
    echo "  git remote set-url origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
    echo "  git push -u origin main"
    exit 1
fi

# Check authentication
echo "Checking GitHub authentication..."
if ! gh auth status &> /dev/null; then
    echo "ERROR: Not authenticated with GitHub."
    echo "Run: gh auth login"
    echo "  → Choose 'GitHub.com'"
    echo "  → Choose 'HTTPS'"
    echo "  → Choose 'Login with a web browser'"
    echo ""
    echo "Or use a Personal Access Token:"
    echo "  echo 'YOUR_GITHUB_TOKEN' | gh auth login --with-token"
    exit 1
fi

echo "✓ Authenticated as: $(gh api user --jq .login)"
echo ""

# Create the GitHub repository
echo "Creating repository '$REPO_NAME'..."
gh repo create "$GITHUB_USER/$REPO_NAME" \
    --public \
    --description "IBS Pro - Income & Billing System Pro | Next.js 16 + Supabase" \
    --source=. \
    --remote=origin \
    --push 2>&1

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "  SUCCESS!"
    echo "========================================="
    echo ""
    echo "Your repo is live at:"
    echo "  https://github.com/$GITHUB_USER/$REPO_NAME"
    echo ""
    echo "Next steps:"
    echo "  1. Create Supabase project → supabase.com"
    echo "  2. Copy the PostgreSQL connection string"
    echo "  3. Deploy to Vercel → vercel.com/new"
    echo "  4. Add DATABASE_URL and AUTH_SECRET env vars"
    echo ""
    echo "See README.md for full deployment guide."
else
    echo ""
    echo "If the repo already exists, push manually:"
    echo "  git remote set-url origin https://github.com/$GITHUB_USER/$REPO_NAME.git"
    echo "  git push -u origin main"
fi
