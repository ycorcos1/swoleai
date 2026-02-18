-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "program_blocks" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,

    CONSTRAINT "program_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_versions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "program_block_id" TEXT,
    "changelog" TEXT,
    "version_number" INTEGER NOT NULL,
    "snapshot_json" JSONB NOT NULL,

    CONSTRAINT "routine_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_change_logs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" TEXT NOT NULL,
    "from_version_id" TEXT NOT NULL,
    "to_version_id" TEXT NOT NULL,
    "proposal_id" TEXT,
    "patch_ops_json" JSONB NOT NULL,

    CONSTRAINT "routine_change_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_blocks_user_id_idx" ON "program_blocks"("user_id");

-- CreateIndex
CREATE INDEX "program_blocks_user_id_start_date_idx" ON "program_blocks"("user_id", "start_date");

-- CreateIndex
CREATE INDEX "routine_versions_user_id_idx" ON "routine_versions"("user_id");

-- CreateIndex
CREATE INDEX "routine_versions_user_id_version_number_idx" ON "routine_versions"("user_id", "version_number");

-- CreateIndex
CREATE INDEX "routine_versions_program_block_id_idx" ON "routine_versions"("program_block_id");

-- CreateIndex
CREATE INDEX "routine_change_logs_user_id_idx" ON "routine_change_logs"("user_id");

-- CreateIndex
CREATE INDEX "routine_change_logs_from_version_id_idx" ON "routine_change_logs"("from_version_id");

-- CreateIndex
CREATE INDEX "routine_change_logs_to_version_id_idx" ON "routine_change_logs"("to_version_id");

-- CreateIndex
CREATE INDEX "routine_change_logs_proposal_id_idx" ON "routine_change_logs"("proposal_id");

-- AddForeignKey
ALTER TABLE "program_blocks" ADD CONSTRAINT "program_blocks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_versions" ADD CONSTRAINT "routine_versions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_versions" ADD CONSTRAINT "routine_versions_program_block_id_fkey" FOREIGN KEY ("program_block_id") REFERENCES "program_blocks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_change_logs" ADD CONSTRAINT "routine_change_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_change_logs" ADD CONSTRAINT "routine_change_logs_from_version_id_fkey" FOREIGN KEY ("from_version_id") REFERENCES "routine_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_change_logs" ADD CONSTRAINT "routine_change_logs_to_version_id_fkey" FOREIGN KEY ("to_version_id") REFERENCES "routine_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
