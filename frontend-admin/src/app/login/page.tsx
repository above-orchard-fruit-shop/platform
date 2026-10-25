"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, type FormEvent } from "react";
import { errorMessage, isMockMode, login } from "@/lib/api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(username.trim(), password);
      // AdminShell redirects to "/" once the token is stored
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        p: 2,
        background: "linear-gradient(120deg, #e8f5e9 0%, #fff3e0 100%)",
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, width: "100%", maxWidth: 400 }}>
        <Stack component="form" onSubmit={handleSubmit} sx={{ gap: 2 }}>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontSize: 44 }} aria-hidden>
              🍊
            </Typography>
            <Typography variant="h5" component="h1">
              ระบบหลังร้าน
            </Typography>
            <Typography sx={{ color: "text.secondary" }}>ร้านผลไม้เบื้องบน</Typography>
          </Box>
          {isMockMode && (
            <Alert severity="info">
              โหมดทดลอง: ใช้ <b>admin</b> / <b>admin1234</b>
            </Alert>
          )}
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="ชื่อผู้ใช้"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
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
            disabled={submitting || !username || !password}
            startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : null}
          >
            เข้าสู่ระบบ
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
