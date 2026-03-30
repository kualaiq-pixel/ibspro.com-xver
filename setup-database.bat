@echo off
REM ============================================
REM IBS Pro - Database Setup Script
REM Run this AFTER cloning the repo locally
REM ============================================

echo.
echo ============================================
echo   IBS Pro - Supabase Database Setup
echo ============================================
echo.

REM Check if node is installed
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed.
    echo Download from: https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Installing dependencies...
call npm install
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: npm install failed
    pause
    exit /b 1
)

echo.
echo [2/4] Creating .env.local file...
(
echo DATABASE_URL=postgresql://postgres:May1921Sul@@102030@db.yolptlufhmpsdyjofdjj.supabase.co:5432/postgres
echo AUTH_SECRET=ibspro-secret-2024-change-in-production
) > .env.local
echo Done.

echo.
echo [3/4] Pushing database schema to Supabase...
call npx prisma generate
call npx prisma db push
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to push schema. Check your DATABASE_URL.
    pause
    exit /b 1
)

echo.
echo [4/4] Seeding admin user ^(khaleel / 586627^) and demo user...
call npx prisma db seed
IF %ERRORLEVEL% NEQ 0 (
    echo ERROR: Seed failed. Try running manually: npx prisma db seed
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SUCCESS! Database is ready.
echo ============================================
echo.
echo   Admin:     khaleel / 586627
echo   Demo User: DEMO001 / demouser / demo1234
echo.
echo   Next step: Deploy to Vercel
echo   https://vercel.com/new
echo.
echo   Add these env vars on Vercel:
echo     DATABASE_URL = postgresql://postgres:May1921Sul%%40%%40102030@db.yolptlufhmpsdyjofdjj.supabase.co:5432/postgres
echo     AUTH_SECRET = ibspro-secret-2024-change-in-production
echo.
pause
