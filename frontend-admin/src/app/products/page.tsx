"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SearchIcon from "@mui/icons-material/Search";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import ProductDialog from "@/components/ProductDialog";
import { useToast } from "@/components/Toast";
import {
  createProduct,
  deleteProduct,
  errorMessage,
  listProducts,
  updateProduct,
  type ProductInput,
} from "@/lib/api";
import { formatTHB, LOW_STOCK } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

type Editing = { product: Product | null; key: number } | null;

export default function ProductsPage() {
  const { data: products, loading, error, reload } = useLoad(listProducts);
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const categories = [...new Set((products ?? []).map((p) => p.category))];
  const q = query.trim().toLowerCase();
  const visible = (products ?? []).filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
  );

  async function handleSave(input: ProductInput) {
    if (editing?.product) {
      await updateProduct(editing.product.id, input);
      toast(`บันทึก “${input.name}” แล้ว`);
    } else {
      await createProduct(input);
      toast(`เพิ่ม “${input.name}” แล้ว`);
    }
    setEditing(null);
    reload();
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await deleteProduct(deleting.id);
      toast(`ลบ “${deleting.name}” แล้ว`);
      setDeleting(null);
      reload();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <Stack sx={{ gap: 2 }}>
      <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: 2, justifyContent: "space-between" }}>
        <TextField
          size="small"
          placeholder="ค้นหาชื่อหรือหมวดหมู่"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ minWidth: { sm: 300 }, bgcolor: "background.paper" }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditing({ product: null, key: Date.now() })}
        >
          เพิ่มสินค้า
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" action={<Button color="inherit" onClick={reload}>ลองใหม่</Button>}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined">
        {loading && <LinearProgress />}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>สินค้า</TableCell>
                <TableCell>หมวดหมู่</TableCell>
                <TableCell align="right">ราคา</TableCell>
                <TableCell align="right">สต็อก</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell align="right">จัดการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visible.map((p) => (
                <TableRow key={p.id} hover sx={{ opacity: p.is_active ? 1 : 0.6 }}>
                  <TableCell>
                    <Stack direction="row" sx={{ alignItems: "center", gap: 1.5 }}>
                      <Box component="span" sx={{ fontSize: 28 }} aria-hidden>
                        {p.emoji || "🧺"}
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontWeight: 600 }}>{p.name}</Typography>
                        <Typography variant="caption" sx={{ color: "text.secondary" }}>
                          {p.id}
                        </Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    {formatTHB(p.price)} / {p.unit}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      size="small"
                      label={`${p.stock} ${p.unit}`}
                      color={p.stock === 0 ? "error" : p.stock <= LOW_STOCK ? "warning" : "default"}
                      variant={p.stock <= LOW_STOCK ? "filled" : "outlined"}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={p.is_active ? "แสดง" : "ซ่อน"}
                      color={p.is_active ? "success" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                    <Tooltip title="แก้ไข">
                      <IconButton onClick={() => setEditing({ product: p, key: Date.now() })}>
                        <EditOutlinedIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="ลบ">
                      <IconButton color="error" onClick={() => setDeleting(p)}>
                        <DeleteOutlineIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {products && visible.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>
                    {products.length === 0 ? "ยังไม่มีสินค้า กด “เพิ่มสินค้า” เพื่อเริ่มต้น" : "ไม่พบสินค้าที่ค้นหา"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {editing && (
        <ProductDialog
          key={editing.key}
          product={editing.product}
          categories={categories}
          onClose={() => setEditing(null)}
          onSubmit={handleSave}
        />
      )}

      <Dialog open={deleting !== null} onClose={() => !deleteBusy && setDeleting(null)}>
        <DialogTitle>ลบสินค้า?</DialogTitle>
        <DialogContent>
          ต้องการลบ “{deleting?.name}” ออกจากระบบใช่ไหม ถ้าแค่ต้องการหยุดขายชั่วคราว
          ให้แก้ไขเป็น “ซ่อนจากหน้าร้าน” แทน
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)} disabled={deleteBusy}>
            ยกเลิก
          </Button>
          <Button color="error" variant="contained" onClick={handleDelete} disabled={deleteBusy}>
            ลบสินค้า
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
