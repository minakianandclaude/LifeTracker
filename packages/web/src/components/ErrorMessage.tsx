interface ErrorMessageProps {
	message: string;
	onDismiss?: () => void;
}

export function ErrorMessage({ message, onDismiss }: ErrorMessageProps) {
	return (
		<div
			style={{
				padding: "1rem",
				backgroundColor: "#fee",
				borderLeft: "4px solid #c00",
				marginBottom: "1rem",
				display: "flex",
				alignItems: "center",
				justifyContent: "space-between",
			}}
		>
			<span style={{ color: "#c00" }}>{message}</span>
			{onDismiss && (
				<button
					type="button"
					onClick={onDismiss}
					style={{
						background: "none",
						border: "none",
						cursor: "pointer",
						fontSize: "1.2rem",
					}}
				>
					×
				</button>
			)}
		</div>
	);
}
