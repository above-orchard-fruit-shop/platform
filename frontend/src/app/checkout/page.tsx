"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Paper from "@mui/material/Paper";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createOrder, errorMessage } from "@/lib/api";
import { useCart } from "@/lib/cart";
import { formatTHB, PAYMENT_LABEL } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";

type Form = {
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  payment_method: PaymentMethod;
};
type Errors = Partial<Record<keyof Form, string>>;

const EMPTY_FORM: Form = {
  name: "",
  phone: "",
  email: "",
  address: "",
  note: "",
  payment_method: "cod",
};

function validate(f: Form): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = "กรุณากรอกชื่อ-นามสกุล";
  if (!/^0\d{8,9}$/.test(f.phone.replace(/[\s-]/g, "")))
    e.phone = "กรุณากรอกเบอร์โทร 9–10 หลัก ขึ้นต้นด้วย 0";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email))
    e.email = "รูปแบบอีเมลไม่ถูกต้อง";
  if (f.address.trim().length < 10) e.address = "กรุณากรอกที่อยู่จัดส่งให้ครบถ้วน";
  return e;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, total, clear } = useCart();
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const field = (key: keyof Form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
    error: Boolean(errors[key]),
    helperText: errors[key],
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const found = validate(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const order = await createOrder({
        customer: {
          name: form.name.trim(),
          phone: form.phone.replace(/[\s-]/g, ""),
          email: form.email.trim() || undefined,
          address: form.address.trim(),
        },
        items: items.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
        payment_method: form.payment_method,
        note: form.note.trim() || undefined,
      });
      clear();
      router.push(`/orders/${encodeURIComponent(order.id)}`);
    } catch (err) {
      setSubmitError(errorMessage(err));
      setSubmitting(false);
    }
  }

  if (items.length === 0 && !submitting) {
    return (
      <Container maxWidth="sm" sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          ยังไม่มีสินค้าในตะกร้า
        </Typography>
        <Button component={Link} href="/" variant="contained">
          เลือกซื้อสินค้า
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>
        ข้อมูลการจัดส่ง
      </Typography>
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{ display: "grid", gap: 3, gridTemplateColumns: { md: "2fr 1fr" }, alignItems: "start" }}
      >
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Stack sx={{ gap: 2 }}>
            <TextField label="ชื่อ-นามสกุล" required autoComplete="name" {...field("name")} />
            <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2 }}>
              <TextField
                label="เบอร์โทรศัพท์"
                required
                fullWidth
                autoComplete="tel"
                slotProps={{ htmlInput: { inputMode: "tel" } }}
                {...field("phone")}
              />
              <TextField
                label="อีเมล (ไม่บังคับ)"
                type="email"
                fullWidth
                autoComplete="email"
                {...field("email")}
              />
            </Stack>
            <TextField
              label="ที่อยู่จัดส่ง"
              required
              multiline
              minRows={3}
              autoComplete="street-address"
              {...field("address")}
            />
            <TextField label="หมายเหตุถึงร้าน (ไม่บังคับ)" multiline minRows={2} {...field("note")} />

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                วิธีชำระเงิน
              </Typography>
              <RadioGroup
                value={form.payment_method}
                onChange={(e) =>
                  setForm((f) => ({ ...f, payment_method: e.target.value as PaymentMethod }))
                }
              >
                {(Object.keys(PAYMENT_LABEL) as PaymentMethod[]).map((m) => (
                  <FormControlLabel key={m} value={m} control={<Radio />} label={PAYMENT_LABEL[m]} />
                ))}
              </RadioGroup>
            </Box>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3, position: { md: "sticky" }, top: { md: 96 } }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            รายการสินค้า
          </Typography>
          <Stack sx={{ gap: 1, mb: 2 }}>
            {items.map((l) => (
              <Stack key={l.product.id} direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
                <Typography variant="body2">
                  {l.product.name} × {l.quantity} {l.product.unit}
                </Typography>
                <Typography variant="body2">{formatTHB(l.product.price * l.quantity)}</Typography>
              </Stack>
            ))}
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Stack direction="row" sx={{ justifyContent: "space-between", mb: 3 }}>
            <Typography variant="h6">ยอดรวม</Typography>
            <Typography variant="h6" sx={{ color: "primary.main" }}>
              {formatTHB(total)}
            </Typography>
          </Stack>
          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            {submitting ? "กำลังส่งคำสั่งซื้อ..." : "ยืนยันคำสั่งซื้อ"}
          </Button>
          <Button component={Link} href="/cart" fullWidth sx={{ mt: 1 }} disabled={submitting}>
            กลับไปแก้ไขตะกร้า
          </Button>
        </Paper>
      </Box>
    </Container>
  );
}
