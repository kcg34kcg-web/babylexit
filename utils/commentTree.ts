import { FlatComment } from "@/app/types";

export interface CommentNode extends FlatComment {
  children: CommentNode[];
}

export function buildCommentTree(flatComments: FlatComment[]): CommentNode[] {
  const commentMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // 1. Düğümleri Hazırla
  flatComments.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, children: [] });
  });

  // 2. İlişkileri Kur (Ebeveyn -> Çocuk)
  flatComments.forEach((comment) => {
    const node = commentMap.get(comment.id);
    if (!node) return;

    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node); // Yetim yorumlar kök olur
      }
    } else {
      roots.push(node);
    }
  });

  // 3. Sıralama (Recursive)
  const sortNodes = (nodes: CommentNode[]) => {
    nodes.sort((a, b) => {
      // Önce Puan (Woow - Doow)
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Sonra Tarih (Yeniden eskiye)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    nodes.forEach(node => {
      if (node.children.length > 0) {
        sortNodes(node.children);
      }
    });
  };

  sortNodes(roots);
  return roots;
}