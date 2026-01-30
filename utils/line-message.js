import fetch from "node-fetch";
import "dotenv/config";

const accessToken = process.env.LINE_MESSAGE_PERSONAL_TOKEN;
const url = "https://api.line.me/v2/bot/message/push";
const myUserId = "Ud54e94fb5df3e0acedb253e444b4ee9d";

export const sendLineMessage = async (message) => {
	const data = JSON.stringify({
		to: myUserId,
		messages: [
			{
				type: "text",
				text: message,
			},
		],
	});

	const options = {
		method: "post",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
		body: data,
	};

	try {
		await fetch(url, options);
	} catch (e) {
		console.log(e);
	}
};
