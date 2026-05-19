# Fix for Static Analysis Report Workflow Failure

## Problem
The `static-analysis-report` workflow is failing because the repository doesn't have GitHub Discussions enabled, which prevents the workflow from creating discussion posts for security findings.

## Error
```
Discussion "🔍 Static Analysis Report - 2026-05-19" in unknown: No discussion categories available in Egoorbis/finvibe
```

## Solution

### Option 1: Enable GitHub Discussions (Recommended)

1. **Enable Discussions Feature:**
   - Go to your repository settings: https://github.com/Egoorbis/finvibe/settings
   - Scroll down to the "Features" section
   - Check the box next to "Discussions"
   - Click "Set up discussions"

2. **Create a "Security" Category:**
   - Navigate to the Discussions tab in your repository
   - Click on "Categories" (or the settings icon)
   - Create a new category called "Security" (exact name, case-sensitive)
   - Set it as an "Announcement" type category for read-only security reports

3. **Re-run the Workflow:**
   - The workflow should now successfully create discussions in the security category

### Option 2: Alternative - Workflow Already Has Fallback

The workflow is configured with `fallback_to_issue: true`, which means it should create an issue if discussions aren't available. However, the query for discussion categories is failing before the fallback can be triggered.

**To force the workflow to use issues instead:**
- The current configuration should automatically fall back to issues once the discussion category check completes
- This may require a fix in the gh-aw framework itself

## Recommended Action

**Enable GitHub Discussions** (Option 1) as this is the intended behavior for security reports. Discussions are better suited for:
- Non-actionable reports (informational security scans)
- Recurring automated reports
- Community visibility of security posture

Issues should be reserved for actionable items that require fixes.

## Verification

After enabling discussions and creating the security category:
1. Trigger the workflow manually from Actions tab
2. Check that a discussion is created in the Security category
3. Verify the security scan results are posted

## Additional Notes

- The workflow scans for security vulnerabilities using zizmor, poutine, and actionlint
- Reports are generated weekly (schedule: weekly)
- The workflow can also be triggered manually via workflow_dispatch
