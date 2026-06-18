import { API_BASE } from '$lib/api/apiBase';
import type {
	LocalStoreDetailDTO,
	LocalStoreDTO,
	LocalStoreProductDTO,
	LocalStoreProductInput,
	LocalStoreUpdateInput
} from '$lib/types/localStore';

function authHeaders(token: string): HeadersInit {
	return {
		Authorization: `Bearer ${token}`,
		'Content-Type': 'application/json'
	};
}

type ApiProduct = {
	id: number;
	store_id: number;
	name: string;
	category: string;
	package_price: number;
	shipping_fee: number;
	package_size: number;
	package_unit: string;
	base_quantity: number;
	base_unit: string;
	unit_cost: number;
	notes: string;
	image_url: string;
	is_available: boolean;
	updated_at: string;
};

type ApiStore = {
	id: number;
	owner_user_id: number;
	store_name: string;
	description: string;
	address: string;
	contact_number: string;
	is_active: boolean;
	created_at: string;
	updated_at: string;
	product_count: number;
	products?: ApiProduct[];
};

function mapProduct(row: ApiProduct): LocalStoreProductDTO {
	return {
		id: row.id,
		storeId: row.store_id,
		name: row.name,
		category: row.category as LocalStoreProductDTO['category'],
		packagePrice: row.package_price,
		shippingFee: row.shipping_fee,
		packageSize: row.package_size,
		packageUnit: row.package_unit as LocalStoreProductDTO['packageUnit'],
		baseQuantity: row.base_quantity,
		baseUnit: row.base_unit as LocalStoreProductDTO['baseUnit'],
		unitCost: row.unit_cost,
		notes: row.notes,
		imageUrl: row.image_url ?? '',
		isAvailable: row.is_available,
		updatedAt: row.updated_at
	};
}

function mapStore(row: ApiStore): LocalStoreDTO {
	return {
		id: row.id,
		ownerUserId: row.owner_user_id,
		storeName: row.store_name,
		description: row.description,
		address: row.address,
		contactNumber: row.contact_number,
		isActive: row.is_active,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		productCount: row.product_count
	};
}

function mapStoreDetail(row: ApiStore): LocalStoreDetailDTO {
	return {
		...mapStore(row),
		products: (row.products ?? []).map(mapProduct)
	};
}

async function parseError(res: Response): Promise<string> {
	const text = await res.text();
	try {
		const j = JSON.parse(text) as { detail?: string | { msg?: string }[] };
		if (typeof j.detail === 'string') return j.detail;
		if (Array.isArray(j.detail) && j.detail[0]?.msg) return j.detail[0].msg;
	} catch {
		/* ignore */
	}
	return text || `Request failed (${res.status})`;
}

function productBody(input: LocalStoreProductInput) {
	return {
		name: input.name,
		category: input.category,
		package_price: input.packagePrice,
		shipping_fee: input.shippingFee,
		package_size: input.packageSize,
		package_unit: input.packageUnit,
		base_quantity: input.baseQuantity,
		base_unit: input.baseUnit,
		unit_cost: input.unitCost,
		notes: input.notes ?? '',
		image_url: input.imageUrl?.trim() ?? '',
		is_available: input.isAvailable ?? true
	};
}

export async function listLocalStores(token: string): Promise<LocalStoreDTO[]> {
	const res = await fetch(`${API_BASE}/local-stores`, { headers: authHeaders(token) });
	if (!res.ok) throw new Error(await parseError(res));
	const rows = (await res.json()) as ApiStore[];
	return rows.map(mapStore);
}

export async function getLocalStore(token: string, storeId: number): Promise<LocalStoreDetailDTO> {
	const res = await fetch(`${API_BASE}/local-stores/${storeId}`, { headers: authHeaders(token) });
	if (!res.ok) throw new Error(await parseError(res));
	return mapStoreDetail((await res.json()) as ApiStore);
}

