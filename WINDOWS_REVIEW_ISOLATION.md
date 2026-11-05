# Windows review isolation decision report

## Active roadmap superseded — multi-model task, 2026-10-21

The owner has retired Linux/WSL2 automatic review integration from active development. Historical inspection results and conditional recommendations below are preserved for reference only. They are not the current implementation plan. Do not provision WSL workers or implement a local Codex bridge. Claude Code and Codex remain optional manual senior reviewers; automatic CLI reviews stay disabled. This roadmap update makes no Windows/Ubuntu configuration change and does not uninstall WSL.

## 2026-10-21 — Authorized Ubuntu inspection blocked by memory gate

At 2026-10-21T17:10:43.7219871Z (13:10:43 EDT), the read-only Windows CIM check reported 831,312 KiB available physical memory, approximately **0.793 GiB**. The owner's required minimum was 2,097,152 KiB (**2 GiB**). The gate failed, so the inspection stopped before any WSL command or Ubuntu startup.

**VERIFIED:** Windows available-memory measurement only. No applications were closed and no attempt was made to free memory. No Linux commands, package installs, authentication, credential inspection, model requests, configuration/mount/permission changes, application code changes, SQLite writes, service restarts, CoachLab edits or GitHub push occurred. Only this report and PROMPT_LOG.md were updated. Automatic-review settings were not changed.

**UNVERIFIED:** Ubuntu's current state, release, systemd, mounts, interoperability, Linux Node/npm/Codex, sandbox prerequisites and network exposure were not rechecked. Earlier findings below remain historical evidence; no new Linux compatibility or isolation conclusion is established. No instance was started by this task, so there is no inspection-owned Ubuntu instance to stop.

**BLOCKER:** Available Windows memory is below the owner's explicit minimum. Existing filesystem and network isolation risks remain unresolved; automatic reviews must remain disabled.

**NEXT STEP / OWNER APPROVAL REQUIRED:** After the owner makes sufficient memory available, rerun the memory gate before the already-authorized bounded Ubuntu inspection. No additional approval is needed for those read-only checks within the stated scope. Installation, authentication, security/configuration changes, bridge implementation and live model requests remain outside that authorization and require separate approval. Do not automatically wait, retry or start Ubuntu based on a later unobserved memory assumption.

Date: 2026-10-21. Investigation only; no review bridge was implemented and no model request was submitted.

## Decision

Keep automatic Codex review disabled. Keep the existing manual Claude Code and Codex packet handoffs usable. For a future proof of isolation, evaluate a **dedicated WSL2 review distribution** with a Linux-native Codex installation and a fresh owner login. This is a proposed path, not a verified security boundary on this machine. Native MXC is also worth revisiting with vendor-supported version/configuration diagnostics, but the local probe did not establish it works.

Neither a separate folder nor a Git worktree is sufficient. Do not give the current reviewer unrestricted host read access to make startup succeed.

## Why the previous sandbox failed

The installed app-bundled CLI is `0.163.0-alpha.10.2`. The prior probe used a named permission profile allowing only minimal runtime reads plus the isolated workspace, with command networking disabled. It exited before running its harmless test program:

> windows sandbox failed: elevated Windows sandbox requires effective `:root` read access

This establishes that the requested profile was rejected by the selected Windows backend. It does not establish that all Windows isolation is impossible, or that file permissions were successfully restricted. No root-read grant was made.

In this investigation, a second non-model probe explicitly requested `windows.sandbox="mxc"`, retained narrow read permissions and managed requirements, and attempted only a fixed developer-written marker read/write test. It again exited with the same elevated-backend message before the test ran. The reason that this installed alpha build still reported the elevated backend has not been established. Do not call this a successful MXC test or silently fall back. Diagnostic: `data/premium-isolation/mxc-probe.json`.

## Facts checked locally

| Item | Verified result |
|---|---|
| Operating system | Microsoft Windows 11 Home, version 10.0.26300, 64-bit |
| WSL inventory | Ubuntu is registered as WSL2 and was **Stopped**; default version is 2 |
| WSL operation | The distribution was not started; Linux CLI installation, authentication, mounts and policy were not inspected |
| Windows Sandbox / Docker | Executables were not found on PATH; that alone is not an exhaustive installed-software inventory |
| Optional Windows features | Read-only feature-state queries failed with COMException; their enabled/disabled states remain unknown |
| Existing Windows CLI authentication | Both Claude Code and the exact app-bundled Codex binary returned authenticated subscription status; only whitelisted booleans and check timestamps were retained |
| Linux authentication | Not checked; Windows authentication is not assumed to transfer |
| Current narrow native sandbox | Previous and explicitly requested MXC probes both failed before marker checks |
| Security changes | No accounts, permissions, firewall rules, virtualization features, saved CLI configuration or authentication settings changed |

