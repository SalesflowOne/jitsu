#!/bin/bash

# This script defines if vercel should deploy the commit,
# see https://vercel.com/support/articles/how-do-i-use-the-ignored-build-step-field-on-vercel

if [[ "$VERCEL_GIT_COMMIT_REF" == "functions-cli"  ]]; then
    npx turbo-ignore
else
   if [[ "$VERCEL_GIT_COMMIT_REF" != *"newjitsu"* && "$VERCEL_GIT_COMMIT_REF" != cursor/* ]]; then
      echo "❌ Not a newjitsu or cursor/* branch, skipping deploy"
      exit 0
   fi

   npx turbo-ignore
fi


