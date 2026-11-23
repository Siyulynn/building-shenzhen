/**
 * Schema enums for the slice (phase1-slice.md §5, §5.2). Systems iterate over these constant arrays, never over a
 * record's keys: a save sorts keys, and iteration order must not change after a load.
 */
export const POP_KINDS = ['villager', 'urban_resident', 'migrant_factory', 'migrant_construction', 'hk_manager'] as const;
export type PopKind = (typeof POP_KINDS)[number];

export const MIGRANT_KINDS = ['migrant_factory', 'migrant_construction'] as const;
export type MigrantKind = (typeof MIGRANT_KINDS)[number];
export const isMigrant = (k: PopKind): k is MigrantKind => k === 'migrant_factory' || k === 'migrant_construction';

export const REGISTRATION: Record<PopKind, 'local' | 'nonlocal' | 'hmt'> = {
  villager: 'local', urban_resident: 'local', migrant_factory: 'nonlocal', migrant_construction: 'nonlocal', hk_manager: 'hmt',
};

/** Job sectors, in the order labour matching fills them. */
export const SECTORS = ['state', 'farming_fishing', 'factory', 'construction', 'services'] as const;
export type Sector = (typeof SECTORS)[number];

export const ARCHETYPES = ['village_house', 'state_flats', 'village_rental', 'dormitory'] as const;
export type HousingArchetype = (typeof ARCHETYPES)[number];
/** Which bed pool an archetype supplies: local (no rent) or rental (migrants, with rent). */
export const POOL: Record<HousingArchetype, 'local' | 'rental'> = {
  village_house: 'local', state_flats: 'local', village_rental: 'rental', dormitory: 'rental',
};
export const VILLAGE_ARCHETYPES: readonly HousingArchetype[] = ['village_house', 'village_rental'];
/** buildings §2.2 floor use for each housing archetype. */
export const USE_OF: Record<HousingArchetype, 'residential_owner' | 'residential_rental' | 'dormitory'> = {
  village_house: 'residential_owner', state_flats: 'residential_owner', village_rental: 'residential_rental', dormitory: 'dormitory',
};

export const PERMIT_REGIMES = ['loose', 'standard', 'strict'] as const;
export const ENFORCEMENT_LEVELS = ['low', 'medium', 'high'] as const;
export type PermitRegime = (typeof PERMIT_REGIMES)[number];
export type Enforcement = (typeof ENFORCEMENT_LEVELS)[number];

/** Zone uses (phase1-slice.md §5.3): buildings §2.2's plannedUse. */
export const LAND_USES = ['industrial', 'residential', 'commercial', 'public', 'reserve'] as const;
export type LandUse = (typeof LAND_USES)[number];