The presence of a registered WSL2 distribution does not prove that a safe review environment exists. The local probe wrote only harmless diagnostic markers in ignored project data. No generated application code was run.

## Options compared

The compatibility, performance and cost assessments below are design estimates unless identified as verified above. Subscription usage is still consumed for a future real review; none was used here.

| Approach | CLI/authentication fit | Filesystem and network boundary | Tools/configuration | Complexity, performance and additional cost | Personal-app suitability |
|---|---|---|---|---|---|
| Supported native Codex Windows sandbox | Installed Windows binary and existing Windows ChatGPT login are the natural fit. Current profile failed. | Must prove packet-only reads and no writes, plus blocked tool networking; no broad root-read workaround. | Must independently disable execution tools, hooks, plugins, MCP and escalation. | Lowest setup and native performance if supported; no added API credits inherently required within allowance. Newer compatible native capabilities or approved vendor setup may be needed. | Preferred simplicity if a future non-model boundary test passes; **unverified now**. |
| Dedicated low-privilege Windows account/process | Windows CLI may run under a dedicated account; the owner must authenticate normally in that context, without moving token files. | A distinct identity with reviewed ACLs can isolate private profile data; a standard account still inherits access to commonly readable files, so its identity alone is insufficient. Network rules need separate enforcement. | Fresh account configuration avoids existing extensions, but still require explicit tool restrictions and auditable allowlists. | Medium/high setup: account, logon policy, ACLs and network design; native runtime speed. Usually no new inference product required, but admin effort is material. | Candidate only after explicit owner approval and hostile read/write/command/network probes. Not provisioned. |
| Windows Sandbox / disposable VM | A Windows CLI must be present inside the guest. Owner signs in within the guest; do not import host credentials. A disposable guest loses its login on close. | VM separation can expose only a read-only packet share. Permit only necessary outbound authentication/model traffic; no incoming review service or host credential mappings. | Guest must start with reviewed configuration, with shell, plugins, MCP and hooks disabled for review. | Higher startup/login friction and memory use. Windows Sandbox is offered on supported Pro/Enterprise/Education editions; this host is Home, so do not assume entitlement. A full VM can involve software/OS licensing costs. | Stronger isolation candidate but awkward for frequent personal reviews and currently not verified. |
| Dedicated WSL2 review distribution | Existing WSL2 registration makes this practical to evaluate. Requires a Linux-native CLI and a fresh normal login; Windows CLI/login reuse is not assumed. | Keep packets in the Linux filesystem; disable Windows-drive automount/fstab mounts and Windows interop for this dedicated environment, run unprivileged, and verify no Windows mounts or escape routes remain. Add a packet-only Linux sandbox and restricted network policy. | Clean configuration; no inherited Windows PATH, user plugins, MCP, hooks, shell execution or extra agents. | Medium setup; generally modest warm-start overhead. CLI installation needs approval. No extra API credits inherently required when eligible subscription login is used within limits; host resources are still needed. | **Recommended next prototype**, conditional on owner-approved setup and successful non-model boundary tests. Do not modify the existing personal Ubuntu distribution for convenience. |
| Temporary Git worktree + OS isolation | Useful for a snapshot; authentication belongs to whichever actual isolated worker runs it. | A worktree still shares host access and Git metadata. Copy only the frozen packet into the already isolated environment; use the OS boundary, not Git, to protect secrets. | Same tool/configuration restrictions as the selected OS environment. | Low file-preparation overhead plus the cost/complexity of the underlying isolation method. | Useful supplement, never a standalone security solution. |

## Verified documentation versus proposed design

