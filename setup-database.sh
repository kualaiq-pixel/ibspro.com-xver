#!/bin/bash
# ============================================
# IBS Pro - Database Setup Script
# Run this AFTER cloning the repo locally
# ============================================

set -e

echo ""
echo "=========================================="
echo "  IBS Pro - Supabase Database Setup"
echo "=========================================="
echo ""

# Check node
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js not installed. Download from https://nodejs.org"
    exit 1
fi

echo "[1/4] Installing dependencies..."
npm install

echo ""
echo "[2/4] Creating .env.local..."
cat > .env.local << 'ENVEOF'
DATABASE_URL=postgresql://postgres:May1921Sul@@102030@db.yolptlufhmpsdyjofdjj.supabase.co:5432/postgres
AUTH_SECRET=ibspro-secret-2024-change-in-production
ENVEOF
echo "Done."

echo ""
echo "[3/4] Pushing database schema to Supabase..."
npx prisma generate
npx prisma db push

echo ""
echo "[4/4] Seeding admin user (khaleel / 586627) and demo user..."
npx prisma db seed

echo ""
echo "=========================================="
echo "  SUCCESS! Database is ready."
echo "=========================================="
echo ""
echo "  Admin:      khaleel / 586627"
echo "  Demo User:  DEMO001 / demouser / demo1234"
echo ""
echo "  Next: Deploy to Vercel → https://vercel.com/new"
echo ""
echo "  Add these env vars on Vercel:"
echo "    DATABASE_URL = postgresql://postgres:May1921Sul%40%40102030@db.yolptlufhmpsdyjofdjj.supabase.co:5432/postgres"
echo "    AUTH_SECRET = ibspro-secret-2024-change-in-production"
echo ""
