-- CreateEnum
CREATE TYPE "ProposalType" AS ENUM ('NEXT_SESSION', 'WEEKLY', 'PLATEAU', 'GOALS');

-- CreateTable
CREATE TABLE "coach_proposals" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "ProposalType" NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'PENDING',
    "input_summary_hash" TEXT NOT NULL,
    "proposal_json" JSONB NOT NULL,
    "rationale" TEXT,

    CONSTRAINT "coach_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_proposals_user_id_idx" ON "coach_proposals"("user_id");

-- CreateIndex
CREATE INDEX "coach_proposals_user_id_type_idx" ON "coach_proposals"("user_id", "type");

-- CreateIndex
CREATE INDEX "coach_proposals_user_id_status_idx" ON "coach_proposals"("user_id", "status");

-- CreateIndex
CREATE INDEX "coach_proposals_input_summary_hash_idx" ON "coach_proposals"("input_summary_hash");

-- AddForeignKey
ALTER TABLE "routine_change_logs" ADD CONSTRAINT "routine_change_logs_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "coach_proposals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coach_proposals" ADD CONSTRAINT "coach_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
