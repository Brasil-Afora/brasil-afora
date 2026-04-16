import { defineRelations } from "drizzle-orm";
import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { users } from "@/db/schema/users";

export const favoriteNationalOpportunities = pgTable(
  "favorite_national_opportunities",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    nationalOpportunityId: uuid("national_opportunity_id")
      .notNull()
      .references(() => nationalOpportunities.id),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.nationalOpportunityId] }),
  ]
);

export const favoriteNationalOpportunitiesRelations = defineRelations(
  { users, nationalOpportunities, favoriteNationalOpportunities },
  (relation) => ({
    users: {
      favoriteNationalOpportunities: relation.many.nationalOpportunities({
        from: relation.users.id.through(
          relation.favoriteNationalOpportunities.userId
        ),
        to: relation.nationalOpportunities.id.through(
          relation.favoriteNationalOpportunities.nationalOpportunityId
        ),
      }),
    },
    nationalOpportunities: {
      favoritedBy: relation.many.users(),
    },
  })
);
