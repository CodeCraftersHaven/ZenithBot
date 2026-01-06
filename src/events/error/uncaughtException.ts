import { eventModule, EventType, Service } from "@sern/handler";

export default eventModule({
  type: EventType.External,
  emitter: "process",
  execute(r) {
    const l = Service("@sern/logger");
    l.error(r);
  },
});
