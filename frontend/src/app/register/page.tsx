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
import { errorMessage, registerCustomer } from "@/lib/api";
import { safeNext, useAuth } from "@/lib/session";

type Form = { name: string; email: string; phone: string; password: string; confirm: string };
type Errors = Partial<Record<keyof Form, string>>;

const EMPTY_FORM: Form = { name: "", email: "", phone: "", password: "", confirm: "" };
const MIN_PASSWORD = 8; // same rule as the backend

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "กรุณากรอกชื่อ-นามสกุล";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "รูปแบบอีเมลไม่ถูกต้อง";
  if (!/^0\d{8,9}$/.test(f.phone.replace(/[\s-]/g, "")))
    e.phone = "กรุณากรอกเบอร์โทร 9–10 หลัก ขึ้นต้นด้วย 0";
  if (f.password.length < MIN_PASSWORD) e.password = `รหัสผ่านอย่างน้อย ${MIN_PASSWORD} ตัวอักษร`;
  if (f.confirm !== f.password) e.confirm = "รหัสผ่านไม่ตรงกัน";
  return e;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const auth = useAuth();
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (auth.status === "signed-in") router.replace(next);
  }, [auth.status, next, router]);

  const field = (key: keyof Form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value })),
    error: Boolean(errors[key]),
    helperText: errors[key],
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await registerCustomer({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/[\s-]/g, ""),
        password: form.password,
      });
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <AuthCard title="สมัครสมาชิก" subtitle="สร้างบัญชีเพื่อสั่งซื้อผลไม้ออนไลน์">
      <Stack component="form" noValidate onSubmit={handleSubmit} sx={{ gap: 2 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="ชื่อ-นามสกุล" required autoComplete="name" autoFocus {...field("name")} />
        <TextField label="อีเมล" type="email" required autoComplete="email" {...field("email")} />
        <TextField
          label="เบอร์โทรศัพท์"
          required
          autoComplete="tel"
          slotProps={{ htmlInput: { inputMode: "tel" } }}
          {...field("phone")}
        />
        <TextField label="รหัสผ่าน" type="password" required autoComplete="new-password" {...field("password")} />
        <TextField
          label="ยืนยันรหัสผ่าน"
          type="password"
          required
          autoComplete="new-password"
          {...field("confirm")}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
        >
          สมัครสมาชิก
        </Button>
        <Typography variant="body2" sx={{ textAlign: "center", color: "text.secondary" }}>
          มีบัญชีอยู่แล้ว?{" "}
          <Link href={`/login?next=${encodeURIComponent(next)}`} style={{ fontWeight: 600 }}>
            เข้าสู่ระบบ
          </Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
