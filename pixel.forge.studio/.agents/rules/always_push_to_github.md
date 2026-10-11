# Auto Push to GitHub Rule

## Rule
**After every code change, ALWAYS commit and push to GitHub automatically. Never wait for the user to ask.**

## Repository Details
- **GitHub Remote:** `https://github.com/Karthick835/web-programming-_-project.git`
- **Local Path:** `C:\Users\admin\Desktop\web.project\pixel.forge.studio`
- **Branch:** `main`

## Push Workflow
After making any file changes, run these commands from the project root:

```powershell
cd "C:\Users\admin\Desktop\web.project\pixel.forge.studio"
git add -A
git commit -m "<short description of what changed>"
git push origin main
```

## Rules
1. Always push after EVERY change - no exceptions.
2. Never ask the user if they want to push - just do it.
3. Use a clear, descriptive commit message summarizing what was changed.
4. If push fails due to conflicts, pull first then push: git pull origin main --rebase && git push origin main
5. Kill any running backend server before git operations if the DB file is locked.
