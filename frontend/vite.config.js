import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development, requests to /api are forwarded to the FastAPI server (python server.py).
export default defineConfig({
  plugins: [react()],
  server: { proxy: { "/api": "http://localhost:8000" } },
});
