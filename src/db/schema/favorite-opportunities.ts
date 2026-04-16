import { defineRelations } from "drizzle-orm";
import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { opportunities } from "@/db/schema/opportunities";
import { users } from "@/db/schema/users";

export const favoriteOpportunities = pgTable(
  "favorite_opportunities",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => opportunities.id),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.opportunityId] })]
);

export const favoriteOpportunitiesRelations = defineRelations(
  { users, opportunities, favoriteOpportunities },
  (relation) => ({
    users: {
      favoriteOpportunities: relation.many.opportunities({
        from: relation.users.id.through(relation.favoriteOpportunities.userId),
        to: relation.opportunities.id.through(
          relation.favoriteOpportunities.opportunityId
        ),
      }),
    },
    opportunities: {
      favoritedBy: relation.many.users(),
    },
  })
);
