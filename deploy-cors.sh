#!/bin/bash
set -a # automatically export all variables
source .env
set +a # stop automatically exporting

# Check if the variable is set
if [ -z "$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" ]; then
  echo "Error: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is not set in your .env file."
  exit 1
fi

echo "Updating CORS for bucket: gs://$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET"

# Run the gcloud command
gcloud storage buckets update "gs://$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" --cors-file=cors.json
