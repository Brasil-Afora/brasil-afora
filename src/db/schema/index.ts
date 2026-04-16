import { accounts } from "@/db/schema/accounts";
import {
  favoriteNationalOpportunities,
  favoriteNationalOpportunitiesRelations,
} from "@/db/schema/favorite-national-opportunities";
import {
  favoriteOpportunities,
  favoriteOpportunitiesRelations,
} from "@/db/schema/favorite-opportunities";
import { nationalOpportunities } from "@/db/schema/national-opportunities";
import { opportunities } from "@/db/schema/opportunities";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { verifications } from "@/db/schema/verifications";

export const schema = {
  opportunities,
  accounts,
  sessions,
  users,
  verifications,
  favoriteOpportunities,
  favoriteOpportunitiesRelations,
  favoriteNationalOpportunities,
  favoriteNationalOpportunitiesRelations,
  nationalOpportunities,
};
