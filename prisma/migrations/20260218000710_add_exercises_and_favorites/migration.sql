-- CreateEnum
CREATE TYPE "ExerciseType" AS ENUM ('BARBELL', 'DUMBBELL', 'MACHINE', 'CABLE', 'BODYWEIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "MovementPattern" AS ENUM ('HORIZONTAL_PUSH', 'HORIZONTAL_PULL', 'VERTICAL_PUSH', 'VERTICAL_PULL', 'HIP_HINGE', 'SQUAT', 'LUNGE', 'ISOLATION', 'CARRY', 'CORE', 'OTHER');

-- CreateEnum
CREATE TYPE "FavoritePriority" AS ENUM ('PRIMARY', 'BACKUP');

-- CreateTable
CREATE TABLE "exercises" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "type" "ExerciseType" NOT NULL DEFAULT 'OTHER',
    "pattern" "MovementPattern" NOT NULL DEFAULT 'OTHER',
    "muscle_groups" JSONB NOT NULL DEFAULT '[]',
    "equipment_tags" JSONB NOT NULL DEFAULT '[]',
    "joint_stress_flags" JSONB NOT NULL DEFAULT '{}',
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "owner_user_id" TEXT,

    CONSTRAINT "exercises_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "priority" "FavoritePriority" NOT NULL DEFAULT 'PRIMARY',
    "tags" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exercises_owner_user_id_is_custom_idx" ON "exercises"("owner_user_id", "is_custom");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_exercise_id_key" ON "favorites"("user_id", "exercise_id");

-- AddForeignKey
ALTER TABLE "exercises" ADD CONSTRAINT "exercises_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE CASCADE ON UPDATE CASCADE;
