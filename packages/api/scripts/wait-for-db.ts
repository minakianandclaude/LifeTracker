const MAX_RETRIES = 30;
const RETRY_DELAY_MS = 1000;

async function checkPostgres(): Promise<boolean> {
	try {
		const socket = await Bun.connect({
			hostname: "postgres",
			port: 5432,
			socket: {
				data() {},
				open() {},
				close() {},
				error() {},
			},
		});
		socket.end();
		return true;
	} catch {
		return false;
	}
}

async function waitForPostgres(): Promise<void> {
	console.log("Waiting for postgres to be ready...");

	for (let i = 0; i < MAX_RETRIES; i++) {
		if (await checkPostgres()) {
			console.log("Postgres is ready!");
			return;
		}
		console.log(
			`Postgres unavailable, retrying in ${RETRY_DELAY_MS}ms... (${i + 1}/${MAX_RETRIES})`,
		);
		await Bun.sleep(RETRY_DELAY_MS);
	}

	throw new Error("Could not connect to postgres after maximum retries");
}

await waitForPostgres();
