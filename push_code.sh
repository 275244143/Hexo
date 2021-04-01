read -p  "please input commit dirs or files:" files
read -p  "please input commit comments:" msg
now=$(date "+%Y-%m-%d")
echo "Starting add-commit-push..."
git add -Af "$files" && git commit -m "$now:$msg" && git push
echo "Finish!"
