import { placesService } from "../services/places.service";
import { ok } from "../lib/api-response";

class PlacesController {
  async autocomplete(input: string) {
    const suggestions = await placesService.autocomplete(input);
    return { body: ok(suggestions), status: 200 as const };
  }

  async details(placeId: string) {
    const place = await placesService.details(placeId);
    return { body: ok(place), status: 200 as const };
  }
}

export const placesController = new PlacesController();
