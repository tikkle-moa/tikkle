import { createServer } from "node:http";

const payments = new Map();
const port = 8081;

const sendJson = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
};

const readJson = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
};

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

  if (request.method === "GET" && url.pathname === "/health") {
    response.writeHead(200).end("ok");
    return;
  }

  if (request.method === "POST" && url.pathname === "/v1/payments/confirm") {
    const { paymentKey, orderId, amount } = await readJson(request);
    const payment = {
      paymentKey,
      orderId,
      totalAmount: amount,
      status: "DONE",
      method: "카드",
    };
    payments.set(paymentKey, payment);
    sendJson(response, 200, payment);
    return;
  }

  const paymentRoute = url.pathname.match(
    /^\/v1\/payments\/([^/]+)(\/cancel)?$/,
  );
  if (paymentRoute) {
    const paymentKey = decodeURIComponent(paymentRoute[1]);
    const payment = payments.get(paymentKey);

    if (!payment) {
      sendJson(response, 404, {
        code: "NOT_FOUND",
        message: "Payment not found",
      });
      return;
    }

    if (request.method === "POST" && paymentRoute[2] === "/cancel") {
      payment.status = "CANCELED";
      sendJson(response, 200, payment);
      return;
    }

    if (request.method === "GET" && !paymentRoute[2]) {
      sendJson(response, 200, payment);
      return;
    }
  }

  sendJson(response, 404, { code: "NOT_FOUND", message: "Route not found" });
}).listen(port, "0.0.0.0");
