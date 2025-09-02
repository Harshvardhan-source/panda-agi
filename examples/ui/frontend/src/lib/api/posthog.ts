import posthog from "posthog-js";
import { User } from "./auth";

export function identifyUser(user: User) {
  posthog.identify(user.id, {
    email: user.email,
  });
}


export function resetUser() {
  posthog.reset();
}