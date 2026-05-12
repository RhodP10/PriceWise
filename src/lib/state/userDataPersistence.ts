import { fetchMonthlySummaries } from '$lib/api/monthlySummariesClient';
import { fetchWorkspace, putWorkspace, type WorkspaceClientPayload } from '$lib/api/workspaceClient';
import { costingSettings, replaceCostingSettings } from '$lib/state/costingSettings.svelte';
import { ingredientCatalog, replaceIngredientCatalogItems } from '$lib/state/ingredientCatalog.svelte';
import { opexStore, replaceOpexLines } from '$lib/state/opexStore.svelte';
import { otherCatalog, replaceOtherCatalogItems } from '$lib/state/otherCatalog.svelte';
import { recipeStore, replaceRecipesFromApi, resetRecipes } from '$lib/state/recipes.svelte';
import {
	replaceMonthlySummariesFromApi,
	resetMonthlySummaryStore
} from '$lib/state/monthlySummaryStore.svelte';
import { resetSummarySales, summarySales } from '$lib/state/summarySales.svelte';

const LEGACY_PREFIX = 'pricewise_u';

function legacyKey(userId: number, scope: string): string {
	return `${LEGACY_PREFIX}${userId}_${scope}`;
}

let workspaceSaveEnabled = false;
let workspacePersistTimer: ReturnType<typeof setTimeout> | null = null;
let workspaceLoadGen = 0;

const WORKSPACE_DEBOUNCE_MS = 1000;

export function setWorkspaceSaveEnabled(v: boolean): void {
	workspaceSaveEnabled = v;
}

export function isWorkspaceSaveEnabled(): boolean {
	return workspaceSaveEnabled;
}

export function serializeWorkspacePayload(): WorkspaceClientPayload {
	return {
		recipes: structuredClone(recipeStore.recipes),
		ingredients: structuredClone(ingredientCatalog.items),
		others: structuredClone(otherCatalog.items),
		opex: structuredClone(opexStore.lines),
		summarySales: { ...summarySales.ordersPerMonthByRecipeId },
		costingSettings: {
			vatRegistered: costingSettings.vatRegistered,
			vatPct: costingSettings.vatPct,
			batchSize: costingSettings.batchSize,
			targetMarginPct: costingSettings.targetMarginPct,
			discountPct: costingSettings.discountPct
		}
	};
}

export function applyEmptyWorkspace(): void {
	replaceRecipesFromApi([]);
	replaceIngredientCatalogItems([]);
	replaceOtherCatalogItems([]);
	replaceOpexLines([]);
	resetSummarySales();
	replaceCostingSettings(null);
}

export function applyWorkspacePayload(data: Partial<WorkspaceClientPayload> | null | undefined): void {
	const d = data ?? {};
	replaceRecipesFromApi(Array.isArray(d.recipes) ? structuredClone(d.recipes) : []);
	replaceIngredientCatalogItems(Array.isArray(d.ingredients) ? structuredClone(d.ingredients) : []);
	replaceOtherCatalogItems(Array.isArray(d.others) ? structuredClone(d.others) : []);
	replaceOpexLines(Array.isArray(d.opex) ? structuredClone(d.opex) : []);
	if (d.summarySales && typeof d.summarySales === 'object') {
		summarySales.ordersPerMonthByRecipeId = structuredClone(d.summarySales);
	} else {
		resetSummarySales();
	}
	replaceCostingSettings(
		d.costingSettings && typeof d.costingSettings === 'object' ? d.costingSettings : null
	);
}

