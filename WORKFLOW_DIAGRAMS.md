# Workflow Architecture Diagram

## Master Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    azure-deploy-master.yml                       │
│                   (Master Orchestrator)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │ Detect Changes   │
                    │ (paths-filter)   │
                    └──────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ↓                 ↓                 ↓
       [Backend]         [Frontend]         [Infra]
         changed           changed           changed
            │                 │                 │
            └─────────────────┴─────────────────┘
                              │
                              ↓
              ┌───────────────────────────────┐
              │  Run CI Tests (if needed)     │
              │  ↳ ci-optimized.yml          │
              └───────────────────────────────┘
                              │
                              ↓
           ┌──────────────────────────────────────┐
           │  Build Containers (if code changed)   │
           │  ↳ build-container-images-optimized.yml │
           └──────────────────────────────────────┘
                              │
                              ↓
        ┌────────────────────────────────────────────┐
        │  Deploy Infrastructure (if infra changed)  │
        │  ↳ azure-deploy-tf-optimized.yml          │
        └────────────────────────────────────────────┘
                              │
                              ↓
                 ┌─────────────────────┐
                 │  Verify Deployment  │
                 │  (Health Checks)    │
                 └─────────────────────┘
                              │
                              ↓
                    ┌──────────────┐
                    │  ✅ Success!  │
                    └──────────────┘
```

## Terraform Deployment Flow (Optimized)

```
┌─────────────────────────────────────────────────────────────────┐
│               azure-deploy-tf-optimized.yml                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │  Job: Plan       │
                    └──────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ↓                 ↓                 ↓
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ Restore      │  │ Terraform    │  │ Generate     │
    │ Cache        │  │ Init/Validate│  │ Plan Output  │
    └──────────────┘  └──────────────┘  └──────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │ Terraform Plan   │
                    │ (exitcode check) │
                    └──────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ↓                 ↓                 ↓
    exitcode=0        exitcode=2         exitcode=1
    (no changes)      (changes)          (error)
            │                 │                 │
            ↓                 │                 ↓
       Skip Apply             │              Fail ❌
                              │
                              ↓
                    ┌──────────────────┐
                    │  Upload Plan     │
                    │  (artifact)      │
                    └──────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │  Comment on PR   │
                    │  (if PR event)   │
                    └──────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │  Job: Apply      │
                    │  (needs approval)│
                    └──────────────────┘
                              │
                              ↓
                  ┌───────────────────────┐
                  │ ⏸️  APPROVAL GATE     │
                  │ (production env)      │
                  │ Click "Review & Deploy│
                  └───────────────────────┘
                              │
                              ↓ (approved)
                    ┌──────────────────┐
                    │ Download Plan    │
                    │ Terraform Apply  │
                    └──────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │  Capture Outputs │
                    │  (URLs, etc.)    │
                    └──────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │  Job: Verify     │
                    └──────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ↓                                   ↓
    ┌──────────────┐                    ┌──────────────┐
    │ Health Check │                    │ Health Check │
    │ Backend      │                    │ Frontend     │
    │ (5 retries)  │                    │ (5 retries)  │
    └──────────────┘                    └──────────────┘
            │                                   │
            └─────────────────┬─────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  ✅ Verified!     │
                    └──────────────────┘
```

## Container Build Flow (Parallel)

```
┌─────────────────────────────────────────────────────────────────┐
│          build-container-images-optimized.yml                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │ Detect Changes   │
                    └──────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ↓                                   ↓
    Backend changed?                    Frontend changed?
            │                                   │
            └─────────────────┬─────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  Build Matrix        │
                    │  (Parallel Jobs)     │
                    └──────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ↓                                   ↓
    ┌──────────────────┐              ┌──────────────────┐
    │ Build Backend    │              │ Build Frontend   │
    │ ├─ Setup BuildKit│              │ ├─ Setup BuildKit│
    │ ├─ Docker Build  │              │ ├─ Docker Build  │
    │ ├─ Layer Cache   │              │ ├─ Layer Cache   │
    │ ├─ Registry Cache│              │ ├─ Registry Cache│
    │ └─ Push (main)   │              │ └─ Push (main)   │
    └──────────────────┘              └──────────────────┘
            │                                   │
            │         (Both run simultaneously) │
            │                                   │
            └─────────────────┬─────────────────┘
                              ↓
                    ┌──────────────────┐
                    │ Trigger Update   │
                    │ (Container Apps) │
                    └──────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ↓                                   ↓
    Update backend app                  Update frontend app
    with new image                      with new image
            │                                   │
            └─────────────────┬─────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  ✅ Complete!     │
                    └──────────────────┘

Time Savings: 4-6 min → 2-3 min (50% faster!)
```

## CI Workflow (Optimized with Change Detection)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ci-optimized.yml                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │ Detect Changes   │
                    └──────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ↓                                   ↓
    Backend changed?                    Frontend changed?
            │                                   │
            ↓ (yes)                             ↓ (yes)
    ┌──────────────────┐              ┌──────────────────┐
    │ Backend Tests    │              │ Frontend Tests   │
    │ ├─ npm cache     │              │ ├─ npm cache     │
    │ ├─ Install deps  │              │ ├─ Install deps  │
    │ ├─ Lint          │              │ ├─ Lint          │
    │ ├─ Test          │              │ ├─ Test          │
    │ └─ Build         │              │ └─ Build         │
    └──────────────────┘              └──────────────────┘
            │                                   │
            │         (Both run in parallel)    │
            │                                   │
            └─────────────────┬─────────────────┘
                              ↓
                    ┌──────────────────────┐
                    │  Docker Build Matrix │
                    │  (if tests passed)   │
                    └──────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ↓                                   ↓
    Build backend image               Build frontend image
    (with GHA cache)                  (with GHA cache)
            │                                   │
            └─────────────────┬─────────────────┘
                              ↓
                    ┌──────────────────┐
                    │  CI Success Job  │
                    │  (for branch     │
                    │   protection)    │
                    └──────────────────┘
                              │
                              ↓
                    ┌──────────────────┐
                    │  ✅ All Passed!   │
                    └──────────────────┘

Benefits:
- Skip unchanged components (saves 2-3 min)
- Parallel execution (saves 1-2 min)
- Caching (saves 30-60s)
Total: 40% faster!
```