OpenAI documents native MXC and legacy elevated/unelevated implementations. It recommends MXC on compatible devices; the unelevated fallback has weaker networking and no denied-read paths. Its compatibility probe checks startup, which alone would not prove our packet-only policy. The installed probe result remains the authority for what happened locally. [Codex Windows sandbox documentation](https://learn.chatgpt.com/docs/windows/windows-sandbox).

Microsoft documents Windows Sandbox as a disposable hypervisor-isolated environment on supported editions, with networking enabled by default and host applications unavailable until installed inside. [Windows Sandbox overview](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/). Read-only mapped folders are available, and writable mappings can persist host changes. [Sandbox configuration](https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/windows-sandbox-configure-using-wsb-file).

WSL normally supports host-drive mounts and Windows-process interoperability; turning off automount does not by itself prevent all manual mounts. A secure proposal must also remove mounting privilege and verify actual mounts. These controls are proposals for a dedicated review environment, not settings changed here. [WSL configuration](https://learn.microsoft.com/en-us/windows/wsl/wsl-config). Linux-side files are also the recommended placement for Linux tooling performance. [WSL filesystems](https://learn.microsoft.com/en-us/windows/wsl/filesystems).

Windows uses access tokens and object security descriptors for access control; a new account must be paired with deliberate object permissions. [Windows access-control model](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-model).

Codex supports ChatGPT authentication, but no documentation or local check here establishes automatic reuse of the existing Windows login inside another account or guest. Normal sign-in in the selected environment must remain the owner's action. [Codex authentication](https://learn.chatgpt.com/docs/auth).

## Exact prerequisites and owner actions

No owner action is required to use the redesigned dashboard or the current manual review handoffs.

Before a WSL proof of isolation, obtain explicit owner approval for:

1. Creating a separate review-only WSL distribution (or an alternative approved guest), including any installation and disk/memory allocation. Do not change the stopped personal Ubuntu distribution.
2. Installing a compatible Linux Codex CLI from an official source. Pin and verify its binary/version.
3. Performing the owner's normal ChatGPT login inside that environment. Do not copy auth.json, browser cookies, subscription tokens, Windows home, or CLI credential directories.
4. Applying and reviewing its mount, Linux account/privilege, filesystem and network policy. Never enable broad filesystem access as an expedient.

Feature enablement, Windows edition changes, local-account creation, ACL/firewall changes, and administrator provisioning each also require explicit approval if an alternative needs them. None was performed.

Operational prerequisites: frozen packet with identifier/hash; sanitized requirements/diff/test evidence; fixed executable and argument array; bounded stdin/stdout; no shell command construction; a loopback-only capability-protected host endpoint; duplicate-request lock and durable request/error history; structured findings bound to the packet; read-only/no-execution tool policy; timeout and process cleanup; owner acceptance after actual independent review.

## Proposed implementation plan, after separate approval

1. Approve and provision the candidate environment, then record the exact CLI version and actual authentication method. Keep automatic review unavailable.
2. With **developer-written harmless probes only**, prove packet reads succeed; reads of a decoy sibling, Windows user profile, authentication directory and project .env fail; writes fail; commands/generated programs cannot execute through reviewer tools; unexpected network and host-loopback access fail. Test symlinks, mounts, child processes, cleanup and fallbacks. A startup echo is insufficient.
3. Validate effective MCP/plugin/hook/tool configuration before every future review; fail closed if the environment or version drifts. The CLI's own model/authentication transport must be separate from disallowed agent tool networking.
4. Only after the boundary is verified, design and mock-test the local worker and explicit per-packet owner authorization. No bridge code is part of this task.
5. Require a **new owner authorization through the dashboard** for the first actual review, then verify findings provenance and packet integrity before enabling any automatic-review readiness label.

If all candidate environments fail or setup is not approved, continue manual packet review. Do not replace this decision with a broader sandbox, a credential-copy mechanism or a subscription proxy.

## 2026-10-21 — Existing Ubuntu read-only inspection

This section records the subsequent WSL inspection, separately from the earlier sandbox probes. Only this report and PROMPT_LOG.md were edited. Ubuntu was not started, and no Linux command, installation, authentication, model call or isolation probe was run in this inspection.

### VERIFIED

| Check | Current Windows-side evidence |
|---|---|
| Windows | Windows 11 Home, 64-bit, CIM version 10.0.26300; WSL reports full Windows build 10.0.26300.9711 |
| WSL package | 2.7.12.0; installed kernel version 6.18.33.2-2 (not a running guest kernel observation) |
| Distributions | One entry: Ubuntu, Stopped, WSL version 2; default distribution Ubuntu and default WSL version 2 |
| Registration | Default Linux UID 1000; registration does not establish its privileges or sudo policy |
| Host resources | Eight logical processors; 15.75 GiB physical RAM, approximately 0.75 GiB free when sampled; C: approximately 233.53 GiB free; hypervisor present |
| Global WSL configuration | `%USERPROFILE%/.wslconfig` absent; no explicit user-file networking/resource overrides found |
| Existing application | GET /api/health, /team and /api/console returned HTTP 200; health status ok; existing server PID 36772 still present |
| Review gates | Console reports automaticReviewAvailable false for both Claude and Codex, liveEnabled false, Gemini automatic routing disabled |

WSL's WSL1 optional-component warning is not evidence of a WSL2 failure. No component was enabled. Available RAM was low; neither guest boot nor workload capacity was tested. Host free disk is not the Ubuntu VHD's internal free space.

### UNVERIFIED

Starting Ubuntu requires prior owner approval under this task's explicit instruction. Therefore its exact Ubuntu release, running kernel, systemd state, Linux-native Codex/version, Node/npm versions, guest memory/disk, `/etc/wsl.conf`, mount table, `/mnt/c` access, exposed user folders, interop, sudo/capabilities, namespaces and effective network/firewall behavior remain unverified. No WSL UNC path or VHD was opened to bypass the stopped state. The registered name “Ubuntu” is not an Ubuntu release number.

Absence of `.wslconfig` indicates no overrides in that file; it does not prove effective NAT, firewall enforcement, host-loopback isolation or actual CPU/memory limits. Microsoft's documented defaults include NAT, half the host RAM and host logical processor count; treat these as expectations to verify, not measured guest settings. A WSL network namespace and firewall must be inspected after approved startup. [WSL configuration reference](https://learn.microsoft.com/en-us/windows/wsl/wsl-config).

### Filesystem exposure and Codex compatibility

The actual Ubuntu mount policy is unknown. Microsoft's defaults mount Windows drives below `/mnt` and enable Windows executable/PATH interoperability. Thus Windows profile exposure must be presumed possible until disproved with harmless decoys, without opening private files. Automount and fstab processing can be disabled; interop and Windows PATH import can also be disabled. Those settings alone do not prevent privileged remounts, existing mounts, symlink escapes or other host channels. A dedicated Linux directory is useful placement, not an access-control boundary. [WSL mount and interop controls](https://learn.microsoft.com/en-us/windows/wsl/wsl-config).

OpenAI explicitly supports running Codex inside WSL2; its current Linux sandbox uses bubblewrap, and WSL1 support ended with Codex 0.115. This establishes platform compatibility, not successful sandbox enforcement in this Ubuntu installation. Effective packet-only reads, denied sibling/profile reads, no writes, no escalation, tool execution restrictions and network policy still need non-model tests. Use only purpose-built decoys, never actual private files or credentials. [Official Codex WSL guide](https://learn.chatgpt.com/docs/windows/wsl), [sandbox controls](https://learn.chatgpt.com/docs/sandboxing).

### Authentication feasibility

A Linux-native installation can use a fresh owner-controlled ChatGPT login for an eligible subscription. The current official Linux installation path is the standalone installer; the CLI also documents an npm installation option. Standalone installation avoids making Node/npm a prerequisite for the reviewer. Any future installer must be obtained from the official source and reviewed before execution; no installer was downloaded or run here. [Codex CLI installation](https://learn.chatgpt.com/docs/codex/cli).

Use the owner's normal `codex login` browser flow in the Linux context. With Windows interop disabled, manually opening the displayed login link may be necessary. Localhost callback reachability must be verified; device-code login is a documented fallback subject to account/workspace settings. Do not weaken steady-state isolation just to enable browser launching. Linux must have its own protected authentication context; Windows login is not assumed to transfer, and credential copying is neither necessary nor permitted by this design. The trusted Codex process needs authentication access; reviewer tools must not see that storage. No authentication status command or credential file was accessed in this inspection. [Authentication](https://learn.chatgpt.com/docs/auth).

Subscription authentication avoids separately metered API-key requests within the included allowance. It still consumes shared plan usage, with model/plan limits and possible weekly limits; it is not unlimited free inference. Do not purchase credits, enable paid overflow, use API-key fallback or retry on quota exhaustion. Exact account allowance was not inspected. [Current usage and pricing](https://learn.chatgpt.com/docs/pricing).

### Proposed bridge controls — design only

| Concern | Required design before implementation |
|---|---|
| Worker launch | Owner authorizes one packet; coordinator pins executable, distribution, unprivileged user and reviewed launcher. Use fixed argument arrays and bounded stdin, never interpolate packet text into a shell. No root worker or passwordless sudo. |
| Packet transfer | Coordinator creates a sanitized immutable snapshot with ID/hash; transfer only bounded ordinary files or framed stdin. Reject absolute/traversal paths, links, devices and archive expansion abuse. Do not map the repository, Windows profile, .env or authentication directories. |
| Filesystem boundary | Dedicated review distribution preferred over changing personal Ubuntu; disable host mounts/interop, remove mounting privilege, and enforce packet-only tool reads in the Linux sandbox. Verify actual restrictions independently; fail closed on unsupported sandbox operation. |
| Network | Trusted CLI transport may reach necessary OpenAI authentication/model endpoints; agent tools get no general network, host-loopback or LAN access. No inbound guest review service. Whole-guest networking=none would also prevent real reviews. Global WSL networking changes could affect personal distributions and need separate approval. |
| Tool surface | Clean trusted configuration, no project-provided instructions/configuration, MCP servers, plugins, hooks, web tools, extra agents or execution tools. Read-only filesystem mode alone does not prohibit commands. Verify version-specific effective settings, rather than assuming defaults. |
| Timeouts | Bound wall-clock, stdout/stderr, packet/result size and concurrency. A killed Windows wsl.exe client may leave Linux children; cancellation must target the worker's own Linux process group and verify cleanup. Never terminate all WSL or restart unrelated services. |
| Duplicates | Host owns a durable unique review key over packet hash/reviewer/version; atomic claim and terminal states prevent repeat dispatch. Timeout or ambiguous completion requires owner reconciliation, not an automatic paid/duplicate retry. |
| Findings | Structured JSON only; validate schema, packet hash, reviewer identity, size and field types. Treat text as untrusted and escape dashboard rendering. Host coordinator alone writes an append-only review receipt through existing validated SQLite workflow; guest never opens DB. Preserve independent-review and owner-approval gates. |
| Authentication | Fresh owner login in guest, no host token forwarding or auth mounts. Separate trusted credential-handling process from sandboxed tool access. Sanitize logs/errors and keep token material out of packets, outputs and SQLite. |
| Residual risk | Prompt injection, incorrect findings, token theft through a policy error, remount/interop escapes, host-service reachability, sandbox/version drift, stale packet results, surviving children and resource exhaustion remain threats. WSL shares host infrastructure; it is not a disposable high-assurance hostile-code VM. |

### BLOCKERS

OpenAI's Linux sandbox guidance also requires checking `bwrap` availability and unprivileged user-namespace/AppArmor compatibility. Ubuntu release-specific policy can block sandbox startup. These checks were not performed; do not disable system-wide security restrictions as a shortcut. Any required package or profile change needs separate approval. [Linux sandbox prerequisites](https://learn.chatgpt.com/docs/sandboxing).

No Linux inspection or packet-only isolation proof exists. Personal Ubuntu's privileges, mounts, tools and network are unknown. The previous native Windows probes also failed before enforcement could be tested. Low available host memory adds an operational constraint. Consequently **automatic review remains disabled**, and existing Ubuntu cannot currently be certified as a secure review worker.

The earlier alternatives table remains applicable: native sandbox has the lowest overhead if vendor-supported diagnostics resolve its blocker; a low-privilege Windows account requires audited ACLs and networking; Windows Sandbox is not supported on this Home edition under Microsoft's supported-edition list; a disposable Linux VM gives a clearer guest boundary but adds setup, RAM and login lifecycle overhead. A Linux VM need not require a Windows guest license. None of these choices inherently requires API credits when eligible subscription login is used; host/software costs and subscription limits still apply.

### OWNER APPROVAL REQUIRED

First: starting the stopped Ubuntu distribution for bounded read-only checks. Startup itself can run existing Linux boot services, so it is outside this inspection's authorization. Pending checks: release/systemd, command locations and versions without launching Codex sessions, mount/config/privilege metadata, guest resources and network rules. Do not inspect login caches or private files.

Separate later approvals are required for any distribution/account creation, software installation/update, login or account-setting change, mount/interop/sudo policy, firewall/resource configuration, sandbox probes that create decoys, bridge/database/dashboard implementation, and the first model review. Starting Ubuntu for inspection would not authorize any of those actions.

**Recommendation:** retain manual review now. After approved read-only Ubuntu checks, evaluate a separate review-only WSL2 distribution with an unprivileged, packet-restricted worker as the simplest practical candidate given existing WSL2. Do not repurpose personal Ubuntu without an explicit decision. If its mount, privilege, credential and network controls cannot pass harmless boundary tests, use a dedicated Linux VM with no host shares except the packet. No WSL or VM solution has been verified secure on this host yet.

### Validation scope

Application source, tests and package files were hashed across 41 files for comparison; database and WAL were hashed without opening SQLite. Running HTTP checks used GET only. No tests were run because this is a documentation-only, read-only investigation and tests would create temporary databases/processes. The last suite's 100/100 result belongs to the preceding task, not this inspection. No application code, Linux configuration, credentials, service configuration or CoachLab files were changed; no bridge, model request, billing change or GitHub push was performed.

Final source/test/package digest matched the initial digest: `6d2fb4428179536633b25d4199bc49905920b2bb7c471a60ec83b7054b527de9`. Database and WAL hashes also matched before/after validation. Final health/dashboard/console responses remained HTTP 200, both automatic review flags false and liveEnabled false. Git whitespace validation passed, with existing CRLF notices only.
