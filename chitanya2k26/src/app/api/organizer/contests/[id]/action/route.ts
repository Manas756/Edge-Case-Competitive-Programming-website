import { organizerRoute, body } from "@/lib/api";
import { contestAction, type ContestAction } from "@/lib/services";
export const POST = organizerRoute<{ id: string }>(async (req, { id }) => {
  const { action } = await body<{ action: ContestAction }>(req);
  return { contest: contestAction(id, action) };
});
