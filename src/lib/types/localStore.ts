import type { MeasureUnit } from '$lib/types/recipe';

export type UserRole = 'cafe_owner' | 'local_supplier';

export type LocalStoreProductCategory = 'ingredient' | 'other';

export interface LocalStoreProductDTO {
	id: number;
	storeId: number;
	name: string;
	category: LocalStoreProductCategory;
	packagePrice: number;
	shippingFee: number;
	packageSize: number;
	packageUnit: MeasureUnit;
	baseQuantity: number;
	baseUnit: 'g' | 'ml' | 'piece';
	unitCost: number;
	notes: string;
	imageUrl: string;
	isAvailable: boolean;
	updatedAt: string;
}

export interface LocalStoreDTO {
	id: number;
	ownerUserId: number;
	storeName: string;
	description: string;
	address: string;
	contactNumber: string;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	productCount: number;
}

export interface LocalStoreDetailDTO extends LocalStoreDTO {
	products: LocalStoreProductDTO[];
}

export interface LocalStoreProductInput {
	name: string;
	category: LocalStoreProductCategory;
	packagePrice: number;
	shippingFee: number;
	packageSize: number;
	packageUnit: MeasureUnit;
	baseQuantity: number;
	baseUnit: 'g' | 'ml' | 'piece';
	unitCost: number;
	notes?: string;
	imageUrl?: string;
	isAvailable?: boolean;
}

export interface LocalStoreUpdateInput {
	storeName?: string;
	description?: string;
	address?: string;
	contactNumber?: string;
	isActive?: boolean;
}

/** Tracks which local-store listing a cafe owner imported into their catalog. */
export interface LocalStoreCatalogSource {
	storeId: number;
	storeName: string;
	productId: number;
	importedAt: string;
}
