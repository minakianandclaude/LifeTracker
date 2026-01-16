import { prisma } from "../index";

export async function resetDatabase() {
	await prisma.$transaction([
		prisma.taskTag.deleteMany(),
		prisma.tag.deleteMany(),
		prisma.task.deleteMany(),
		prisma.list.deleteMany(),
		prisma.refreshToken.deleteMany(),
		prisma.user.deleteMany(),
	]);
}

export async function seedTestDatabase() {
	await prisma.list.create({
		data: { name: "inbox", isSystem: true, isDeletable: false },
	});
}
