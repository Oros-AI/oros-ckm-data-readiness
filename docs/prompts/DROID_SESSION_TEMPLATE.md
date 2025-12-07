# Droid Session Summary Template

Use this template whenever a major development session completes. Droid will
(1) create a summary file and (2) update the session index.

---

## Instructions for Droid (high level)

When I say **"Run the session summary workflow"**, do the following.

### Step 0 – Safety checks

1. Verify the active git branch with:

   `git branch --show-current`

2. Show me the branch name and wait for confirmation before editing files.

---

### Step 1 – Create the summary file

1. Ask me for the date to use in the filename (`YYYY-MM-DD`).
2. Create a markdown file at:

   `docs/prompts/sessions/YYYY-MM-DD_droid_session.md`

3. Populate it with this structure:

```markdown
# Droid Session Summary – YYYY-MM-DD
Branch: <CURRENT_BRANCH>

## 1. Purpose of this Session
(One paragraph describing the goals and what part of the system was worked on.)

## 2. Major Changes Completed
(Bullet list of major code or architecture changes, grouped logically.)

## 3. List of Files Modified
(List files changed in this session, grouped logically if helpful.)

## 4. Key Prompts Used (Condensed)
(Curate only high-level prompts that guided the work.)

## 5. Rationale for Key Decisions
(Short explanation of why architecture or design decisions were made.)

## 6. Next Steps
(Actionable items for upcoming sessions.)
```

4. Show me the diff for the new summary file and wait for approval.

---

### Step 2 – Update the index file

1. Open `docs/prompts/SESSION_INDEX.md`. If it does not exist, create it with:

```markdown
# Session Index

This file tracks major Droid-assisted development sessions for the Oros v3 Pipeline Wizard.
```

2. Append a new entry using this format (replacing the date and description):

```markdown
- **YYYY-MM-DD** — Short description of the session  
  File: `docs/prompts/sessions/YYYY-MM-DD_droid_session.md`
```

3. Show me the diff for `SESSION_INDEX.md` and wait for approval.

---

### Step 3 – Commit and push

After I approve both diffs:

1. Stage ONLY:

   - `docs/prompts/sessions/YYYY-MM-DD_droid_session.md`
   - `docs/prompts/SESSION_INDEX.md`

2. Commit with the message:

   `docs: add Droid session summary for YYYY-MM-DD`

3. Push to the current branch.

Do not modify or stage any other files as part of this workflow.
