/**
 * Admin sign-in with Amazon Cognito (used on AWS; local dev uses the backend's /auth/login).
 *
 * The deploy script writes `<basePath>/config.json` with the user pool client, so
 * the same build works in any account. No config file → Cognito is off.
 * The ID token is sent as the Bearer token; API Gateway verifies it and the
 * backend checks the `admin` group.
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const ADMIN_GROUP = "admin";
const REGION_PATTERN = /^[a-z]{2}(-[a-z]+)+-\d+$/;

export type CognitoConfig = { region: string; clientId: string };

export class CognitoError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "CognitoError";
  }
}

let configPromise: Promise<CognitoConfig | null> | null = null;

async function fetchConfig(): Promise<CognitoConfig | null> {
  try {
    const res = await fetch(`${BASE_PATH}/config.json`, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { cognito?: Partial<CognitoConfig> };
    const { region, clientId } = body.cognito ?? {};
    if (typeof region !== "string" || !REGION_PATTERN.test(region)) return null;
    if (typeof clientId !== "string" || !clientId) return null;
    return { region, clientId };
  } catch {
    return null;
  }
}

/** Cognito settings for this deployment, or null when the site isn't using Cognito. */
export function loadCognitoConfig(): Promise<CognitoConfig | null> {
  configPromise ??= fetchConfig();
  return configPromise;
}

function tokenGroups(idToken: string): string[] {
  try {
    const payload = idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload)) as { "cognito:groups"?: unknown };
    const groups = claims["cognito:groups"];
    return Array.isArray(groups) ? groups.map(String) : [];
  } catch {
    return [];
  }
}

/** Sign in with username + password and return the ID token. */
export async function cognitoSignIn(config: CognitoConfig, username: string, password: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`https://cognito-idp.${config.region}.amazonaws.com/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      },
      body: JSON.stringify({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: config.clientId,
        AuthParameters: { USERNAME: username, PASSWORD: password },
      }),
    });
  } catch {
    throw new CognitoError("เชื่อมต่อระบบยืนยันตัวตนไม่ได้", 0);
  }

  const body = (await res.json().catch(() => ({}))) as {
    __type?: string;
    ChallengeName?: string;
    AuthenticationResult?: { IdToken?: string };
  };
  if (!res.ok) {
    const type = body.__type ?? "";
    if (type.includes("NotAuthorized") || type.includes("UserNotFound")) {
      throw new CognitoError("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง", 401);
    }
    if (type.includes("TooManyRequests") || type.includes("LimitExceeded")) {
      throw new CognitoError("ลองเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่", 429);
    }
    throw new CognitoError(`เข้าสู่ระบบไม่สำเร็จ (${res.status})`, res.status);
  }
  if (body.ChallengeName) {
    // e.g. NEW_PASSWORD_REQUIRED: the deploy script sets a permanent password, so
    // this only happens for users created by hand in the console.
    throw new CognitoError("บัญชีนี้ต้องตั้งรหัสผ่านใหม่ใน Cognito ก่อนใช้งาน", 403);
  }
  const idToken = body.AuthenticationResult?.IdToken;
  if (!idToken) throw new CognitoError("เข้าสู่ระบบไม่สำเร็จ", 500);
  if (!tokenGroups(idToken).includes(ADMIN_GROUP)) {
    throw new CognitoError("บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลร้าน", 403);
  }
  return idToken;
}
