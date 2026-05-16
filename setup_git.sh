#!/bin/bash
cd /home/ubuntu/.openclaw/workspace/dungeon-interface/

# 1. Check if git is installed
if ! command -v git &> /dev/null
then
    echo "git could not be found. Please install git."
    exit 1
fi

echo "Git is installed: $(git --version)"

# 2. Initialize a git repo (if not already)
if [ ! -d ".git" ]; then
    git init
    echo "Initialized empty Git repository."
else
    echo "Git repository already initialized."
fi

# 6. Make an initial commit with all files
git add .
git commit -m "Initial commit: Dungeon Interface with GitHub Actions build"

echo "Initial commit created locally."
