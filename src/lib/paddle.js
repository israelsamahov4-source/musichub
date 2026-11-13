import { PADDLE_CLIENT_TOKEN, PADDLE_ENV } from "@/lib/config";

let loading = null;
let onComplete = () => {};

/** Loads Paddle.js once and initialises it with the public client token. */
function loadPaddle() {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdn.paddle.com/paddle/v2/paddle.js";
      s.async = true;
      s.onload = () => {
        if (PADDLE_ENV === "sandbox") window.Paddle.Environment.set("sandbox");
        window.Paddle.Initialize({
          token: PADDLE_CLIENT_TOKEN,
          eventCallback: (e) => { if (e.name === "checkout.completed") onComplete(); },
        });
        resolve(window.Paddle);
      };
      s.onerror = () => { loading = null; reject(new Error("failed to fetch payment form")); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

/** Opens Paddle's secure checkout for a transaction created by our server. */
export async function openCheckout({ transactionId, email, onCompleted }) {
  const Paddle = await loadPaddle();
  onComplete = onCompleted ?? (() => {});
  Paddle.Checkout.open({
    transactionId,
    customer: email ? { email } : undefined,
    settings: { displayMode: "overlay", theme: "light", locale: "he", successUrl: `${window.location.origin}/settings?checkout=success` },
  });
}
