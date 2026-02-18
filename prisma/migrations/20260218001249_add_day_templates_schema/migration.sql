-- CreateEnum
CREATE TYPE "TemplateMode" AS ENUM ('FIXED', 'SLOT');

-- CreateEnum
CREATE TYPE "ProgressionEngine" AS ENUM ('DOUBLE_PROGRESSION', 'STRAIGHT_SETS', 'TOP_SET_BACKOFF', 'RPE_BASED', 'NONE');

-- CreateTable
CREATE TABLE "workout_day_templates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "TemplateMode" NOT NULL DEFAULT 'FIXED',
    "default_progression_engine" "ProgressionEngine" NOT NULL DEFAULT 'DOUBLE_PROGRESSION',
    "notes" TEXT,
    "estimated_minutes" INTEGER,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "workout_day_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_day_blocks" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "template_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "exercise_id" TEXT NOT NULL,
    "sets_planned" INTEGER NOT NULL DEFAULT 3,
    "rep_min" INTEGER NOT NULL DEFAULT 8,
    "rep_max" INTEGER NOT NULL DEFAULT 12,
    "rest_seconds" INTEGER NOT NULL DEFAULT 120,
    "progression_engine" "ProgressionEngine",
    "intensity_target" JSONB,
    "notes" TEXT,

    CONSTRAINT "workout_day_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workout_day_slots" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "template_id" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "muscle_group" TEXT NOT NULL,
    "exercise_count" INTEGER NOT NULL DEFAULT 1,
    "pattern_constraints" JSONB,
    "equipment_constraints" JSONB,
    "default_sets" INTEGER NOT NULL DEFAULT 3,
    "default_rep_min" INTEGER NOT NULL DEFAULT 8,
    "default_rep_max" INTEGER NOT NULL DEFAULT 12,
    "notes" TEXT,

    CONSTRAINT "workout_day_slots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "workout_day_templates_user_id_idx" ON "workout_day_templates"("user_id");

-- CreateIndex
CREATE INDEX "workout_day_blocks_template_id_idx" ON "workout_day_blocks"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_day_blocks_template_id_order_index_key" ON "workout_day_blocks"("template_id", "order_index");

-- CreateIndex
CREATE INDEX "workout_day_slots_template_id_idx" ON "workout_day_slots"("template_id");

-- CreateIndex
CREATE UNIQUE INDEX "workout_day_slots_template_id_order_index_key" ON "workout_day_slots"("template_id", "order_index");

-- AddForeignKey
ALTER TABLE "split_schedule_days" ADD CONSTRAINT "split_schedule_days_workout_day_template_id_fkey" FOREIGN KEY ("workout_day_template_id") REFERENCES "workout_day_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_templates" ADD CONSTRAINT "workout_day_templates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_blocks" ADD CONSTRAINT "workout_day_blocks_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workout_day_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_blocks" ADD CONSTRAINT "workout_day_blocks_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "exercises"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workout_day_slots" ADD CONSTRAINT "workout_day_slots_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "workout_day_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
