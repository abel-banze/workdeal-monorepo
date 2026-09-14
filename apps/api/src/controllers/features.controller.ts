import { ok } from "../lib/api-response.js";
import { featuresService } from "../services/features.service.js";
import type { AuthUser } from "@workdeal/shared";

export const featuresController = {
  // Catálogo público de flags (sem auth): nome, descrição, grupo e estado
  // global efectivo. Não expõe o kill-switch nem sort order internos.
  async listPublic() {
    const items = await featuresService.listFlags(null);
    const view = items.map(({ flag }) => ({
      key: flag.key,
      name: flag.name,
      description: flag.description,
      group: flag.group,
      defaultEnabled: flag.defaultEnabled,
      enabled: flag.defaultEnabled,
      createdAt: flag.createdAt,
      updatedAt: flag.updatedAt,
    }));
    return { body: ok(view), status: 200 as const };
  },

  // Estado das features do utilizador no âmbito (pessoal ou org) — o portal
  // usa para refletir a UI; a autorização real faz-se sempre no backend.
  async listMine(user: AuthUser, organizationId: string | null) {
    const access = await featuresService.getFeatureAccessList({ userId: user.id, organizationId });
    return { body: ok(access), status: 200 as const };
  },
};