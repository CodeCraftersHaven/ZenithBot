import { eventModule, EventType, Services } from "@sern/handler";

export default eventModule({
  type: EventType.External,
  emitter: "process",
  execute(r) {
    const [l, c] = Services("@sern/logger", "@sern/client");
    l.error(r);
  },
});
