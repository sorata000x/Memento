export type Note = {
  id: string;
  content: string;
  role: string;
  last_updated: string;
  embedding: number[];
};

export type Response = {
  id: string;
  content: string;
  created_at: string;
  embedding: number[];
  knowledge_base_ids: string[];
};

export type Message = {
  id: string,
  content: string;
  time: string;
  type: string;
}