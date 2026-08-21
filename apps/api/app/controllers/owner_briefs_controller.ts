import { buildOwnerBrief } from "#services/owner_brief";

export default class OwnerBriefsController {
  async index() {
    return buildOwnerBrief();
  }
}
