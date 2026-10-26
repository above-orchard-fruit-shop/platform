# infra — deploy to AWS (Learner Lab)

Serverless stack from the architecture diagram, as one CloudFormation template
(`template.yaml`), adapted to what AWS Academy Learner Lab allows:

| Diagram | Template resource |
|---|---|
| S3 bucket `web/` · `images/` | `SiteBucket` — static website hosting: storefront at `/`, admin at `/admin/`, photos in `images/` |
| API Gateway · JWT auth | `HttpApi` (CORS for the website); `ANY /api/admin/{proxy+}` uses the Cognito `AdminAuthorizer` |
| Cognito · admin group | `UserPool`, `UserPoolClient`, `AdminGroup` |
| VPC 10.0.0.0/16, private subnets 10.0.1.0/24 · 10.0.2.0/24 | `Vpc`, `PrivateSubnetA/B` (no internet gateway or NAT) |
| Lambda · products · orders · admin | `ApiFunction` (FastAPI via Mangum, both subnets, role `LabRole`) |
| VPC gateway endpoints S3 · DynamoDB | `S3GatewayEndpoint`, `DynamoDbGatewayEndpoint` |
| DynamoDB products · orders · users | `ProductsTable`, `OrdersTable`, `CustomersTable` |
| CloudFront, AWS WAF | **Not deployed** — Learner Lab denies `cloudfront:CreateDistribution` (and OAC/OAI/Functions); WAF can only protect CloudFront or a REST API |

Customers still sign in with the API's own JWT; its signing key is generated in
Secrets Manager (`CustomerJwtSecret`). Learner Lab can't create IAM roles, so the
template creates none.

## Deploy

1. Build the bundle on your machine (needs uv and Node.js):

   ```bash
   python infra/build.py
   ```

   The sites are built with a placeholder API URL; `deploy.sh` replaces it with
   the stack's API Gateway URL.

2. In the AWS Console (region **us-east-1**) open **CloudShell**, choose
   **Actions → Upload file** and upload `dist/aof-bundle.zip`. If an uploader
   limits file size, upload the 9 MB chunks in `dist/parts/` instead and join them
   first: `cat aof-bundle.zip.part-* > aof-bundle.zip`.
3. In CloudShell:

   ```bash
   rm -rf aof && unzip -q aof-bundle.zip -d aof && bash aof/deploy.sh
   ```

   It prints the site URL; the admin dashboard is at `/admin/`, user `shopadmin`,
   password in `~/aof-admin-password.txt` (CloudShell home).

Re-run steps 1–3 to ship changes. Options: `STACK=…`, `ADMIN_USER=…`.

## Remove

```bash
bash aof/destroy.sh
```

## Notes

- S3 website endpoints are HTTP only (HTTPS needs CloudFront). Logins and API
  calls still go over HTTPS to Cognito and API Gateway.
- The website bucket is public-read (required for website hosting); uploads still
  need a presigned POST from the admin API.
