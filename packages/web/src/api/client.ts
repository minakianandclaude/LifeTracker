const API_BASE = "/api";
const API_KEY = "dev-api-key-change-in-production";

interface ApiOptions {
	method?: string;
	body?: unknown;
}

async function apiRequest<T>(
	endpoint: string,
	options: ApiOptions = {},
): Promise<T> {
	const { method = "GET", body } = options;

	const headers: Record<string, string> = {
		"X-API-Key": API_KEY,
	};

	if (body) {
		headers["Content-Type"] = "application/json";
	}

	const response = await fetch(`${API_BASE}${endpoint}`, {
		method,
		headers,
		body: body ? JSON.stringify(body) : undefined,
	});

	if (!response.ok) {
		const error = await response
			.json()
			.catch(() => ({ message: "Request failed" }));
		throw new Error(error.message || `HTTP ${response.status}`);
	}

	if (response.status === 204) {
		return {} as T;
	}

	return response.json();
}

export interface Task {
	id: string;
	title: string;
	notes: string | null;
	listId: string;
	priority: "HIGH" | "MEDIUM" | "LOW" | null;
	dueDate: string | null;
	completed: boolean;
	completedAt: string | null;
	rawInput: string | null;
	parseWarning: boolean;
	parseErrors: string | null;
	createdAt: string;
	updatedAt: string;
	list: {
		id: string;
		name: string;
	};
}

export interface List {
	id: string;
	name: string;
	isSystem: boolean;
	isDeletable: boolean;
	_count?: {
		tasks: number;
	};
}

export const api = {
	getTasks: () => apiRequest<{ tasks: Task[] }>("/tasks"),
	getTask: (id: string) => apiRequest<{ task: Task }>(`/tasks/${id}`),
	createTask: (data: { title: string; notes?: string }) =>
		apiRequest<{ task: Task }>("/tasks", { method: "POST", body: data }),
	updateTask: (id: string, data: Partial<Task>) =>
		apiRequest<{ task: Task }>(`/tasks/${id}`, { method: "PATCH", body: data }),
	deleteTask: (id: string) =>
		apiRequest<void>(`/tasks/${id}`, { method: "DELETE" }),
	toggleComplete: (id: string) =>
		apiRequest<{ task: Task }>(`/tasks/${id}/complete`, { method: "POST" }),

	getLists: () => apiRequest<{ lists: List[] }>("/lists"),
	getList: (id: string) =>
		apiRequest<{ list: List & { tasks: Task[] } }>(`/lists/${id}`),
};
