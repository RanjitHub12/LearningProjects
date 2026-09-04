@echo off
git status
git add -A
git commit -m "chore: push pending changes for deployment"
git push origin master
echo "Finished git push check!"
del "%~f0"
