# Learning memory

This is a small searchable experience database, not model training or fine-tuning.

1. Record a mistake with `POST /api/mistakes`: taskId, agentId, category, description, detectionMethod; optional providerId, model and context. The project is derived from the task.
2. Record the correction with `POST /api/mistakes/:id/corrections`: correctingAgent (the actual person or agent), summary, verificationStatus (`unverified` or `verified`), testResults, seniorReviewStatus (`pending`, `approved`, `rejected`). These are explicit manual attestations, not automatically executed tests.
3. Create a lesson with `POST /api/lessons`: correctionId, summary, category. It starts unverified and pending even if the correction is verified.
4. After checking the evidence, approve with `POST /api/lessons/:id/approve`: approvedBy. Approval fails unless the correction has verified test evidence and an approved senior review status.
5. Read `GET /api/projects/:id/lessons?category=auth`. Only verified, approved lessons with a still-verified and approved correction are eligible.

Retrieval matches the current project and exact category. It returns at most five lessons within `AI_LESSON_CHARS` (default 2,000). Other projects' lessons never enter the prompt. Duplicates are detected using a normalized, case-insensitive summary hash within project/category; this is exact normalized matching, not semantic deduplication.

The request includes lessons in a JSON `referenceLessons` array in the user-data message. They are never appended as privileged system instructions. The server independently enforces permissions, spending restrictions, file validation and review states. Prompt wording cannot guarantee a model will ignore every injection, so generated code remains untrusted and must be reviewed; the model has no tools, shell or database access.

Manual attestations require a trusted local operator. This backend does not authenticate reviewer identities, and does not claim that Claude or Codex performed a review merely because a record exists. Use the real reviewer's identity and accurate evidence. Automated senior review integrations remain deferred.

Performance records count static-validation successes/failures and review events by agent, provider, model and task category. A successful generation means its draft passed static validation, not that the coding task was completed. `reported_tokens` sums only available total-token reports; inspect the usage ledger to see unknown attempts.
