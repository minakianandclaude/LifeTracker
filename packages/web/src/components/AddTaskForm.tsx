import { type FormEvent, useState } from "react";

interface AddTaskFormProps {
	onAdd: (title: string) => Promise<void>;
	disabled?: boolean;
}

export function AddTaskForm({ onAdd, disabled }: AddTaskFormProps) {
	const [title, setTitle] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		const trimmed = title.trim();
		if (!trimmed || isSubmitting) return;

		setIsSubmitting(true);
		try {
			await onAdd(trimmed);
			setTitle("");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<form
			onSubmit={handleSubmit}
			style={{
				display: "flex",
				padding: "1rem",
				borderBottom: "1px solid #eee",
				gap: "0.5rem",
			}}
		>
			<input
				type="text"
				value={title}
				onChange={(e) => setTitle(e.target.value)}
				placeholder="Add a task..."
				disabled={disabled || isSubmitting}
				style={{
					flex: 1,
					padding: "0.75rem",
					fontSize: "1rem",
					border: "1px solid #ddd",
					borderRadius: "4px",
				}}
			/>
			<button
				type="submit"
				disabled={!title.trim() || disabled || isSubmitting}
				style={{
					padding: "0.75rem 1.5rem",
					fontSize: "1rem",
					backgroundColor: "#007bff",
					color: "white",
					border: "none",
					borderRadius: "4px",
					cursor: "pointer",
					opacity: !title.trim() || disabled || isSubmitting ? 0.5 : 1,
				}}
			>
				{isSubmitting ? "Adding..." : "Add"}
			</button>
		</form>
	);
}
