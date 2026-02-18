-- CreateEnum
CREATE TYPE "GoalMode" AS ENUM ('HYPERTROPHY', 'STRENGTH', 'HYBRID');

-- CreateEnum
CREATE TYPE "UnitSystem" AS ENUM ('METRIC', 'IMPERIAL');

-- CreateEnum
CREATE TYPE "EquipmentAccess" AS ENUM ('COMMERCIAL', 'HOME');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "constraints" JSONB DEFAULT '{}',
ADD COLUMN     "days_per_week" INTEGER,
ADD COLUMN     "equipment" "EquipmentAccess" DEFAULT 'COMMERCIAL',
ADD COLUMN     "goal_mode" "GoalMode",
ADD COLUMN     "onboarding_complete" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "password" TEXT,
ADD COLUMN     "session_minutes" INTEGER,
ADD COLUMN     "units" "UnitSystem" DEFAULT 'IMPERIAL';
