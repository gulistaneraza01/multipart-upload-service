-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'COMPLETE', 'ABORT', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentStore" (
    "id" TEXT NOT NULL,
    "uploadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentStore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentStore_uploadId_key" ON "DocumentStore" ("uploadId");

-- CreateIndex
CREATE INDEX "DocumentStore_userId_idx" ON "DocumentStore" ("userId");

-- AddForeignKey
ALTER TABLE "DocumentStore" ADD CONSTRAINT "DocumentStore_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
