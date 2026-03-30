-- ============================================================
-- IBS Pro - Complete Database Setup
-- Paste this ENTIRE SQL into Supabase SQL Editor and click RUN
-- ============================================================

-- ============ 1. CREATE ALL TABLES ============

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "username" TEXT UNIQUE,
  "password" TEXT,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'user',
  "avatar" TEXT,
  "phone" TEXT,
  "language" TEXT NOT NULL DEFAULT 'en',
  "currency" TEXT NOT NULL DEFAULT 'EUR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Session" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");
CREATE INDEX IF NOT EXISTS "Session_token_idx" ON "Session"("token");

CREATE TABLE IF NOT EXISTS "Company" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "companyCode" TEXT NOT NULL UNIQUE,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT,
  "postalCode" TEXT,
  "logo" TEXT,
  "vatNumber" TEXT,
  "website" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CompanyUser" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'staff',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyUser_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CompanyUser_userId_companyId_key" UNIQUE ("userId", "companyId")
);
CREATE INDEX IF NOT EXISTS "CompanyUser_companyId_idx" ON "CompanyUser"("companyId");

CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "plan" TEXT NOT NULL DEFAULT 'monthly',
  "status" TEXT NOT NULL DEFAULT 'trial',
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endDate" TIMESTAMP(3),
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "stripeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Subscription_status_idx" ON "Subscription"("status");

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "address" TEXT,
  "city" TEXT,
  "country" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Customer_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Customer_companyId_idx" ON "Customer"("companyId");

CREATE TABLE IF NOT EXISTS "Income" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT,
  "category" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "referenceNo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Income_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Income_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Income_companyId_idx" ON "Income"("companyId");
CREATE INDEX IF NOT EXISTS "Income_date_idx" ON "Income"("date");

CREATE TABLE IF NOT EXISTS "Expense" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "category" TEXT,
  "amount" DOUBLE PRECISION NOT NULL,
  "description" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "vendor" TEXT,
  "referenceNo" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Expense_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Expense_companyId_idx" ON "Expense"("companyId");
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

CREATE TABLE IF NOT EXISTS "Invoice" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "issueDate" TIMESTAMP(3) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "items" TEXT NOT NULL,
  "subtotal" DOUBLE PRECISION NOT NULL,
  "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total" DOUBLE PRECISION NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Invoice_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Invoice_companyId_idx" ON "Invoice"("companyId");
CREATE INDEX IF NOT EXISTS "Invoice_customerId_idx" ON "Invoice"("customerId");
CREATE INDEX IF NOT EXISTS "Invoice_status_idx" ON "Invoice"("status");

CREATE TABLE IF NOT EXISTS "Booking" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'pending',
  "location" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Booking_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Booking_companyId_idx" ON "Booking"("companyId");
CREATE INDEX IF NOT EXISTS "Booking_startDate_idx" ON "Booking"("startDate");
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");

CREATE TABLE IF NOT EXISTS "WorkOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "assignedTo" TEXT,
  "dueDate" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkOrder_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "WorkOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "WorkOrder_companyId_idx" ON "WorkOrder"("companyId");
CREATE INDEX IF NOT EXISTS "WorkOrder_status_idx" ON "WorkOrder"("status");
CREATE INDEX IF NOT EXISTS "WorkOrder_priority_idx" ON "WorkOrder"("priority");

CREATE TABLE IF NOT EXISTS "Certificate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "certificateNo" TEXT NOT NULL,
  "issueDate" TIMESTAMP(3) NOT NULL,
  "expiryDate" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Certificate_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Certificate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Certificate_companyId_idx" ON "Certificate"("companyId");
CREATE INDEX IF NOT EXISTS "Certificate_status_idx" ON "Certificate"("status");

CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "isAdmin" BOOLEAN NOT NULL DEFAULT false,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ChatMessage_userId_idx" ON "ChatMessage"("userId");
CREATE INDEX IF NOT EXISTS "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");

CREATE TABLE IF NOT EXISTS "ActivityLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

CREATE TABLE IF NOT EXISTS "SystemSettings" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "key" TEXT NOT NULL UNIQUE,
  "value" TEXT NOT NULL
);


-- ============ 2. ENABLE UPDATEDAT TRIGGER ============

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_updatedAt" BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "Company_updatedAt" BEFORE UPDATE ON "Company" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "Subscription_updatedAt" BEFORE UPDATE ON "Subscription" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "Customer_updatedAt" BEFORE UPDATE ON "Customer" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "Income_updatedAt" BEFORE UPDATE ON "Income" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "Expense_updatedAt" BEFORE UPDATE ON "Expense" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "Invoice_updatedAt" BEFORE UPDATE ON "Invoice" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "Booking_updatedAt" BEFORE UPDATE ON "Booking" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "WorkOrder_updatedAt" BEFORE UPDATE ON "WorkOrder" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER "Certificate_updatedAt" BEFORE UPDATE ON "Certificate" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ============ 3. SEED DATA ============

-- Admin User: khaleel / 586627
INSERT INTO "User" ("id", "email", "username", "password", "name", "role", "isActive")
VALUES (
  '903be2a1-ca13-4af7-8304-17ba6230104a',
  'admin@ibspro.com',
  'khaleel',
  '$2b$12$kt5pCML5EEOKLyyb7q8TUuFtKzJjePld3jPwQrvPxYiAAcOIvgiBK',
  'Khaleel',
  'admin',
  true
);

-- Demo Company
INSERT INTO "Company" ("id", "name", "companyCode", "email", "city", "country", "isActive")
VALUES (
  'b9aebc96-4310-4276-9311-9222d4ea1b2d',
  'Demo Company',
  'DEMO001',
  'demo@ibspro.com',
  'Helsinki',
  'Finland',
  true
);

-- Demo User: demouser / demo1234
INSERT INTO "User" ("id", "email", "username", "password", "name", "role", "isActive")
VALUES (
  '1a3bdee4-36e5-42cb-9193-da890c6d9a87',
  'demo@ibspro.com',
  'demouser',
  '$2b$12$0kBQ9kHu0fIhvp8KNqVcme1SD14KDXSVvkw12FQa9QtaLjKwmfoCa',
  'Demo User',
  'user',
  true
);

-- Link Demo User to Demo Company
INSERT INTO "CompanyUser" ("userId", "companyId", "role")
VALUES ('1a3bdee4-36e5-42cb-9193-da890c6d9a87', 'b9aebc96-4310-4276-9311-9222d4ea1b2d', 'owner');

-- Demo Subscription (30-day trial)
INSERT INTO "Subscription" ("userId", "plan", "status", "endDate")
VALUES ('1a3bdee4-36e5-42cb-9193-da890c6d9a87', 'monthly', 'trial', CURRENT_TIMESTAMP + INTERVAL '30 days');


-- ============ DONE! ============
-- You should see "Success" with no errors.
-- Test accounts:
--   Admin:     khaleel / 586627
--   Demo User: DEMO001 / demouser / demo1234