function readLegacyLocalStorage(userId: number): WorkspaceClientPayload | null {
	if (typeof localStorage === 'undefined') return null;
	try {
		const recipes = localStorage.getItem(legacyKey(userId, 'recipes'));
		const ingredients = localStorage.getItem(legacyKey(userId, 'ingredients'));
		const others = localStorage.getItem(legacyKey(userId, 'others'));
		const opex = localStorage.getItem(legacyKey(userId, 'opex'));
		const sales = localStorage.getItem(legacyKey(userId, 'summary_sales'));
		if (!recipes && !ingredients && !others && !opex && !sales) return null;
		return {
			recipes: recipes ? JSON.parse(recipes) : [],
			ingredients: ingredients ? JSON.parse(ingredients) : [],
			others: others ? JSON.parse(others) : [],
			opex: opex ? JSON.parse(opex) : [],
			summarySales: sales ? JSON.parse(sales) : {},
			costingSettings: {
				vatRegistered: costingSettings.vatRegistered,
				vatPct: costingSettings.vatPct,
				batchSize: costingSettings.batchSize,
				targetMarginPct: costingSettings.targetMarginPct,
				discountPct: costingSettings.discountPct
			}
		};
	} catch {
		return null;
	}
}

function clearLegacyLocalStorage(userId: number): void {
	if (typeof localStorage === 'undefined') return;
	for (const scope of ['recipes', 'ingredients', 'others', 'opex', 'summary_sales', 'monthly_summaries']) {
		localStorage.removeItem(legacyKey(userId, scope));
	}
}

function isWorkspacePayloadEmpty(p: WorkspaceClientPayload): boolean {
	return (
		p.recipes.length === 0 &&
		p.ingredients.length === 0 &&
		p.others.length === 0 &&
		p.opex.length === 0 &&
		Object.keys(p.summarySales).length === 0
	);
}

export async function pullWorkspaceFromServer(userId: number, token: string): Promise<void> {
	const server = await fetchWorkspace(token);
	applyWorkspacePayload(server);

	if (isWorkspacePayloadEmpty(server)) {
		const legacy = readLegacyLocalStorage(userId);
		if (legacy && !isWorkspacePayloadEmpty(legacy)) {
			applyWorkspacePayload(legacy);
			await putWorkspace(token, serializeWorkspacePayload());
			clearLegacyLocalStorage(userId);
		}
	}
}

export function cancelWorkspacePersistDebounce(): void {
	if (workspacePersistTimer !== null) {
		clearTimeout(workspacePersistTimer);
		workspacePersistTimer = null;
	}
}

export function scheduleWorkspacePersist(token: string): void {
	if (!workspaceSaveEnabled || !token) return;
	cancelWorkspacePersistDebounce();
	workspacePersistTimer = setTimeout(() => {
		workspacePersistTimer = null;
		void putWorkspace(token, serializeWorkspacePayload()).catch((e) =>
			console.warn('workspace save failed', e)
		);
	}, WORKSPACE_DEBOUNCE_MS);
}

export async function pushWorkspaceNow(token: string): Promise<void> {
	cancelWorkspacePersistDebounce();
	await putWorkspace(token, serializeWorkspacePayload());
}

/** Load workspace + monthly summaries after login; disables saves until finished. */
export async function bootstrapUserWorkspace(userId: number, token: string): Promise<void> {
	const gen = ++workspaceLoadGen;
	setWorkspaceSaveEnabled(false);
	applyEmptyWorkspace();
	resetMonthlySummaryStore();

	try {
		await pullWorkspaceFromServer(userId, token);
	} catch (e) {
		console.warn('workspace load failed', e);
		applyEmptyWorkspace();
	}
	if (gen !== workspaceLoadGen) return;

	try {
		const rows = await fetchMonthlySummaries(token);
		if (gen !== workspaceLoadGen) return;
		replaceMonthlySummariesFromApi(rows);
	} catch {
		if (gen !== workspaceLoadGen) return;
		replaceMonthlySummariesFromApi([]);
	}
	if (gen !== workspaceLoadGen) return;
	setWorkspaceSaveEnabled(true);
}

export function clearInMemoryUserData(): void {
	workspaceLoadGen++;
	cancelWorkspacePersistDebounce();
	setWorkspaceSaveEnabled(false);
	resetRecipes();
	replaceIngredientCatalogItems([]);
	replaceOtherCatalogItems([]);
	replaceOpexLines([]);
	resetSummarySales();
	replaceCostingSettings(null);
	resetMonthlySummaryStore();
}
