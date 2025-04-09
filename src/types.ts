export type Note = {
  id: string,
  content: string;
  created_at: string;
  file_paths?: string[];
  role?: string;
  knowledge_base?: {id: string, similarity: number}[];
  hide: boolean;
  is_deleted: boolean;
  last_updated: string;
}