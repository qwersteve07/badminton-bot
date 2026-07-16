import fetch from "node-fetch";
import "dotenv/config";

const notifyToken =
  process.env.LINE_NOTIFY_PERSONAL_TOKEN ?? process.env.LINE_MESSAGE_PERSONAL_TOKEN;
const notifyUrl = "https://notify-api.line.me/api/notify";

export const sendLineMessage = async (message) => {
  if (!notifyToken) {
    console.warn("LINE notification token is missing; skipping notification.");
    return;
  }

  const body = new URLSearchParams({ message });

  const response = await fetch(notifyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${notifyToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`LINE notify request failed: ${response.status} ${response.statusText}`);
  }
};
