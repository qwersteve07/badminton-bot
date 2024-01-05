import fetch from "node-fetch";
import "dotenv/config";

const accessToken = process.env.LINE_NOTIFY_PERSONAL_TOKEN;

export const sendLineNotify = async (message) => {
	const options = {
		method: "POST",
		headers: {
			Authorization: `Bearer ${accessToken}`,
		},
	};

	await fetch(
		`https://notify-api.line.me/api/notify?message=${message}`,
		options
	);
};
