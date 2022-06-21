#!/bin/bash

# A corrected and safer script to rewrite commit dates over a specified period.
# This version is designed to simulate a consistent, daily developer workflow
# by placing commits primarily on consecutive weekdays.

# WARNING: This script performs a destructive rewrite of your branch's history.
# ALWAYS create a backup of your repository before running this.

# --- Pre-flight Checks ---

# 1. Check for the 'bc' command-line calculator dependency.
if ! command -v bc &> /dev/null; then
    echo "Error: Dependency 'bc' (basic calculator) is not installed." >&2
    echo "Please install it to continue." >&2
    echo "On Debian/Ubuntu: sudo apt-get install bc" >&2
    echo "On Red Hat/CentOS/Fedora: sudo yum install bc" >&2
    echo "On macOS (with Homebrew): brew install bc" >&2
    exit 1
fi

# 2. Ensure the working directory is clean before attempting to rewrite history.
if ! git diff-index --quiet HEAD --; then
    echo "Error: You have uncommitted changes in your working directory." >&2
    echo "Please commit or stash your changes before running this script." >&2
    exit 1
fi

# --- Configuration ---
# The date of the very first commit in the new history is now requested from the user.

# Prompt the user for the start date
echo "Please enter the desired start date for the first commit."
read -p "Format (DDMMYYYY), e.g., 26072025: " user_start_date

# Validate the input format (must be 8 digits)
if ! [[ "$user_start_date" =~ ^[0-9]{8}$ ]]; then
    echo "Error: Invalid date format. Please use DDMMYYYY (e.g., 26072025)." >&2
    exit 1
fi

# Parse the user's input and reformat it for the 'date' command
day="${user_start_date:0:2}"
month="${user_start_date:2:2}"
year="${user_start_date:4:4}"
START_DATE="$year-$month-$day"

# Validate that the constructed date is a real calendar date
if ! date -d "$START_DATE" &>/dev/null; then
    echo "Error: The date you entered ($day/$month/$year) is not a valid date." >&2
    exit 1
fi
# --- End Configuration ---

# Ensure there are commits to process
TOTAL_COMMITS=$(git rev-list --count HEAD)
if [ "$TOTAL_COMMITS" -lt 1 ]; then
  echo "No commits found in this branch."
  exit 1
fi

# Create a temporary file to map old commit hashes to their new dates.
# This ensures each commit gets the correct new date, regardless of git's processing order.
MAP_FILE=$(mktemp)

echo "Calculating new dates for $TOTAL_COMMITS commits to simulate daily work..."

# This offset will be incremented for each commit to simulate passing days.
day_offset=0

# Iterate through commits from OLDEST to NEWEST and assign a new date to each one.
git rev-list --reverse HEAD | while read commit_hash; do
    # Loop until we find a weekday for the current commit.
    while true; do
        # Calculate the target date by adding the current offset to the start date.
        TARGET_DATE=$(date -d "$START_DATE + $day_offset days")
        
        # Check the day of the week. 1=Monday, 6=Saturday, 7=Sunday.
        day_of_week=$(date -d "$TARGET_DATE" +%u)

        if [[ $day_of_week -lt 6 ]]; then
            # It's a weekday, so we can use this date.
            break
        else
            # It's a weekend, so we increment the offset and try the next day.
            day_offset=$((day_offset + 1))
        fi
    done
    
    # Get the final base date (which is guaranteed to be a weekday).
    BASE_DATE=$(date -d "$TARGET_DATE" +"%Y-%m-%d")

    # Add a random time of day (e.g., between 9 AM and 9 PM) for a natural look
    HOUR=$(printf "%02d" $((9 + RANDOM % 12)))
    MINUTE=$(printf "%02d" $((RANDOM % 60)))
    SECOND=$(printf "%02d" $((RANDOM % 60)))
    
    # Format the date into an ISO 8601 string that git understands
    NEW_DATE="${BASE_DATE}T${HOUR}:${MINUTE}:${SECOND}"

    # Store the mapping in our temp file: "commit_hash new_iso_date"
    echo "$commit_hash $NEW_DATE" >> "$MAP_FILE"

    # --- Increment the day offset for the *next* commit ---
    # Add a small random gap to make it look more natural.
    # 80% chance of the next commit being on the next day.
    # 20% chance of skipping a day (as if taking a day off).
    if (( RANDOM % 5 == 0 )); then # 1 in 5 chance (20%)
        day_offset=$((day_offset + 2))
    else # 4 in 5 chance (80%)
        day_offset=$((day_offset + 1))
    fi
done

echo "Date map created. Starting history rewrite (this may take a while)..."

# Use filter-branch to apply the new dates.
# The --env-filter runs a command for each commit as it's rewritten.
# We look up the new date in our map file using the commit's hash.
# Squelch the warning as we've already provided one.
FILTER_BRANCH_SQUELCH_WARNING=1 git filter-branch --force --env-filter '
  # Get the hash of the commit currently being processed
  commit_hash=$GIT_COMMIT

  # Find the corresponding new date from our map file
  new_date=$(grep "^$commit_hash " "'"$MAP_FILE"'" | cut -d " " -f 2)

  # If a date was found in the map, export it so git can apply it
  if [ -n "$new_date" ]; then
    export GIT_AUTHOR_DATE="$new_date"
    export GIT_COMMITTER_DATE="$new_date"
  fi
' --tag-name-filter cat -- --all

# Clean up the temporary map file
rm "$MAP_FILE"

echo ""
echo "✅ History rewrite complete!"
echo "The original refs are backed up in refs/original/ in case you need to revert."
echo ""
echo "Please review the new history with 'git log'."
echo "If everything is correct, you will need to force-push the changes to your remote."
echo "Example: git push --force origin main"


