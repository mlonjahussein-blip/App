// server/serverless/health.ts
function handler(req, res) {
  return res.status(200).json({
    status: "ok",
    service: "eFootball AI Hub API",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    paymentStatus: "active_test_mode"
  });
}
export {
  handler as default
};
