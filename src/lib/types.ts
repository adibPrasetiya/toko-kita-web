export interface SerialNumber {
	serialNumberId: string;
	clientName: string | null;
	clientPhoneNumber: string | null;
	shopName: string | null;
	deviceId: string | null;
	isActivate: boolean;
	status: 'AVAILABLE' | 'SELL' | 'SOLD' | 'DEMO';
	notes: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface Pagination {
	page: number;
	limit: number;
	totalItems: number;
	totalPages: number;
}

export interface SerialNumberListResponse {
	message: string;
	data: SerialNumber[];
	pagination: Pagination;
}
