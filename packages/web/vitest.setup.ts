import "@testing-library/jest-dom/vitest";
import { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

manageFetchMockGlobally();

afterEach(() => {
  cleanup();
});