export async function getSupplierStore(token: string): Promise<LocalStoreDetailDTO> {
	const res = await fetch(`${API_BASE}/supplier/store`, { headers: authHeaders(token) });
	if (!res.ok) throw new Error(await parseError(res));
	return mapStoreDetail((await res.json()) as ApiStore);
}

export async function updateSupplierStore(
	token: string,
	patch: LocalStoreUpdateInput
): Promise<LocalStoreDTO> {
	const body: Record<string, unknown> = {};
	if (patch.storeName !== undefined) body.store_name = patch.storeName;
	if (patch.description !== undefined) body.description = patch.description;
	if (patch.address !== undefined) body.address = patch.address;
	if (patch.contactNumber !== undefined) body.contact_number = patch.contactNumber;
	if (patch.isActive !== undefined) body.is_active = patch.isActive;

	const res = await fetch(`${API_BASE}/supplier/store`, {
		method: 'PUT',
		headers: authHeaders(token),
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(await parseError(res));
	return mapStore((await res.json()) as ApiStore);
}

export async function createSupplierProduct(
	token: string,
	input: LocalStoreProductInput
): Promise<LocalStoreProductDTO> {
	const res = await fetch(`${API_BASE}/supplier/products`, {
		method: 'POST',
		headers: authHeaders(token),
		body: JSON.stringify(productBody(input))
	});
	if (!res.ok) throw new Error(await parseError(res));
	return mapProduct((await res.json()) as ApiProduct);
}

export async function updateSupplierProduct(
	token: string,
	productId: number,
	patch: Partial<LocalStoreProductInput>
): Promise<LocalStoreProductDTO> {
	const body: Record<string, unknown> = {};
	if (patch.name !== undefined) body.name = patch.name;
	if (patch.category !== undefined) body.category = patch.category;
	if (patch.packagePrice !== undefined) body.package_price = patch.packagePrice;
	if (patch.shippingFee !== undefined) body.shipping_fee = patch.shippingFee;
	if (patch.packageSize !== undefined) body.package_size = patch.packageSize;
	if (patch.packageUnit !== undefined) body.package_unit = patch.packageUnit;
	if (patch.baseQuantity !== undefined) body.base_quantity = patch.baseQuantity;
	if (patch.baseUnit !== undefined) body.base_unit = patch.baseUnit;
	if (patch.unitCost !== undefined) body.unit_cost = patch.unitCost;
	if (patch.notes !== undefined) body.notes = patch.notes;
	if (patch.imageUrl !== undefined) body.image_url = patch.imageUrl;
	if (patch.isAvailable !== undefined) body.is_available = patch.isAvailable;

	const res = await fetch(`${API_BASE}/supplier/products/${productId}`, {
		method: 'PATCH',
		headers: authHeaders(token),
		body: JSON.stringify(body)
	});
	if (!res.ok) throw new Error(await parseError(res));
	return mapProduct((await res.json()) as ApiProduct);
}

export async function deleteSupplierProduct(token: string, productId: number): Promise<void> {
	const res = await fetch(`${API_BASE}/supplier/products/${productId}`, {
		method: 'DELETE',
		headers: authHeaders(token)
	});
	if (!res.ok) throw new Error(await parseError(res));
}

export interface SupplierRegisterInput {
	email: string;
	password: string;
	storeName: string;
	storeDescription?: string;
	storeAddress?: string;
	contactNumber?: string;
}

export async function registerSupplierAccount(input: SupplierRegisterInput): Promise<void> {
	const res = await fetch(`${API_BASE}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			email: input.email.trim(),
			password: input.password,
			role: 'local_supplier',
			store_name: input.storeName.trim(),
			store_description: input.storeDescription?.trim() ?? '',
			store_address: input.storeAddress?.trim() ?? '',
			contact_number: input.contactNumber?.trim() ?? ''
		})
	});
	if (!res.ok) throw new Error(await parseError(res));
}
