-- AlterTable
ALTER TABLE "Achievement" ADD COLUMN     "certificateData" TEXT,
ADD COLUMN     "certificateName" TEXT,
ADD COLUMN     "certificateType" TEXT,
ALTER COLUMN "verificationStatus" SET DEFAULT 'unverified';
