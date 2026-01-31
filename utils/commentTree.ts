// 👇 DÜZELTME BURADA: Dosyanız 'app/types/types.ts' içindeyse doğru yol budur:
import { FlatComment } from "@/app/types";
// HATA ALIRSANIZ ALTERNATİF: Eğer üstteki çalışmazsa, proje yapınıza göre şunları deneyin:
// import { FlatComment } from "@/types/types"; 
// import { FlatComment } from "../../types/types";

export interface CommentNode extends FlatComment {
  children: CommentNode[];
  depth: number;
  isMaxDepth: boolean;
  score: number;
  created_at: string; // TypeScript garantisi için eklendi
}

/**
 * Transforms a flat list of comments into a threaded tree.
 * - O(n) complexity using a Map.
 * - Handles Sorting (Score > Date).
 * - Handles Max Depth Logic.
 */
export function buildCommentTree(
  flatComments: FlatComment[], 
  maxDepth: number = 30
): CommentNode[] {
  const commentMap = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  // 1. Initialize Nodes
  flatComments.forEach((comment) => {
    // Burada hem FlatComment özelliklerini hem de yeni özellikleri tek nesnede birleştiriyoruz
    const node: CommentNode = {
      ...comment,
      children: [],
      depth: 0, 
      isMaxDepth: false,
      score: (comment.woow_count || 0) - (comment.doow_count || 0),
      // created_at, spread operatörü (...) ile zaten comment'ten geliyor,
      // ama emin olmak için aşağıya tekrar yazabiliriz:
      created_at: comment.created_at 
    };
    
    commentMap.set(comment.id, node);
  });

  // 2. Build Hierarchy
  flatComments.forEach((comment) => {
    const node = commentMap.get(comment.id);
    if (!node) return;

    if (comment.parent_id && commentMap.has(comment.parent_id)) {
      const parent = commentMap.get(comment.parent_id)!;
      parent.children.push(node);
    } else {
      // If no parent_id (or parent missing), it's a root
      roots.push(node);
    }
  });

  // 3. Recursive Sort & Depth Assignment
  const processNode = (node: CommentNode, currentDepth: number) => {
    node.depth = currentDepth;
    node.isMaxDepth = currentDepth >= maxDepth;

    // Sort Children: Score DESC, then Date DESC (Newest)
    node.children.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score; // Higher score first
      }
      
      // HATA ALINAN KISIM ARTIK GÜVENLİ
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      
      return timeB - timeA;
    });

    // Recurse
    node.children.forEach(child => processNode(child, currentDepth + 1));
  };

  // Sort Roots first
  roots.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    
    return timeB - timeA;
  });

  // Process entire tree
  roots.forEach(root => processNode(root, 0));

  return roots;
}