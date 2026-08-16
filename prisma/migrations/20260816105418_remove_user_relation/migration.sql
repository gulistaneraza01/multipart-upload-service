-- DropForeignKey
ALTER TABLE "DocumentStore" DROP CONSTRAINT "DocumentStore_userId_fkey";

-- DropIndex
DROP INDEX "DocumentStore_userId_idx";
