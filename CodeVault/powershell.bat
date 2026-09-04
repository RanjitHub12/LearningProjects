@echo off
git add -A
git commit -m "feat: implement per-user data isolation and scoped database wipes"
git push origin master
echo "Successfully pushed to git!"
