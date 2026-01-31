'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function handleInteraction(
  postId: string, 
  authorId: string, 
  action: 'not_interested' | 'mute' | 'block'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  if (action === 'not_interested') {
    // ATOMIC VECTOR UPDATE
    // Logic: We want to find the tags associated with this post and DECREMENT 
    // the user's interest in those tags.
    
    // 1. Get post tags/category (assuming 'category' column exists)
    const { data: post } = await supabase
        .from('posts')
        .select('category')
        .eq('id', postId)
        .single();
        
    if (post?.category) {
        // 2. RPC Call for Atomic JSON Update
        // We call a Postgres function to safely decrement JSON value
        await supabase.rpc('decrement_interest_vector', {
            user_id: user.id,
            category_key: post.category,
            amount: 2 // Strong penalty
        });
    }
    
    // Also record the "Doow" (Downvote/Dislike)
    await supabase.rpc('increment_doow', { post_id: postId });
  }

  if (action === 'block') {
    await supabase.from('blocks').insert({
        blocker_id: user.id,
        blocked_id: authorId
    });
  }

  if (action === 'mute') {
    // Similar to block, simplified for brevity
     await supabase.from('mutes').insert({
        muter_id: user.id,
        muted_id: authorId
    });
  }

  // No revalidatePath needed immediately if UI is Optimistic
}