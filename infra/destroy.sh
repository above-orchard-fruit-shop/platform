#!/usr/bin/env bash
# Delete everything deploy.sh created (stops Learner Lab charges). Data is lost.
#
#   bash aof/destroy.sh
set -euo pipefail

STACK="${STACK:-aof-shop}"
REGION="${AWS_REGION:-us-east-1}"
export AWS_DEFAULT_REGION="$REGION"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
ARTIFACTS="aof-artifacts-${ACCOUNT}-${REGION}"

SITE_BUCKET="$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].Outputs[?OutputKey=='SiteBucketName'].OutputValue" --output text 2>/dev/null || true)"

# CloudFormation can't delete a bucket that still has objects.
if [ -n "$SITE_BUCKET" ] && [ "$SITE_BUCKET" != "None" ]; then
  echo "==> Emptying s3://${SITE_BUCKET}"
  aws s3 rm "s3://${SITE_BUCKET}" --recursive --only-show-errors
fi

echo "==> Deleting stack ${STACK} (CloudFront takes a while to disable)"
aws cloudformation delete-stack --stack-name "$STACK"
aws cloudformation wait stack-delete-complete --stack-name "$STACK"

if aws s3api head-bucket --bucket "$ARTIFACTS" 2>/dev/null; then
  echo "==> Deleting s3://${ARTIFACTS}"
  aws s3 rb "s3://${ARTIFACTS}" --force >/dev/null
fi
rm -f "$HOME/aof-admin-password.txt"
echo "Done."
