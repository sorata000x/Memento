export type Note = {
  id: string;
  content: string;
  role: string;
  last_updated: string;
  embedding: number[];
  file_paths: string[];
};

export type Response = {
  id: string;
  content: string;
  created_at: string;
  embedding: number[];
  knowledge_base: {id: string, similarity: number}[];
};

export type Message = {
  id: string,
  content: string;
  time: string;
  type: string;
  file_paths?: string[];
}