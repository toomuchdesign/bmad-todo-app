export type IsoRfc3339DateTimeString =
  `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: IsoRfc3339DateTimeString;
  updatedAt: IsoRfc3339DateTimeString;
  deletedAt?: IsoRfc3339DateTimeString | null;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  requestId?: string;
};
