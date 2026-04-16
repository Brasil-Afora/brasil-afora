import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const nationalOpportunities = pgTable("national_opportunities", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  image: text("image").notNull(),
  country: text("country").notNull(),
  type: text("type").notNull(),
  educationLevel: text("education_level").notNull(),
  modality: text("modality").notNull(),
  applicationDeadline: date("application_deadline").notNull(),
  about: text("about").notNull(),
  shortDescription: text("short_description").notNull(),
  duration: text("duration").notNull(),
  cityState: text("city_state").notNull(),
  ageRange: text("age_range").notNull(),
  requirements: text("requirements").notNull(),
  specificRequirements: text("specific_requirements").notNull(),
  responsibleInstitution: text("responsible_institution").notNull(),
  applicationFee: text("application_fee").notNull(),
  benefits: text("benefits").notNull(),
  costs: text("costs").notNull(),
  extraCosts: text("extra_costs").notNull(),
  selectionSteps: text("selection_steps").notNull(),
  officialLink: text("official_link").notNull(),
  contact: text("contact").notNull(),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .$onUpdate(() => new Date())
    .notNull(),
});
