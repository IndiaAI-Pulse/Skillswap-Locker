/*
  Warnings:

  - A unique constraint covering the columns `[sessionId,role]` on the table `Credential` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Credential_sessionId_key";

-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'learner';

-- CreateIndex
CREATE UNIQUE INDEX "Credential_sessionId_role_key" ON "Credential"("sessionId", "role");
