import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

serve(() => {
  return new Response(
    JSON.stringify({ status: "ok", service: "health-check" }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    },
  );
});
