/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as calendar from "../calendar.js";
import type * as enhanced_auth from "../enhanced_auth.js";
import type * as gamification from "../gamification.js";
import type * as healthCheck from "../healthCheck.js";
import type * as session_utils from "../session_utils.js";
import type * as tasks from "../tasks.js";
import type * as todos from "../todos.js";
import type * as whisper from "../whisper.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ai: typeof ai;
  auth: typeof auth;
  calendar: typeof calendar;
  enhanced_auth: typeof enhanced_auth;
  gamification: typeof gamification;
  healthCheck: typeof healthCheck;
  session_utils: typeof session_utils;
  tasks: typeof tasks;
  todos: typeof todos;
  whisper: typeof whisper;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
