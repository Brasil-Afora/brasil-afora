import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { lifecycleState, publicationVersions } from "@/db/schema/ingestion";

export const opportunities = pgTable("opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  country: text("country").notNull(),
  city: text("city").notNull(),
  responsibleInstitution: text("responsible_institution").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  educationLevel: text("education_level").notNull(),
  ageRange: text("age_range").notNull(),
  languageRequirements: text("language_requirements").notNull(),
  specificRequirements: text("specific_requirements").notNull(),
  applicationFee: text("application_fee").notNull(),
  scholarshipType: text("scholarship_type").notNull(),
  scholarshipCoverage: text("scholarship_coverage").notNull(),
  extraCosts: text("extra_costs").notNull(),
  duration: text("duration").notNull(),
  applicationDeadline: date("application_deadline").notNull(),
  selectionSteps: text("selection_steps").notNull(),
  applicationProcess: text("application_process").notNull(),
  officialLink: text("official_link").notNull(),
  officialInformationUrl: text("official_information_url"),
  applicationUrl: text("application_url"),
  publicationVersionId: uuid("publication_version_id").references(
    () => publicationVersions.id
  ),
  lifecycleStatus: lifecycleState("lifecycle_status"),
  lastVerifiedAt: timestamp("last_verified_at", {
    withTimezone: true,
    mode: "date",
  }),
  contact: text("contact").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});
