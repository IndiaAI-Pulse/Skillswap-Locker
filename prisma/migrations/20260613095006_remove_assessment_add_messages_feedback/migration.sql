/*
  Warnings:

  - You are about to drop the column `knowledge` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the column `reliability` on the `Feedback` table. All the data in the column will be lost.
  - You are about to drop the `Assessment` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `contentQuality` to the `Feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `overallExperience` to the `Feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patience` to the `Feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preparedness` to the `Feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `punctuality` to the `Feedback` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teachingQuality` to the `Feedback` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Assessment" DROP CONSTRAINT "Assessment_sessionId_fkey";

-- AlterTable
ALTER TABLE "Feedback" DROP COLUMN "knowledge",
DROP COLUMN "reliability",
ADD COLUMN     "contentQuality" INTEGER NOT NULL,
ADD COLUMN     "overallExperience" INTEGER NOT NULL,
ADD COLUMN     "patience" INTEGER NOT NULL,
ADD COLUMN     "preparedness" INTEGER NOT NULL,
ADD COLUMN     "punctuality" INTEGER NOT NULL,
ADD COLUMN     "teachingQuality" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Assessment";

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
