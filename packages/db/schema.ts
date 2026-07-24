import { 
  pgTable, text, timestamp, uuid, jsonb, doublePrecision, 
  integer, pgEnum, boolean 
} from 'drizzle-orm/pg-core';

// Enums
export const userRoleEnum = pgEnum('user_role', ['surveyor', 'backoffice', 'auditor', 'admin']);
export const assetStatusEnum = pgEnum('asset_status', ['draft', 'surveyed', 'enriched', 'register_ready']);
export const conditionRatingEnum = pgEnum('condition_rating', ['1', '2', '3', '4', '5']);
export const criticalityEnum = pgEnum('criticality_level', ['high', 'medium', 'low']);
export const assetOpStatusEnum = pgEnum('asset_op_status', ['operative', 'maintenance', 'breakdown', 'decommissioned']);

// 1. SPATIAL HIERARCHY
export const properties = pgTable('properties', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  city: text('city').notNull(),
  wave: integer('wave').notNull(),
  legacyName: text('legacy_name'),
  isAnchor: boolean('is_anchor').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const buildings = pgTable('buildings', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const floors = pgTable('floors', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  level: integer('level').notNull(),
  legacyPath: text('legacy_path'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'cascade' }).notNull(),
  floorId: uuid('floor_id').references(() => floors.id, { onDelete: 'cascade' }).notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(), // e.g., "Electrical Room", "Server Room 101"
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. TAXONOMY
export const assetCategories = pgTable('asset_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const assetSubcategories = pgTable('asset_subcategories', {
  id: uuid('id').defaultRandom().primaryKey(),
  categoryId: uuid('category_id').references(() => assetCategories.id, { onDelete: 'cascade' }).notNull(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  // 💡 Explicitly pass the database column name in snake_case:
  curatedMakes: jsonb('curated_makes').$type<string[]>().default([]),
  specSchema: jsonb('spec_schema').$type<any[]>().default([]),

  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 3. USERS & SCOPED ACCESS CONTROL
// Add these fields to the `users` table in packages/db/src/schema.ts
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'), // Nullable initially when using OTP
  oneTimeCode: text('one_time_code'), // Stores the temporary code
  isMustChangePassword: boolean('is_must_change_password').default(true).notNull(),
  role: userRoleEnum('role').default('surveyor').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

export const userScopes = pgTable('user_scopes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  propertyId: uuid('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  buildingId: uuid('building_id').references(() => buildings.id, { onDelete: 'cascade' }),
  floorId: uuid('floor_id').references(() => floors.id, { onDelete: 'cascade' }),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'cascade' }),
  categoryId: uuid('category_id').references(() => assetCategories.id, { onDelete: 'cascade' }),
  canRegister: boolean('can_register').default(true).notNull(),
  canAudit: boolean('can_audit').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 4. CORE ASSET REGISTER
export const assets = pgTable('assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  assetCode: text('asset_code').unique(),
  legacyEquipmentNumber: text('legacy_equipment_number'),
  assetName: text('asset_name').notNull(),
  categoryId: uuid('category_id').references(() => assetCategories.id).notNull(),
  subcategoryId: uuid('subcategory_id').references(() => assetSubcategories.id).notNull(),
  parentAssetId: uuid('parent_asset_id'),
  
  propertyId: uuid('property_id').references(() => properties.id).notNull(),
  buildingId: uuid('building_id').references(() => buildings.id),
  floorId: uuid('floor_id').references(() => floors.id),
  roomId: uuid('room_id').references(() => rooms.id),
  
  gridReference: text('grid_reference'),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  
  make: text('make'),
  modelNumber: text('model_number'),
  serialNumber: text('serial_number'),
  conditionRating: conditionRatingEnum('condition_rating'),
  criticality: criticalityEnum('criticality').default('medium'),
  operationalStatus: assetOpStatusEnum('operational_status').default('operative'),
  
  specifications: jsonb('specifications').default({}).notNull(),
  status: assetStatusEnum('status').default('draft').notNull(),
  completionScore: integer('completion_score').default(0).notNull(),
  
  surveyorId: uuid('surveyor_id').references(() => users.id),
  surveyedAt: timestamp('surveyed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 5. AUDIT LOGS
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  action: text('action').notNull(),
  changes: jsonb('changes').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
