export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export type ApiErrorDetail = {
  field?: string;
  min?: number;
  max?: number;
  reason?: string;
};

export type ApiErrorResponse = {
  code: string;
  message: string;
  requestId?: string;
  details?: ApiErrorDetail[];
};