## Caching Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                      Caching Architecture                        │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Terraform Caching                                             │
├────────────────────────────────────────────────────────────────┤
│  Cache Key: terraform-$OS-$HASH(.terraform.lock.hcl)          │
│  Cached:                                                       │
│  ├─ .terraform/ (provider plugins)                            │
│  └─ .terraform.lock.hcl (lock file)                           │
│  Benefit: 30-60s faster init                                  │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  npm Package Caching                                           │
├────────────────────────────────────────────────────────────────┤
│  Cache Key: automatic via setup-node@v4                       │
│  Cached:                                                       │
│  ├─ ~/.npm (npm global cache)                                │
│  └─ node_modules/ (dependencies)                              │
│  Benefit: 1-2 min faster npm ci                               │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│  Docker Layer Caching (Multi-Layer)                           │
├────────────────────────────────────────────────────────────────┤
│  Layer 1: GitHub Actions Cache                                │
│  ├─ type: gha                                                 │
│  ├─ Scope: workflow-specific                                  │
│  └─ Benefit: Fast, local to runner                            │
│                                                                │
│  Layer 2: Registry Cache                                      │
│  ├─ type: registry                                            │
│  ├─ Location: ACR (finvibe-*:buildcache)                     │
│  ├─ Scope: cross-workflow, persistent                         │
│  └─ Benefit: Shared across all builds                         │
│                                                                │
│  Combined Benefit: 70-80% cache hit rate                      │
└────────────────────────────────────────────────────────────────┘
```

## Concurrency Control

```
┌─────────────────────────────────────────────────────────────────┐
│                   Concurrency Groups                             │
└─────────────────────────────────────────────────────────────────┘

Group: terraform-main
├─ Run 1: ✅ Running
├─ Run 2: ⏸️  Queued (waiting for Run 1)
└─ Run 3: ⏸️  Queued (waiting for Run 2)

Group: build-images-feature/new-feature
├─ Run 1: ✅ Running
└─ (no conflicts with main branch)

Benefits:
✅ No state lock errors
✅ Safe parallel execution on different branches
✅ Automatic queuing instead of failing
✅ Better resource utilization
```

## Approval Gate Flow

```
Terraform Plan Complete
          │
          ↓
    Plan has changes?
          │
          ├─ No (exitcode=0)  → Skip Apply ✅
          │
          └─ Yes (exitcode=2)
                  │
                  ↓
          Push to main?
                  │
                  ├─ No (PR) → Comment plan only
                  │
                  └─ Yes
                      │
                      ↓
              ┌───────────────────┐
              │ Approval Required │
              │ (production env)  │
              └───────────────────┘
                      │
          ┌───────────┴───────────┐
          ↓                       ↓
    ⏸️  Waiting              ❌ Rejected
    (up to 30 days)              │
          │                       ↓
          ↓ (approved)       Cancel ❌
    ┌─────────────┐
    │ Apply       │
    │ Infrastructure│
    └─────────────┘
          │
          ↓
    ✅ Complete!
```

## Performance Timeline Comparison

### Before Optimization
```
┌──────────────────────────────────────────────────────┐
│ 0────2────4────6────8────10───12 min                │
├──────────────────────────────────────────────────────┤
│ ████████████ CI Tests (4-5 min)                     │
│             ████████████ Build Backend (2-3 min)    │
│                         ████████████ Build Frontend │
│                                     (2-3 min)        │
│                                     ████████ Deploy  │
│                                            (3-4 min) │
└──────────────────────────────────────────────────────┘
Total: 8-12 minutes
```

### After Optimization
```
┌──────────────────────────────────────────────────────┐
│ 0────2────4────6────8────10───12 min                │
├──────────────────────────────────────────────────────┤
│ ██████ CI Tests (2-3 min)                           │
│       ██████ Build (Parallel) (2-3 min)             │
│             ██████ Deploy (2-3 min)                 │
│                   ✅ Complete! (5-7 min)             │
└──────────────────────────────────────────────────────┘
Total: 5-7 minutes (40-50% faster!)
```

## Legend

```
Symbol Meanings:
│  = Sequential flow
├─ = Branch/decision point
└─ = Continuation
↓  = Flow direction
✅ = Success
❌ = Failure
⏸️  = Waiting/Paused
████ = Time/Duration
```

## Quick Reference

**Start new deployment:**
```bash
gh workflow run azure-deploy-master.yml
```

**View running workflows:**
```bash
gh run list --workflow=azure-deploy-master.yml
```

**Approve deployment:**
1. Actions tab → Click workflow run
2. Click yellow "Review deployments" button
3. Select "production" → Click "Approve and deploy"

**Check deployment status:**
```bash
gh run watch
```

**View logs:**
```bash
gh run view <run-id> --log
```
