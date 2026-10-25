"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type FormEvent } from "react";
import AuthCard, { PageSpinner } from "@/components/AuthCard";
import { errorMessage, isMockMode, loginCustomer } from "@/lib/api";
import { safeNext, useAuth } from "@/lib/session";

export default function LoginPage() {
  // useSearchParams needs a Suspense boundary so the rest of the page can prerender.
  return (
    <Suspense fallback={<PageSpinner />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (or just signed in): continue where the shopper was going.
  useEffect(() => {
    if (auth.status === "signed-in") router.replace(next);
  }, [auth.status, next, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginCustomer(email.trim(), password);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="เข้าสู่ระบบ" subtitle="เข้าสู่ระบบเพื่อใส่ตะกร้าและสั่งซื้อสินค้า">
      <Stack component="form" noValidate onSubmit={handleSubmit} sx={{ gap: 2 }}>
        {isMockMode && (
          <Alert severity="info">โหมดทดลอง: สมัครสมาชิกได้เลย บัญชีจะเก็บไว้ในเบราว์เซอร์นี้</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="อีเมล"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          autoFocus
          required
        />
        <TextField
          label="รหัสผ่าน"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting || !email.trim() || !password}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          เข้าสู่ระบบ
        </Button>
        <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
          ยังไม่มีบัญชี?{" "}
          <Link href={`/register?next=${encodeURIComponent(next)}`} style={{ fontWeight: 600 }}>
            สมัครสมาชิก
          </Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
