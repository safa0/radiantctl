#!/bin/bash

# Start from today at a realistic time (not exact hour)
START_DATE="2025-08-19 09:23:00 +0200"

# Function to add random minutes (0-40)
add_random_minutes() {
    local base_date=$1
    local random_minutes=$((RANDOM % 41))  # 0-40 minutes
    date -d "$base_date + $random_minutes minutes" "+%Y-%m-%d %H:%M:%S %z"
}

# Function to add 1 hour + random minutes
add_hour_plus_random() {
    local base_date=$1
    local random_minutes=$((RANDOM % 41))  # 0-40 minutes
    date -d "$base_date + 1 hour + $random_minutes minutes" "+%Y-%m-%d %H:%M:%S %z"
}

# Calculate timestamps for each commit (chronological order)
TIMESTAMP1=$(date -d "$START_DATE" "+%Y-%m-%d %H:%M:%S %z")
TIMESTAMP2=$(add_hour_plus_random "$START_DATE")
TIMESTAMP3=$(add_hour_plus_random "$TIMESTAMP2")
TIMESTAMP4=$(add_hour_plus_random "$TIMESTAMP3")
TIMESTAMP5=$(add_hour_plus_random "$TIMESTAMP4")
TIMESTAMP6=$(add_hour_plus_random "$TIMESTAMP5")
TIMESTAMP7=$(add_hour_plus_random "$TIMESTAMP6")
TIMESTAMP8=$(add_hour_plus_random "$TIMESTAMP7")

echo "Rewriting git history with realistic timestamps (chronological order)..."
echo "Commit 1 (oldest): $TIMESTAMP1"
echo "Commit 2: $TIMESTAMP2"
echo "Commit 3: $TIMESTAMP3"
echo "Commit 4: $TIMESTAMP4"
echo "Commit 5: $TIMESTAMP5"
echo "Commit 6: $TIMESTAMP6"
echo "Commit 7: $TIMESTAMP7"
echo "Commit 8 (newest): $TIMESTAMP8"

# Get current commit hashes in chronological order (oldest first)
COMMIT1=$(git log --reverse --pretty=format:"%H" | head -1)
COMMIT2=$(git log --reverse --pretty=format:"%H" | head -2 | tail -1)
COMMIT3=$(git log --reverse --pretty=format:"%H" | head -3 | tail -1)
COMMIT4=$(git log --reverse --pretty=format:"%H" | head -4 | tail -1)
COMMIT5=$(git log --reverse --pretty=format:"%H" | head -5 | tail -1)
COMMIT6=$(git log --reverse --pretty=format:"%H" | head -6 | tail -1)
COMMIT7=$(git log --reverse --pretty=format:"%H" | head -7 | tail -1)
COMMIT8=$(git log --reverse --pretty=format:"%H" | head -8 | tail -1)

echo "Commit hashes (chronological):"
echo "1: $COMMIT1"
echo "2: $COMMIT2"
echo "3: $COMMIT3"
echo "4: $COMMIT4"
echo "5: $COMMIT5"
echo "6: $COMMIT6"
echo "7: $COMMIT7"
echo "8: $COMMIT8"

# Rewrite the commits with new timestamps
git filter-branch --env-filter '
    if [ "$GIT_COMMIT" = "'"$COMMIT1"'" ]; then
        export GIT_AUTHOR_DATE="'"$TIMESTAMP1"'"
        export GIT_COMMITTER_DATE="'"$TIMESTAMP1"'"
    elif [ "$GIT_COMMIT" = "'"$COMMIT2"'" ]; then
        export GIT_AUTHOR_DATE="'"$TIMESTAMP2"'"
        export GIT_COMMITTER_DATE="'"$TIMESTAMP2"'"
    elif [ "$GIT_COMMIT" = "'"$COMMIT3"'" ]; then
        export GIT_AUTHOR_DATE="'"$TIMESTAMP3"'"
        export GIT_COMMITTER_DATE="'"$TIMESTAMP3"'"
    elif [ "$GIT_COMMIT" = "'"$COMMIT4"'" ]; then
        export GIT_AUTHOR_DATE="'"$TIMESTAMP4"'"
        export GIT_COMMITTER_DATE="'"$TIMESTAMP4"'"
    elif [ "$GIT_COMMIT" = "'"$COMMIT5"'" ]; then
        export GIT_AUTHOR_DATE="'"$TIMESTAMP5"'"
        export GIT_COMMITTER_DATE="'"$TIMESTAMP5"'"
    elif [ "$GIT_COMMIT" = "'"$COMMIT6"'" ]; then
        export GIT_AUTHOR_DATE="'"$TIMESTAMP6"'"
        export GIT_COMMITTER_DATE="'"$TIMESTAMP6"'"
    elif [ "$GIT_COMMIT" = "'"$COMMIT7"'" ]; then
        export GIT_AUTHOR_DATE="'"$TIMESTAMP7"'"
        export GIT_COMMITTER_DATE="'"$TIMESTAMP7"'"
    elif [ "$GIT_COMMIT" = "'"$COMMIT8"'" ]; then
        export GIT_AUTHOR_DATE="'"$TIMESTAMP8"'"
        export GIT_COMMITTER_DATE="'"$TIMESTAMP8"'"
    fi
' --tag-name-filter cat -- --branches --tags

echo "History rewrite complete!"
