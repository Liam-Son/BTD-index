import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

// Permanent redirect so /index.html never becomes a duplicate of "/"
export const Route = createFileRoute("/index.html")({
  server: {
    handlers: {
      GET: async () => new Response(null, { status: 301, headers: { Location: "/" } }),
    },
  },
});
