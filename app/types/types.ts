export type FlatComment = {
  id: string;
  post_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_avatar: string;
  woow_count: number;
  doow_count: number;
  adil_count: number;
  my_reaction: "woow" | "doow" | "adil" | null;
};