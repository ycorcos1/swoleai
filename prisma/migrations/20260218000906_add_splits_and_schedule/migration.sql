-- CreateEnum
CREATE TYPE "Weekday" AS ENUM ('SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY');

-- CreateTable
CREATE TABLE "splits" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "split_schedule_days" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "split_id" TEXT NOT NULL,
    "weekday" "Weekday" NOT NULL,
    "workout_day_template_id" TEXT,
    "is_rest" BOOLEAN NOT NULL DEFAULT false,
    "label" TEXT,

    CONSTRAINT "split_schedule_days_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "splits_user_id_idx" ON "splits"("user_id");

-- CreateIndex
CREATE INDEX "splits_user_id_is_active_idx" ON "splits"("user_id", "is_active");

-- CreateIndex
CREATE INDEX "split_schedule_days_split_id_idx" ON "split_schedule_days"("split_id");

-- CreateIndex
CREATE UNIQUE INDEX "split_schedule_days_split_id_weekday_key" ON "split_schedule_days"("split_id", "weekday");

-- AddForeignKey
ALTER TABLE "splits" ADD CONSTRAINT "splits_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "split_schedule_days" ADD CONSTRAINT "split_schedule_days_split_id_fkey" FOREIGN KEY ("split_id") REFERENCES "splits"("id") ON DELETE CASCADE ON UPDATE CASCADE;
