-- CreateTable
CREATE TABLE "Shop" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shopDomain" TEXT NOT NULL,
    "juniorTag" TEXT NOT NULL DEFAULT 'b2b-junior',
    "managerEmailFallback" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "token" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "requesterCustomerId" TEXT,
    "requesterEmail" TEXT,
    "requesterName" TEXT,
    "requesterNote" TEXT,
    "managerEmail" TEXT NOT NULL,
    "cartItems" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalPrice" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" DATETIME NOT NULL,
    "draftOrderId" TEXT,
    "draftOrderInvoiceUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    CONSTRAINT "ApprovalRequest_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("shopDomain") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopDomain_key" ON "Shop"("shopDomain");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalRequest_token_key" ON "ApprovalRequest"("token");
