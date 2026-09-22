export interface Contact {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  actionsCount?: number;
}

export interface ContactInput {
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  note: string | null;
}
