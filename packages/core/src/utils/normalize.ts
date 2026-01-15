/**
 * Normalizes a list name by trimming whitespace and converting to lowercase.
 * This ensures consistent storage and comparison of list names.
 */
export function normalizeListName(name: string): string {
	return name.trim().toLowerCase();
}

/**
 * Converts a list name to Title Case for display purposes.
 * Example: "grocery list" -> "Grocery List"
 */
export function displayListName(name: string): string {
	return name
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(" ");
}
