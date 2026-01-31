import { createClient } from '@/utils/supabase/client'; // Or server client depending on context

// Types based on your schema
interface PostCandidate {
  id: string;
  author_id: string;
  created_at: string; // ISO string
  woow_count: number;
  doow_count: number;
  is_following_author: boolean; // Injected during SQL fetch
}

export class BabylexitRecommender {
  /**
   * THE GRAVITY DECAY ALGORITHM
   * Python Equivalent:
   * def calculate_score(row):
   * age = (now - row.created_at).hours
   * g = 0.8 if row.is_following else 1.8
   * return base / (age + 2) ** g
   */
  static calculateScore(post: PostCandidate): number {
    const now = new Date();
    const created = new Date(post.created_at);
    
    // Convert ms to hours
    const ageHours = (now.getTime() - created.getTime()) / (1000 * 60 * 60);

    // 1. Base Score
    // Heavy penalty for negative interaction to maintain "Professional Trust"
    const baseScore = (post.woow_count * 10) - (post.doow_count * 15);

    if (baseScore <= 0) return 0; // Don't recommend hated content

    // 2. Newborn Immunity (The "Cold Start" Fix)
    // If < 2 hours old, time stops.
    const timeFactor = ageHours < 2 ? 0 : ageHours;

    // 3. Dynamic Gravity
    // Existing relationships decay slower (0.8) than random content (1.8)
    const gravity = post.is_following_author ? 0.8 : 1.8;

    // The Formula
    // (+ 2) ensures we never divide by zero or have extremely high initial spikes
    const finalScore = baseScore / Math.pow(timeFactor + 2, gravity);

    return finalScore;
  }

  /**
   * FEED MERGER (The Zipper)
   * Python Equivalent: itertools.zip_longest(personal, global, wildcard)
   * We weight the distribution: 70% Personal, 20% Global, 10% Wildcard
   */
  static mergeFeeds(
    personal: PostCandidate[],
    global: PostCandidate[],
    wildcard: PostCandidate[]
  ): PostCandidate[] {
    const result: PostCandidate[] = [];
    const maxLen = Math.max(personal.length, global.length, wildcard.length);

    // Set pointers
    let pIdx = 0, gIdx = 0, wIdx = 0;

    // We cycle 10 slots: P, P, P, P, P, P, P, G, G, W
    // This is a deterministic approximation of probability
    while (result.length < (personal.length + global.length + wildcard.length)) {
        
      // Try to push 7 Personal
      for (let i = 0; i < 7; i++) {
        if (personal[pIdx]) result.push(personal[pIdx++]);
      }

      // Try to push 2 Global
      for (let i = 0; i < 2; i++) {
        if (global[gIdx]) {
            // Deduplication check (Set lookup is O(1))
            if (!result.find(r => r.id === global[gIdx].id)) {
                result.push(global[gIdx]);
            }
            gIdx++;
        }
      }

      // Try to push 1 Wildcard
      for (let i = 0; i < 1; i++) {
        if (wildcard[wIdx]) {
            if (!result.find(r => r.id === wildcard[wIdx].id)) {
                result.push(wildcard[wIdx]);
            }
            wIdx++;
        }
      }

      // Break safety if all exhausted
      if (!personal[pIdx] && !global[gIdx] && !wildcard[wIdx]) break;
    }

    return result;
  }
}