import "@testing-library/jest-dom/vitest";
import fetchMock, { manageFetchMockGlobally } from "@fetch-mock/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

manageFetchMockGlobally();

beforeEach(() => {
  fetchMock.mockGlobal();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
