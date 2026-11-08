# Current Demo Two cleanup inspection — November 8, 2026

## Correct project identification

Started from a clean Git tree after the attachment fix. That fix was not changed.
Queried projects with **no studio_project_deletions record**, rather than using
the old project ID or relying on a displayed name alone.

| Active project | ID | Created (UTC) |
|---|---|---|
| demo | dad5f4ec-aae4-4789-8d7a-7c353d174f7d | 2026-11-08T07:00:20.389Z |
| demo 2 | 889fc13d-d8ef-479e-9618-217ab730789d | 2026-11-08T15:02:06.582Z |

There is exactly one active Demo Two/demo 2 match. Its creation time is
10:02:06 AM Eastern. Its actual project connection points to the workspace
named with ID `889fc13d-d8ef-479e-9618-217ab730789d`.
Its saved chat is `79a91bf8-d940-415e-a92b-98e38638dff7`.

## Complete non-Git file inventory and deletion decision

| File | Bytes | Decision |
|---|---:|---|
| .devsquad-init.json | 762 | Preserve internal workspace metadata |
| .devsquad-root.json | 635 | Preserve internal workspace metadata |
| AGENTS.md | 1,774 | Preserve project instructions |
| demo.test.cjs | 3,398 | Preserve actual application tests |
| index.html | 1,883 | Preserve actual application |
| references/974ea4f4-0f4b-4beb-98ae-5e6553e4d2d2.mp4 | 29,665 | Preserve saved video attachment |
| references/f49022c6-6b24-49f5-a9ab-d8c1e775252e.png | 134,770 | Preserve saved image attachment |

Git internals are not project content and were not inspected or changed.

**Candidate stray .txt files: none. Deleted files: none.** No file-delete,
project-delete or restore action was performed. The old soft-deleted Demo Two,
all other projects, chat history and attachment contents were left alone.

## Investigation of the reported Builder leftovers

The current project's saved revisions contain only `index.html` and
`demo.test.cjs`. Its recorded filesystem changes describe those files and the
two saved attachments. There are no .txt revisions or .txt filesystem events,
and no recorded file operations for this project.

Thus neither the stray filenames nor their source can be established from
current disk contents or retained project records. This is **UNVERIFIED**, not
proof that an old run was a one-off. No source fix or filename-based exclusion
was invented for an unobserved file. Legitimate application tests and metadata
must not be deleted just because they contain text or agent-related wording.

## Chrome verification and preservation

Used **Playwright-controlled local Google Chrome**, not Computer Use and not
an owner-performed test. Opened the exact active project/chat route on the
regular dashboard, refreshed the project-file list, opened Files, scrolled the
actual `Open file index.html` control into view, and captured screenshots.

- Correct active project opened.
- Refreshed list contains no .txt entries.
- `index.html` remains visible in the actual file panel.
- The file-list API still reports both media attachments under references/.
- Zero browser POST requests: no Send, Run, deletion or model execution.
- All seven non-Git file hashes unchanged across inspection and restart.
- Local evidence: `data/demo-two-cleanup/` (ignored; not committed).

The missing strays cannot be visually demonstrated as *removed*, because they
were already absent at the first correct-project inspection. Before/after
inventories and Chrome screenshots establish the actual current state only.

## Tests, maintenance and scope

- Focused file-action/inspection suite: **27/27 passed**, zero failures/skips.
- Full serial suite: **754/754 passed**, zero failed/skipped/cancelled; 480,397.0585 ms.
- Supported SQLite backup verified before restarting only the identified idle
  Dev Squad backend. No active chats or executions were present.
- Previous PID: 34652. New PID: **19624**. Health: **HTTP 200, status ok**.
- No application code changes were necessary or made. No changes to the
  attachment repair, budgets, folder locks, Zapier, credentials or routing.
- This checkpoint records inspection evidence and the unresolved discrepancy;
  it does not claim a cleanup or source repair that did not occur.
- .env, databases, backups, screenshots and logs are excluded from staging.
