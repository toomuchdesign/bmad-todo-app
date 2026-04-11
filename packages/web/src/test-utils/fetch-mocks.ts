import type { Todo } from "shared";

const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";

export const TODO_FIXTURES: Todo[] = [
  {
    id: "1",
    title: "Buy milk",
    text: "",
    completed: false,
    userId: TEST_USER_ID,
    createdAt: "2026-03-01T10:00:00.000Z",
    updatedAt: "2026-03-01T10:00:00.000Z",
  },
  {
    id: "2",
    title: "Walk the dog",
    text: "Take the usual route through the park",
    completed: true,
    userId: TEST_USER_ID,
    createdAt: "2026-03-02T12:00:00.000Z",
    updatedAt: "2026-03-02T14:00:00.000Z",
  },
];
