"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useState, type FormEvent } from "react";
import { type ProductInput } from "@/lib/api";
import type { Product } from "@/lib/types";
import FruitImage from "./FruitImage";

type Form = {
  name: string;
  description: string;
  category: string;
  price: string;
  unit: string;
  stock: string;
  emoji: string;
  image_url: string;
  is_active: boolean;
};
type Errors = Partial<Record<keyof Form, string>>;

function toForm(p?: Product | null): Form {
  return {
    name: p?.name ?? "",
    description: p?.description ?? "",
    category: p?.category ?? "ผลไม้ไทย",
    price: p ? String(p.price) : "",
    unit: p?.unit ?? "กก.",
    stock: p ? String(p.stock) : "0",
    emoji: p?.emoji ?? "",
    image_url: p?.image_url ?? "",
    is_active: p?.is_active ?? true,
  };
}

function validate(f: Form): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = "กรุณากรอกชื่อสินค้า";
  if (!f.category.trim()) e.category = "กรุณากรอกหมวดหมู่";
  if (!f.unit.trim()) e.unit = "กรุณากรอกหน่วย";
  const price = Number(f.price);
  if (f.price === "" || !Number.isFinite(price) || price < 0) e.price = "ราคาต้องเป็นตัวเลข ≥ 0";
  const stock = Number(f.stock);
  if (f.stock === "" || !Number.isInteger(stock) || stock < 0) e.stock = "สต็อกต้องเป็นจำนวนเต็ม ≥ 0";
  if (f.image_url && !/^https:\/\//.test(f.image_url)) e.image_url = "ต้องเป็นลิงก์ https://";
  return e;
}

type Props = {
  /** product to edit, or null to create a new one */
  product: Product | null;
  categories: string[];
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<void>;
};

/** Mount with a `key` so the form resets each time it opens. */
export default function ProductDialog({ product, categories, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<Form>(() => toForm(product));
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const field = (key: Exclude<keyof Form, "is_active">) => ({
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
    setSaving(true);
    setSaveError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price: Number(form.price),
        unit: form.unit.trim(),
        stock: Number(form.stock),
        emoji: form.emoji.trim() || null,
        image_url: form.image_url.trim() || null,
        is_active: form.is_active,
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "บันทึกไม่สำเร็จ");
      setSaving(false);
    }
  }

  return (
    <Dialog open onClose={saving ? undefined : onClose} fullWidth maxWidth="sm">
      <Box component="form" noValidate onSubmit={handleSubmit}>
        <DialogTitle>{product ? "แก้ไขสินค้า" : "เพิ่มสินค้าใหม่"}</DialogTitle>
        <DialogContent dividers>
          <Stack sx={{ gap: 2 }}>
            {saveError && <Alert severity="error">{saveError}</Alert>}
            <Stack direction="row" sx={{ gap: 2, alignItems: "flex-start" }}>
              <Box sx={{ width: 96, flexShrink: 0, border: 1, borderColor: "divider", borderRadius: 3, overflow: "hidden" }}>
                <FruitImage
                  product={{ name: form.name, emoji: form.emoji, image_url: errors.image_url ? null : form.image_url }}
                  height={96}
                  size={48}
                />
              </Box>
              <Stack sx={{ gap: 2, flex: 1 }}>
                <TextField label="ชื่อสินค้า" required autoFocus {...field("name")} />
                <TextField
                  label="หมวดหมู่"
                  required
                  {...field("category")}
                  slotProps={{ htmlInput: { list: "category-options" } }}
                />
                <datalist id="category-options">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Stack>
            </Stack>
            <Stack direction="row" sx={{ gap: 2 }}>
              <TextField label="ราคา (บาท)" type="number" required fullWidth {...field("price")} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} />
              <TextField label="หน่วย" required fullWidth {...field("unit")} placeholder="กก., ลูก, หวี" />
              <TextField label="สต็อก" type="number" required fullWidth {...field("stock")} slotProps={{ htmlInput: { min: 0, step: 1 } }} />
            </Stack>
            <TextField label="รายละเอียด" multiline minRows={3} {...field("description")} />
            <Stack direction="row" sx={{ gap: 2 }}>
              <TextField label="อีโมจิ" sx={{ width: 120 }} {...field("emoji")} placeholder="🍎" />
              <TextField
                label="ลิงก์รูปภาพ (S3/CloudFront)"
                fullWidth
                {...field("image_url")}
                placeholder="https://..."
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                />
              }
              label={form.is_active ? "แสดงบนหน้าร้าน" : "ซ่อนจากหน้าร้าน"}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button type="submit" variant="contained" disabled={saving}>
            {saving ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
