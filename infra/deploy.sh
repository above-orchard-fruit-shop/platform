#!/usr/bin/env bash
# Deploy the fruit shop to AWS (Learner Lab) from AWS CloudShell.
#
#   unzip aof-bundle.zip -d aof && bash aof/deploy.sh
#
# Steps: upload the Lambda zip -> create/update the CloudFormation stack ->
# upload both static sites (with the real API URL) -> load starter products ->
# create the Cognito admin. Safe to re-run after changing the bundle.
#
# Env overrides: STACK (aof-shop), ADMIN_USER (shopadmin)
set -euo pipefail

STACK="${STACK:-aof-shop}"
REGION="${AWS_REGION:-us-east-1}"
ADMIN_USER="${ADMIN_USER:-shopadmin}"
PASSWORD_FILE="$HOME/aof-admin-password.txt"
# Must match API_URL_PLACEHOLDER in infra/build.py.
API_URL_PLACEHOLDER="https://aof-api-placeholder.invalid/api"
export AWS_DEFAULT_REGION="$REGION"

cd "$(dirname "$0")"

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
ARTIFACTS="aof-artifacts-${ACCOUNT}-${REGION}"

echo "==> Lambda package -> s3://${ARTIFACTS}"
if ! aws s3api head-bucket --bucket "$ARTIFACTS" >/dev/null 2>&1; then
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$ARTIFACTS" >/dev/null
  else
    aws s3api create-bucket --bucket "$ARTIFACTS" \
      --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null
  fi
  aws s3api put-public-access-block --bucket "$ARTIFACTS" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi
CODE_KEY="lambda/$(sha256sum lambda.zip | cut -c1-16).zip"
aws s3 cp lambda.zip "s3://${ARTIFACTS}/${CODE_KEY}" --only-show-errors

STATUS="$(aws cloudformation describe-stacks --stack-name "$STACK" \
  --query "Stacks[0].StackStatus" --output text 2>/dev/null || true)"
if [ "$STATUS" = "ROLLBACK_COMPLETE" ]; then
  # A first deploy that failed leaves an empty stack that can't be updated.
  echo "==> Removing failed stack ${STACK} (ROLLBACK_COMPLETE)"
  aws cloudformation delete-stack --stack-name "$STACK"
  aws cloudformation wait stack-delete-complete --stack-name "$STACK"
fi

echo "==> CloudFormation stack ${STACK} (a few minutes on first deploy)"
aws cloudformation deploy \
  --stack-name "$STACK" \
  --template-file template.yaml \
  --parameter-overrides "CodeBucket=${ARTIFACTS}" "CodeKey=${CODE_KEY}" \
  --no-fail-on-empty-changeset

output() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
SITE_URL="$(output SiteUrl)"
API_URL="$(output ApiUrl)"
SITE_BUCKET="$(output SiteBucketName)"
USER_POOL_ID="$(output UserPoolId)"
CLIENT_ID="$(output UserPoolClientId)"
FUNCTION_NAME="$(output ApiFunctionName)"

echo "==> Static sites -> s3://${SITE_BUCKET}/"
# Work on a copy so the bundle keeps the placeholder for the next run.
SITE_DIR="$(mktemp -d)"
cp -r web/. "$SITE_DIR/"
grep -rlF "$API_URL_PLACEHOLDER" "$SITE_DIR" | while read -r file; do
  sed -i "s#${API_URL_PLACEHOLDER}#${API_URL}#g" "$file"
done
printf '{"cognito":{"region":"%s","clientId":"%s"}}\n' "$REGION" "$CLIENT_ID" > "$SITE_DIR/admin/config.json"
# images/ holds uploaded product photos: never delete those.
aws s3 sync "$SITE_DIR/" "s3://${SITE_BUCKET}/" --delete --exclude "images/*" --only-show-errors
rm -rf "$SITE_DIR"

echo "==> Starter products"
aws lambda invoke --function-name "$FUNCTION_NAME" \
  --cli-binary-format raw-in-base64-out --payload '{"action":"seed"}' /tmp/aof-seed.json >/dev/null
cat /tmp/aof-seed.json; echo

echo "==> Cognito admin user ${ADMIN_USER}"
if aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$ADMIN_USER" >/dev/null 2>&1; then
  echo "exists (password unchanged)"
else
  # Meets the pool policy: upper + lower + digits, 21 characters.
  PASSWORD="Aof$(openssl rand -hex 8)X9"
  aws cognito-idp admin-create-user --user-pool-id "$USER_POOL_ID" --username "$ADMIN_USER" \
    --message-action SUPPRESS >/dev/null
  aws cognito-idp admin-set-user-password --user-pool-id "$USER_POOL_ID" --username "$ADMIN_USER" \
    --password "$PASSWORD" --permanent
  (umask 077 && printf '%s\n' "$PASSWORD" > "$PASSWORD_FILE")
  unset PASSWORD
  echo "created; password saved to ${PASSWORD_FILE}"
fi
aws cognito-idp admin-add-user-to-group --user-pool-id "$USER_POOL_ID" --username "$ADMIN_USER" --group-name admin

echo
echo "Storefront: ${SITE_URL}/"
echo "Admin:      ${SITE_URL}/admin/  (user: ${ADMIN_USER}, password: cat ${PASSWORD_FILE})"
echo "API:        ${API_URL}"
