drop extension if exists "pg_net";


  create table "public"."answer_votes" (
    "user_id" uuid not null,
    "answer_id" uuid not null,
    "vote_type" integer
      );


alter table "public"."answer_votes" enable row level security;


  create table "public"."answers" (
    "id" uuid not null default gen_random_uuid(),
    "question_id" uuid not null,
    "user_id" uuid not null,
    "content" text not null,
    "ai_score" integer,
    "ai_feedback" text,
    "is_verified" boolean default false,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "ai_critique" text,
    "upvotes" integer default 0,
    "downvotes" integer default 0,
    "is_ai_generated" boolean default false
      );


alter table "public"."answers" enable row level security;


  create table "public"."blocks" (
    "blocker_id" uuid not null,
    "blocked_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."comment_reactions" (
    "id" uuid not null default gen_random_uuid(),
    "comment_id" uuid not null,
    "user_id" uuid not null,
    "reaction_type" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."comment_reactions" enable row level security;


  create table "public"."comments" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "post_id" uuid not null,
    "user_id" uuid not null,
    "content" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "parent_id" uuid
      );


alter table "public"."comments" enable row level security;


  create table "public"."follows" (
    "follower_id" uuid not null,
    "following_id" uuid not null,
    "status" text default 'accepted'::text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."follows" enable row level security;


  create table "public"."mutes" (
    "muter_id" uuid not null,
    "muted_id" uuid not null,
    "created_at" timestamp with time zone default now()
      );



  create table "public"."post_likes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "post_id" uuid not null,
    "type" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."post_likes" enable row level security;


  create table "public"."post_reactions" (
    "id" uuid not null default gen_random_uuid(),
    "post_id" uuid not null,
    "user_id" uuid not null,
    "reaction_type" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."post_reactions" enable row level security;


  create table "public"."posts" (
    "id" uuid not null default extensions.uuid_generate_v4(),
    "user_id" uuid not null,
    "content" text not null,
    "image_url" text,
    "category" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "tags" jsonb default '[]'::jsonb,
    "cached_rank_score" numeric(10,4) default 0,
    "cached_velocity" numeric(10,4) default 0,
    "woow_count" integer default 0,
    "doow_count" integer default 0,
    "adil_count" integer default 0
      );


alter table "public"."posts" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "avatar_url" text,
    "reputation" integer default 0,
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "credits" integer default 3,
    "phone" text,
    "address" text,
    "university" text,
    "is_private" boolean default false,
    "followers_count" integer default 0,
    "trust_score" numeric(5,2) default 50.0,
    "interest_vector" jsonb default '{}'::jsonb,
    "last_fame_at" timestamp with time zone default '2000-01-01 00:00:00+00'::timestamp with time zone,
    "username" text
      );


alter table "public"."profiles" enable row level security;


  create table "public"."publications" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "title" text not null,
    "description" text,
    "type" text not null,
    "file_url" text not null,
    "uploader_id" uuid not null
      );


alter table "public"."publications" enable row level security;


  create table "public"."questions" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "content" text not null,
    "user_id" uuid not null,
    "status" text default 'open'::text,
    "created_at" timestamp with time zone default timezone('utc'::text, now()),
    "ai_response" jsonb,
    "ai_status" text default 'pending'::text,
    "asked_to_ai" boolean default false
      );


alter table "public"."questions" enable row level security;


  create table "public"."reactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "post_id" uuid,
    "comment_id" uuid,
    "reaction_type" text not null
      );


alter table "public"."reactions" enable row level security;


  create table "public"."votes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "answer_id" uuid not null,
    "vote_type" integer not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."votes" enable row level security;

CREATE UNIQUE INDEX answer_votes_pkey ON public.answer_votes USING btree (user_id, answer_id);

CREATE UNIQUE INDEX answers_pkey ON public.answers USING btree (id);

CREATE UNIQUE INDEX blocks_pkey ON public.blocks USING btree (blocker_id, blocked_id);

CREATE UNIQUE INDEX comment_reactions_pkey ON public.comment_reactions USING btree (id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX follows_pkey ON public.follows USING btree (follower_id, following_id);

CREATE INDEX idx_comment_reactions_comment_id ON public.comment_reactions USING btree (comment_id);

CREATE INDEX idx_comments_parent_id ON public.comments USING btree (parent_id);

CREATE INDEX idx_comments_post_id ON public.comments USING btree (post_id);

CREATE INDEX idx_profiles_fame ON public.profiles USING btree (last_fame_at);

CREATE INDEX idx_profiles_interests ON public.profiles USING gin (interest_vector);

CREATE UNIQUE INDEX mutes_pkey ON public.mutes USING btree (muter_id, muted_id);

CREATE UNIQUE INDEX post_likes_pkey ON public.post_likes USING btree (id);

CREATE UNIQUE INDEX post_reactions_pkey ON public.post_reactions USING btree (id);

CREATE UNIQUE INDEX post_reactions_post_id_user_id_key ON public.post_reactions USING btree (post_id, user_id);

CREATE UNIQUE INDEX posts_pkey ON public.posts USING btree (id);

CREATE UNIQUE INDEX profiles_phone_key ON public.profiles USING btree (phone);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_username_key ON public.profiles USING btree (username);

CREATE UNIQUE INDEX publications_pkey ON public.publications USING btree (id);

CREATE UNIQUE INDEX questions_pkey ON public.questions USING btree (id);

CREATE UNIQUE INDEX reactions_pkey ON public.reactions USING btree (id);

CREATE UNIQUE INDEX reactions_user_id_comment_id_key ON public.reactions USING btree (user_id, comment_id);

CREATE UNIQUE INDEX reactions_user_id_post_id_key ON public.reactions USING btree (user_id, post_id);

CREATE UNIQUE INDEX unique_user_comment_reaction ON public.comment_reactions USING btree (comment_id, user_id);

CREATE UNIQUE INDEX unique_user_post_reaction ON public.post_likes USING btree (user_id, post_id);

CREATE UNIQUE INDEX votes_pkey ON public.votes USING btree (id);

CREATE UNIQUE INDEX votes_user_id_answer_id_key ON public.votes USING btree (user_id, answer_id);

alter table "public"."answer_votes" add constraint "answer_votes_pkey" PRIMARY KEY using index "answer_votes_pkey";

alter table "public"."answers" add constraint "answers_pkey" PRIMARY KEY using index "answers_pkey";

alter table "public"."blocks" add constraint "blocks_pkey" PRIMARY KEY using index "blocks_pkey";

alter table "public"."comment_reactions" add constraint "comment_reactions_pkey" PRIMARY KEY using index "comment_reactions_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."follows" add constraint "follows_pkey" PRIMARY KEY using index "follows_pkey";

alter table "public"."mutes" add constraint "mutes_pkey" PRIMARY KEY using index "mutes_pkey";

alter table "public"."post_likes" add constraint "post_likes_pkey" PRIMARY KEY using index "post_likes_pkey";

alter table "public"."post_reactions" add constraint "post_reactions_pkey" PRIMARY KEY using index "post_reactions_pkey";

alter table "public"."posts" add constraint "posts_pkey" PRIMARY KEY using index "posts_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."publications" add constraint "publications_pkey" PRIMARY KEY using index "publications_pkey";

alter table "public"."questions" add constraint "questions_pkey" PRIMARY KEY using index "questions_pkey";

alter table "public"."reactions" add constraint "reactions_pkey" PRIMARY KEY using index "reactions_pkey";

alter table "public"."votes" add constraint "votes_pkey" PRIMARY KEY using index "votes_pkey";

alter table "public"."answer_votes" add constraint "answer_votes_answer_id_fkey" FOREIGN KEY (answer_id) REFERENCES public.answers(id) ON DELETE CASCADE not valid;

alter table "public"."answer_votes" validate constraint "answer_votes_answer_id_fkey";

alter table "public"."answer_votes" add constraint "answer_votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."answer_votes" validate constraint "answer_votes_user_id_fkey";

alter table "public"."answer_votes" add constraint "answer_votes_vote_type_check" CHECK ((vote_type = ANY (ARRAY[1, '-1'::integer]))) not valid;

alter table "public"."answer_votes" validate constraint "answer_votes_vote_type_check";

alter table "public"."answers" add constraint "answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE not valid;

alter table "public"."answers" validate constraint "answers_question_id_fkey";

alter table "public"."answers" add constraint "answers_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."answers" validate constraint "answers_user_id_fkey";

alter table "public"."blocks" add constraint "blocks_blocked_id_fkey" FOREIGN KEY (blocked_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."blocks" validate constraint "blocks_blocked_id_fkey";

alter table "public"."blocks" add constraint "blocks_blocker_id_fkey" FOREIGN KEY (blocker_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."blocks" validate constraint "blocks_blocker_id_fkey";

alter table "public"."comment_reactions" add constraint "comment_reactions_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE CASCADE not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_comment_id_fkey";

alter table "public"."comment_reactions" add constraint "comment_reactions_reaction_type_check" CHECK ((reaction_type = ANY (ARRAY['woow'::text, 'doow'::text, 'adil'::text]))) not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_reaction_type_check";

alter table "public"."comment_reactions" add constraint "comment_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."comment_reactions" validate constraint "comment_reactions_user_id_fkey";

alter table "public"."comment_reactions" add constraint "unique_user_comment_reaction" UNIQUE using index "unique_user_comment_reaction";

alter table "public"."comments" add constraint "comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.comments(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_parent_id_fkey";

alter table "public"."comments" add constraint "comments_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_post_id_fkey";

alter table "public"."comments" add constraint "comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."comments" validate constraint "comments_user_id_fkey";

alter table "public"."follows" add constraint "follows_follower_id_fkey" FOREIGN KEY (follower_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."follows" validate constraint "follows_follower_id_fkey";

alter table "public"."follows" add constraint "follows_following_id_fkey" FOREIGN KEY (following_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."follows" validate constraint "follows_following_id_fkey";

alter table "public"."follows" add constraint "follows_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text]))) not valid;

alter table "public"."follows" validate constraint "follows_status_check";

alter table "public"."mutes" add constraint "mutes_muted_id_fkey" FOREIGN KEY (muted_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."mutes" validate constraint "mutes_muted_id_fkey";

alter table "public"."mutes" add constraint "mutes_muter_id_fkey" FOREIGN KEY (muter_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."mutes" validate constraint "mutes_muter_id_fkey";

alter table "public"."post_likes" add constraint "post_likes_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."post_likes" validate constraint "post_likes_post_id_fkey";

alter table "public"."post_likes" add constraint "post_likes_type_check" CHECK ((type = ANY (ARRAY['woow'::text, 'doow'::text, 'adil'::text]))) not valid;

alter table "public"."post_likes" validate constraint "post_likes_type_check";

alter table "public"."post_likes" add constraint "post_likes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."post_likes" validate constraint "post_likes_user_id_fkey";

alter table "public"."post_likes" add constraint "unique_user_post_reaction" UNIQUE using index "unique_user_post_reaction";

alter table "public"."post_reactions" add constraint "post_reactions_post_id_fkey" FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE not valid;

alter table "public"."post_reactions" validate constraint "post_reactions_post_id_fkey";

alter table "public"."post_reactions" add constraint "post_reactions_post_id_user_id_key" UNIQUE using index "post_reactions_post_id_user_id_key";

alter table "public"."post_reactions" add constraint "post_reactions_reaction_type_check" CHECK ((reaction_type = ANY (ARRAY['woow'::text, 'doow'::text, 'adil'::text]))) not valid;

alter table "public"."post_reactions" validate constraint "post_reactions_reaction_type_check";

alter table "public"."post_reactions" add constraint "post_reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."post_reactions" validate constraint "post_reactions_user_id_fkey";

alter table "public"."posts" add constraint "posts_category_check" CHECK ((category = ANY (ARRAY['karar_inceleme'::text, 'mevzuat_haber'::text, 'staj_gunlugu'::text, 'teori'::text]))) not valid;

alter table "public"."posts" validate constraint "posts_category_check";

alter table "public"."posts" add constraint "posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."posts" validate constraint "posts_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."profiles" add constraint "profiles_phone_key" UNIQUE using index "profiles_phone_key";

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE using index "profiles_username_key";

alter table "public"."publications" add constraint "publications_type_check" CHECK ((type = ANY (ARRAY['article'::text, 'video'::text]))) not valid;

alter table "public"."publications" validate constraint "publications_type_check";

alter table "public"."publications" add constraint "publications_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES auth.users(id) not valid;

alter table "public"."publications" validate constraint "publications_uploader_id_fkey";

alter table "public"."questions" add constraint "questions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."questions" validate constraint "questions_user_id_fkey";

alter table "public"."reactions" add constraint "reactions_user_id_comment_id_key" UNIQUE using index "reactions_user_id_comment_id_key";

alter table "public"."reactions" add constraint "reactions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."reactions" validate constraint "reactions_user_id_fkey";

alter table "public"."reactions" add constraint "reactions_user_id_post_id_key" UNIQUE using index "reactions_user_id_post_id_key";

alter table "public"."votes" add constraint "votes_answer_id_fkey" FOREIGN KEY (answer_id) REFERENCES public.answers(id) ON DELETE CASCADE not valid;

alter table "public"."votes" validate constraint "votes_answer_id_fkey";

alter table "public"."votes" add constraint "votes_user_id_answer_id_key" UNIQUE using index "votes_user_id_answer_id_key";

alter table "public"."votes" add constraint "votes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."votes" validate constraint "votes_user_id_fkey";

alter table "public"."votes" add constraint "votes_vote_type_check" CHECK ((vote_type = ANY (ARRAY['-1'::integer, 1]))) not valid;

alter table "public"."votes" validate constraint "votes_vote_type_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.ask_question_transaction(p_title text, p_content text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_credits INT;
  v_question_id UUID;
  v_user_id UUID;
BEGIN
  -- Mevcut kullanıcıyı al
  v_user_id := auth.uid();
  
  -- Krediyi kontrol et
  SELECT credits INTO v_user_credits FROM public.profiles WHERE id = v_user_id;
  
  IF v_user_credits < 1 OR v_user_credits IS NULL THEN
    RAISE EXCEPTION 'Yetersiz Kredi! Soru sormak için kredi yüklemelisiniz.';
  END IF;

  -- 1. Krediyi düş
  UPDATE public.profiles SET credits = credits - 1 WHERE id = v_user_id;
  
  -- 2. Soruyu ekle (Status default olarak 'open' olur)
  INSERT INTO public.questions (title, content, user_id, status)
  VALUES (p_title, p_content, v_user_id, 'open')
  RETURNING id INTO v_question_id;

  -- Başarılı dönüş yap
  RETURN json_build_object('success', true, 'question_id', v_question_id, 'remaining_credits', v_user_credits - 1);
END;
$function$
;

create or replace view "public"."comments_with_stats" as  SELECT c.id,
    c.post_id,
    c.parent_id,
    c.content,
    c.created_at,
    c.user_id,
    COALESCE(pr.full_name, 'Anonim'::text) AS author_name,
    COALESCE(pr.avatar_url, ''::text) AS author_avatar,
    ( SELECT count(*) AS count
           FROM public.comment_reactions
          WHERE ((comment_reactions.comment_id = c.id) AND (comment_reactions.reaction_type = 'woow'::text))) AS woow_count,
    ( SELECT count(*) AS count
           FROM public.comment_reactions
          WHERE ((comment_reactions.comment_id = c.id) AND (comment_reactions.reaction_type = 'doow'::text))) AS doow_count,
    ( SELECT count(*) AS count
           FROM public.comment_reactions
          WHERE ((comment_reactions.comment_id = c.id) AND (comment_reactions.reaction_type = 'adil'::text))) AS adil_count,
    ( SELECT count(*) AS count
           FROM public.comments
          WHERE (comments.parent_id = c.id)) AS reply_count,
    ( SELECT comment_reactions.reaction_type
           FROM public.comment_reactions
          WHERE ((comment_reactions.comment_id = c.id) AND (comment_reactions.user_id = auth.uid()))) AS my_reaction,
    (( SELECT count(*) AS count
           FROM public.comment_reactions
          WHERE ((comment_reactions.comment_id = c.id) AND (comment_reactions.reaction_type = 'woow'::text))) - ( SELECT count(*) AS count
           FROM public.comment_reactions
          WHERE ((comment_reactions.comment_id = c.id) AND (comment_reactions.reaction_type = 'doow'::text)))) AS score
   FROM (public.comments c
     LEFT JOIN public.profiles pr ON ((c.user_id = pr.id)));


CREATE OR REPLACE FUNCTION public.decrement_interest_vector(user_id uuid, category_key text, amount integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE profiles
  SET interest_vector = jsonb_set(
    COALESCE(interest_vector, '{}'::jsonb),
    ARRAY[category_key],
    (COALESCE((interest_vector ->> category_key)::int, 0) - amount)::text::jsonb
  )
  WHERE id = user_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fetch_feed_candidates(viewer_id uuid)
 RETURNS TABLE(id uuid, content text, woow_count bigint, doow_count bigint, adil_count bigint, my_reaction text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.content,
    -- ...
    -- Sayımları alt sorgu veya count tablosundan alıyorsanız buraya ekleyin
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type = 'woow') as woow_count,
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type = 'doow') as doow_count,
    (SELECT COUNT(*) FROM reactions r WHERE r.post_id = p.id AND r.reaction_type = 'adil') as adil_count,
    
    -- KRİTİK KISIM: Kullanıcının kendi reaksiyonunu çekmek
    (SELECT r.reaction_type 
     FROM reactions r 
     WHERE r.post_id = p.id AND r.user_id = viewer_id) as my_reaction

  FROM posts p
  WHERE p.status = 'published'; -- Örnek filtre
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_vote_counts(answer_id_input uuid)
 RETURNS TABLE(up_votes bigint, down_votes bigint, net_score bigint)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE vote_type = 1) as up_votes,
    COUNT(*) FILTER (WHERE vote_type = -1) as down_votes,
    COALESCE(SUM(vote_type), 0) as net_score
  FROM votes
  WHERE answer_id = answer_id_input;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, reputation)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Adsız Hukukçu'),
    new.raw_user_meta_data->>'avatar_url',
    0
  );
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_reaction(p_target_id uuid, p_target_type text, p_reaction_type text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_user_id UUID := auth.uid();
  v_current_reaction TEXT;
  v_target_table TEXT;
  v_id_column TEXT;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Giriş yapılmamış!'; END IF;

  -- Hedef tablo ve kolon ismini belirle
  IF p_target_type = 'post' THEN 
    v_target_table := 'posts'; v_id_column := 'post_id';
  ELSE 
    v_target_table := 'comments'; v_id_column := 'comment_id';
  END IF;

  -- 1. Mevcut reaksiyonu kontrol et
  EXECUTE format('SELECT reaction_type FROM reactions WHERE user_id = $1 AND %I = $2', v_id_column)
  INTO v_current_reaction USING v_user_id, p_target_id;

  -- 2. İşlem (Silme veya Ekleme)
  IF p_reaction_type IS NULL OR v_current_reaction = p_reaction_type THEN
    EXECUTE format('DELETE FROM reactions WHERE user_id = $1 AND %I = $2', v_id_column)
    USING v_user_id, p_target_id;
  ELSE
    EXECUTE format('
      INSERT INTO reactions (user_id, %I, reaction_type) VALUES ($1, $2, $3)
      ON CONFLICT (user_id, %I) DO UPDATE SET reaction_type = EXCLUDED.reaction_type', v_id_column, v_id_column)
    USING v_user_id, p_target_id, p_reaction_type;
  END IF;

  -- 3. SAYILARI ANLIK GÜNCELLE (Burası kritik, trigger beklemiyoruz)
  IF p_target_type = 'post' THEN
    UPDATE posts SET 
      woow_count = (SELECT count(*) FROM reactions WHERE post_id = p_target_id AND reaction_type = 'woow'),
      doow_count = (SELECT count(*) FROM reactions WHERE post_id = p_target_id AND reaction_type = 'doow'),
      adil_count = (SELECT count(*) FROM reactions WHERE post_id = p_target_id AND reaction_type = 'adil')
    WHERE id = p_target_id;
  ELSIF p_target_type = 'comment' THEN
    UPDATE comments SET 
      woow_count = (SELECT count(*) FROM reactions WHERE comment_id = p_target_id AND reaction_type = 'woow'),
      doow_count = (SELECT count(*) FROM reactions WHERE comment_id = p_target_id AND reaction_type = 'doow'),
      adil_count = (SELECT count(*) FROM reactions WHERE comment_id = p_target_id AND reaction_type = 'adil')
    WHERE id = p_target_id;
  END IF;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_doow(post_id uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE posts
  SET doow_count = COALESCE(doow_count, 0) + 1
  WHERE id = post_id;
END;
$function$
;

create or replace view "public"."posts_with_stats" as  SELECT p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.created_at,
    pr.is_private,
    pr.full_name AS author_name,
    pr.username AS author_username,
    pr.avatar_url AS author_avatar,
    COALESCE(r.woow_count, (0)::bigint) AS woow_count,
    COALESCE(r.doow_count, (0)::bigint) AS doow_count,
    COALESCE(r.adil_count, (0)::bigint) AS adil_count,
    ( SELECT count(*) AS count
           FROM public.comments c
          WHERE (c.post_id = p.id)) AS comment_count,
    ( SELECT reactions.reaction_type
           FROM public.reactions
          WHERE ((reactions.post_id = p.id) AND (reactions.user_id = auth.uid()))) AS my_reaction
   FROM ((public.posts p
     JOIN public.profiles pr ON ((p.user_id = pr.id)))
     LEFT JOIN ( SELECT reactions.post_id,
            count(*) FILTER (WHERE (reactions.reaction_type = 'woow'::text)) AS woow_count,
            count(*) FILTER (WHERE (reactions.reaction_type = 'doow'::text)) AS doow_count,
            count(*) FILTER (WHERE (reactions.reaction_type = 'adil'::text)) AS adil_count
           FROM public.reactions
          GROUP BY reactions.post_id) r ON ((p.id = r.post_id)));


CREATE OR REPLACE FUNCTION public.update_peer_score_avg()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE answers
    SET peer_score_avg = (SELECT AVG(value) FROM votes WHERE answer_id = NEW.answer_id)
    WHERE id = NEW.answer_id;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_reaction_counts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE') THEN
        -- Eğer POST reaksiyonuysa
        IF (COALESCE(NEW.post_id, OLD.post_id) IS NOT NULL) THEN
            UPDATE posts SET 
                woow_count = (SELECT count(*) FROM reactions WHERE post_id = COALESCE(NEW.post_id, OLD.post_id) AND reaction_type = 'woow'),
                doow_count = (SELECT count(*) FROM reactions WHERE post_id = COALESCE(NEW.post_id, OLD.post_id) AND reaction_type = 'doow'),
                adil_count = (SELECT count(*) FROM reactions WHERE post_id = COALESCE(NEW.post_id, OLD.post_id) AND reaction_type = 'adil')
            WHERE id = COALESCE(NEW.post_id, OLD.post_id);
        END IF;

        -- Eğer COMMENT reaksiyonuysa
        IF (COALESCE(NEW.comment_id, OLD.comment_id) IS NOT NULL) THEN
            UPDATE comments SET 
                woow_count = (SELECT count(*) FROM reactions WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id) AND reaction_type = 'woow'),
                doow_count = (SELECT count(*) FROM reactions WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id) AND reaction_type = 'doow'),
                adil_count = (SELECT count(*) FROM reactions WHERE comment_id = COALESCE(NEW.comment_id, OLD.comment_id) AND reaction_type = 'adil')
            WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
        END IF;
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_reputation_score_on_vote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    UPDATE profiles
    SET reputation_score = reputation_score + NEW.value
    WHERE id = (SELECT user_id FROM answers WHERE id = NEW.answer_id);
    RETURN NEW;
END;
$function$
;

create or replace view "public"."v_feed_candidates" as  SELECT p.id,
    p.user_id AS author_id,
    p.content,
    p.image_url,
    p.created_at,
    p.woow_count,
    p.doow_count,
    p.category,
    COALESCE(pr.full_name, 'Gizli Üye'::text) AS author_username,
    pr.avatar_url AS author_avatar,
    pr.interest_vector AS author_interests
   FROM (public.posts p
     JOIN public.profiles pr ON ((p.user_id = pr.id)));


CREATE OR REPLACE FUNCTION public.vote_answer(p_answer_id uuid, p_user_id uuid, p_vote_type integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert or Update (Upsert) the vote
  INSERT INTO votes (user_id, answer_id, vote_type)
  VALUES (p_user_id, p_answer_id, p_vote_type)
  ON CONFLICT (user_id, answer_id)
  DO UPDATE SET vote_type = EXCLUDED.vote_type;
END;
$function$
;

grant delete on table "public"."answer_votes" to "anon";

grant insert on table "public"."answer_votes" to "anon";

grant references on table "public"."answer_votes" to "anon";

grant select on table "public"."answer_votes" to "anon";

grant trigger on table "public"."answer_votes" to "anon";

grant truncate on table "public"."answer_votes" to "anon";

grant update on table "public"."answer_votes" to "anon";

grant delete on table "public"."answer_votes" to "authenticated";

grant insert on table "public"."answer_votes" to "authenticated";

grant references on table "public"."answer_votes" to "authenticated";

grant select on table "public"."answer_votes" to "authenticated";

grant trigger on table "public"."answer_votes" to "authenticated";

grant truncate on table "public"."answer_votes" to "authenticated";

grant update on table "public"."answer_votes" to "authenticated";

grant delete on table "public"."answer_votes" to "service_role";

grant insert on table "public"."answer_votes" to "service_role";

grant references on table "public"."answer_votes" to "service_role";

grant select on table "public"."answer_votes" to "service_role";

grant trigger on table "public"."answer_votes" to "service_role";

grant truncate on table "public"."answer_votes" to "service_role";

grant update on table "public"."answer_votes" to "service_role";

grant delete on table "public"."answers" to "anon";

grant insert on table "public"."answers" to "anon";

grant references on table "public"."answers" to "anon";

grant select on table "public"."answers" to "anon";

grant trigger on table "public"."answers" to "anon";

grant truncate on table "public"."answers" to "anon";

grant update on table "public"."answers" to "anon";

grant delete on table "public"."answers" to "authenticated";

grant insert on table "public"."answers" to "authenticated";

grant references on table "public"."answers" to "authenticated";

grant select on table "public"."answers" to "authenticated";

grant trigger on table "public"."answers" to "authenticated";

grant truncate on table "public"."answers" to "authenticated";

grant update on table "public"."answers" to "authenticated";

grant delete on table "public"."answers" to "service_role";

grant insert on table "public"."answers" to "service_role";

grant references on table "public"."answers" to "service_role";

grant select on table "public"."answers" to "service_role";

grant trigger on table "public"."answers" to "service_role";

grant truncate on table "public"."answers" to "service_role";

grant update on table "public"."answers" to "service_role";

grant delete on table "public"."blocks" to "anon";

grant insert on table "public"."blocks" to "anon";

grant references on table "public"."blocks" to "anon";

grant select on table "public"."blocks" to "anon";

grant trigger on table "public"."blocks" to "anon";

grant truncate on table "public"."blocks" to "anon";

grant update on table "public"."blocks" to "anon";

grant delete on table "public"."blocks" to "authenticated";

grant insert on table "public"."blocks" to "authenticated";

grant references on table "public"."blocks" to "authenticated";

grant select on table "public"."blocks" to "authenticated";

grant trigger on table "public"."blocks" to "authenticated";

grant truncate on table "public"."blocks" to "authenticated";

grant update on table "public"."blocks" to "authenticated";

grant delete on table "public"."blocks" to "service_role";

grant insert on table "public"."blocks" to "service_role";

grant references on table "public"."blocks" to "service_role";

grant select on table "public"."blocks" to "service_role";

grant trigger on table "public"."blocks" to "service_role";

grant truncate on table "public"."blocks" to "service_role";

grant update on table "public"."blocks" to "service_role";

grant delete on table "public"."comment_reactions" to "anon";

grant insert on table "public"."comment_reactions" to "anon";

grant references on table "public"."comment_reactions" to "anon";

grant select on table "public"."comment_reactions" to "anon";

grant trigger on table "public"."comment_reactions" to "anon";

grant truncate on table "public"."comment_reactions" to "anon";

grant update on table "public"."comment_reactions" to "anon";

grant delete on table "public"."comment_reactions" to "authenticated";

grant insert on table "public"."comment_reactions" to "authenticated";

grant references on table "public"."comment_reactions" to "authenticated";

grant select on table "public"."comment_reactions" to "authenticated";

grant trigger on table "public"."comment_reactions" to "authenticated";

grant truncate on table "public"."comment_reactions" to "authenticated";

grant update on table "public"."comment_reactions" to "authenticated";

grant delete on table "public"."comment_reactions" to "service_role";

grant insert on table "public"."comment_reactions" to "service_role";

grant references on table "public"."comment_reactions" to "service_role";

grant select on table "public"."comment_reactions" to "service_role";

grant trigger on table "public"."comment_reactions" to "service_role";

grant truncate on table "public"."comment_reactions" to "service_role";

grant update on table "public"."comment_reactions" to "service_role";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant delete on table "public"."comments" to "authenticated";

grant insert on table "public"."comments" to "authenticated";

grant references on table "public"."comments" to "authenticated";

grant select on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant update on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."follows" to "anon";

grant insert on table "public"."follows" to "anon";

grant references on table "public"."follows" to "anon";

grant select on table "public"."follows" to "anon";

grant trigger on table "public"."follows" to "anon";

grant truncate on table "public"."follows" to "anon";

grant update on table "public"."follows" to "anon";

grant delete on table "public"."follows" to "authenticated";

grant insert on table "public"."follows" to "authenticated";

grant references on table "public"."follows" to "authenticated";

grant select on table "public"."follows" to "authenticated";

grant trigger on table "public"."follows" to "authenticated";

grant truncate on table "public"."follows" to "authenticated";

grant update on table "public"."follows" to "authenticated";

grant delete on table "public"."follows" to "service_role";

grant insert on table "public"."follows" to "service_role";

grant references on table "public"."follows" to "service_role";

grant select on table "public"."follows" to "service_role";

grant trigger on table "public"."follows" to "service_role";

grant truncate on table "public"."follows" to "service_role";

grant update on table "public"."follows" to "service_role";

grant delete on table "public"."mutes" to "anon";

grant insert on table "public"."mutes" to "anon";

grant references on table "public"."mutes" to "anon";

grant select on table "public"."mutes" to "anon";

grant trigger on table "public"."mutes" to "anon";

grant truncate on table "public"."mutes" to "anon";

grant update on table "public"."mutes" to "anon";

grant delete on table "public"."mutes" to "authenticated";

grant insert on table "public"."mutes" to "authenticated";

grant references on table "public"."mutes" to "authenticated";

grant select on table "public"."mutes" to "authenticated";

grant trigger on table "public"."mutes" to "authenticated";

grant truncate on table "public"."mutes" to "authenticated";

grant update on table "public"."mutes" to "authenticated";

grant delete on table "public"."mutes" to "service_role";

grant insert on table "public"."mutes" to "service_role";

grant references on table "public"."mutes" to "service_role";

grant select on table "public"."mutes" to "service_role";

grant trigger on table "public"."mutes" to "service_role";

grant truncate on table "public"."mutes" to "service_role";

grant update on table "public"."mutes" to "service_role";

grant delete on table "public"."post_likes" to "anon";

grant insert on table "public"."post_likes" to "anon";

grant references on table "public"."post_likes" to "anon";

grant select on table "public"."post_likes" to "anon";

grant trigger on table "public"."post_likes" to "anon";

grant truncate on table "public"."post_likes" to "anon";

grant update on table "public"."post_likes" to "anon";

grant delete on table "public"."post_likes" to "authenticated";

grant insert on table "public"."post_likes" to "authenticated";

grant references on table "public"."post_likes" to "authenticated";

grant select on table "public"."post_likes" to "authenticated";

grant trigger on table "public"."post_likes" to "authenticated";

grant truncate on table "public"."post_likes" to "authenticated";

grant update on table "public"."post_likes" to "authenticated";

grant delete on table "public"."post_likes" to "service_role";

grant insert on table "public"."post_likes" to "service_role";

grant references on table "public"."post_likes" to "service_role";

grant select on table "public"."post_likes" to "service_role";

grant trigger on table "public"."post_likes" to "service_role";

grant truncate on table "public"."post_likes" to "service_role";

grant update on table "public"."post_likes" to "service_role";

grant delete on table "public"."post_reactions" to "anon";

grant insert on table "public"."post_reactions" to "anon";

grant references on table "public"."post_reactions" to "anon";

grant select on table "public"."post_reactions" to "anon";

grant trigger on table "public"."post_reactions" to "anon";

grant truncate on table "public"."post_reactions" to "anon";

grant update on table "public"."post_reactions" to "anon";

grant delete on table "public"."post_reactions" to "authenticated";

grant insert on table "public"."post_reactions" to "authenticated";

grant references on table "public"."post_reactions" to "authenticated";

grant select on table "public"."post_reactions" to "authenticated";

grant trigger on table "public"."post_reactions" to "authenticated";

grant truncate on table "public"."post_reactions" to "authenticated";

grant update on table "public"."post_reactions" to "authenticated";

grant delete on table "public"."post_reactions" to "service_role";

grant insert on table "public"."post_reactions" to "service_role";

grant references on table "public"."post_reactions" to "service_role";

grant select on table "public"."post_reactions" to "service_role";

grant trigger on table "public"."post_reactions" to "service_role";

grant truncate on table "public"."post_reactions" to "service_role";

grant update on table "public"."post_reactions" to "service_role";

grant delete on table "public"."posts" to "anon";

grant insert on table "public"."posts" to "anon";

grant references on table "public"."posts" to "anon";

grant select on table "public"."posts" to "anon";

grant trigger on table "public"."posts" to "anon";

grant truncate on table "public"."posts" to "anon";

grant update on table "public"."posts" to "anon";

grant delete on table "public"."posts" to "authenticated";

grant insert on table "public"."posts" to "authenticated";

grant references on table "public"."posts" to "authenticated";

grant select on table "public"."posts" to "authenticated";

grant trigger on table "public"."posts" to "authenticated";

grant truncate on table "public"."posts" to "authenticated";

grant update on table "public"."posts" to "authenticated";

grant delete on table "public"."posts" to "service_role";

grant insert on table "public"."posts" to "service_role";

grant references on table "public"."posts" to "service_role";

grant select on table "public"."posts" to "service_role";

grant trigger on table "public"."posts" to "service_role";

grant truncate on table "public"."posts" to "service_role";

grant update on table "public"."posts" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."publications" to "anon";

grant insert on table "public"."publications" to "anon";

grant references on table "public"."publications" to "anon";

grant select on table "public"."publications" to "anon";

grant trigger on table "public"."publications" to "anon";

grant truncate on table "public"."publications" to "anon";

grant update on table "public"."publications" to "anon";

grant delete on table "public"."publications" to "authenticated";

grant insert on table "public"."publications" to "authenticated";

grant references on table "public"."publications" to "authenticated";

grant select on table "public"."publications" to "authenticated";

grant trigger on table "public"."publications" to "authenticated";

grant truncate on table "public"."publications" to "authenticated";

grant update on table "public"."publications" to "authenticated";

grant delete on table "public"."publications" to "service_role";

grant insert on table "public"."publications" to "service_role";

grant references on table "public"."publications" to "service_role";

grant select on table "public"."publications" to "service_role";

grant trigger on table "public"."publications" to "service_role";

grant truncate on table "public"."publications" to "service_role";

grant update on table "public"."publications" to "service_role";

grant delete on table "public"."questions" to "anon";

grant insert on table "public"."questions" to "anon";

grant references on table "public"."questions" to "anon";

grant select on table "public"."questions" to "anon";

grant trigger on table "public"."questions" to "anon";

grant truncate on table "public"."questions" to "anon";

grant update on table "public"."questions" to "anon";

grant delete on table "public"."questions" to "authenticated";

grant insert on table "public"."questions" to "authenticated";

grant references on table "public"."questions" to "authenticated";

grant select on table "public"."questions" to "authenticated";

grant trigger on table "public"."questions" to "authenticated";

grant truncate on table "public"."questions" to "authenticated";

grant update on table "public"."questions" to "authenticated";

grant delete on table "public"."questions" to "service_role";

grant insert on table "public"."questions" to "service_role";

grant references on table "public"."questions" to "service_role";

grant select on table "public"."questions" to "service_role";

grant trigger on table "public"."questions" to "service_role";

grant truncate on table "public"."questions" to "service_role";

grant update on table "public"."questions" to "service_role";

grant delete on table "public"."reactions" to "anon";

grant insert on table "public"."reactions" to "anon";

grant references on table "public"."reactions" to "anon";

grant select on table "public"."reactions" to "anon";

grant trigger on table "public"."reactions" to "anon";

grant truncate on table "public"."reactions" to "anon";

grant update on table "public"."reactions" to "anon";

grant delete on table "public"."reactions" to "authenticated";

grant insert on table "public"."reactions" to "authenticated";

grant references on table "public"."reactions" to "authenticated";

grant select on table "public"."reactions" to "authenticated";

grant trigger on table "public"."reactions" to "authenticated";

grant truncate on table "public"."reactions" to "authenticated";

grant update on table "public"."reactions" to "authenticated";

grant delete on table "public"."reactions" to "service_role";

grant insert on table "public"."reactions" to "service_role";

grant references on table "public"."reactions" to "service_role";

grant select on table "public"."reactions" to "service_role";

grant trigger on table "public"."reactions" to "service_role";

grant truncate on table "public"."reactions" to "service_role";

grant update on table "public"."reactions" to "service_role";

grant delete on table "public"."votes" to "anon";

grant insert on table "public"."votes" to "anon";

grant references on table "public"."votes" to "anon";

grant select on table "public"."votes" to "anon";

grant trigger on table "public"."votes" to "anon";

grant truncate on table "public"."votes" to "anon";

grant update on table "public"."votes" to "anon";

grant delete on table "public"."votes" to "authenticated";

grant insert on table "public"."votes" to "authenticated";

grant references on table "public"."votes" to "authenticated";

grant select on table "public"."votes" to "authenticated";

grant trigger on table "public"."votes" to "authenticated";

grant truncate on table "public"."votes" to "authenticated";

grant update on table "public"."votes" to "authenticated";

grant delete on table "public"."votes" to "service_role";

grant insert on table "public"."votes" to "service_role";

grant references on table "public"."votes" to "service_role";

grant select on table "public"."votes" to "service_role";

grant trigger on table "public"."votes" to "service_role";

grant truncate on table "public"."votes" to "service_role";

grant update on table "public"."votes" to "service_role";


  create policy "Kullanıcılar kendi oylarını görebilir"
  on "public"."answer_votes"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Kullanıcılar sadece kendi oylarını yönetebilir"
  on "public"."answer_votes"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Answers are viewable by everyone."
  on "public"."answers"
  as permissive
  for select
  to public
using (true);



  create policy "Herkes cevapları görebilir"
  on "public"."answers"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own answers."
  on "public"."answers"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Herkes reaksiyonları görebilir"
  on "public"."comment_reactions"
  as permissive
  for select
  to public
using (true);



  create policy "Kullanıcılar kendi reaksiyonunu yönetir"
  on "public"."comment_reactions"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Public_Select_CR"
  on "public"."comment_reactions"
  as permissive
  for select
  to public
using (true);



  create policy "Reaction counts are viewable by everyone"
  on "public"."comment_reactions"
  as permissive
  for select
  to public
using (true);



  create policy "User_Delete_CR"
  on "public"."comment_reactions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "User_Insert_CR"
  on "public"."comment_reactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "User_Update_CR"
  on "public"."comment_reactions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete own reaction"
  on "public"."comment_reactions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can react"
  on "public"."comment_reactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update own reaction"
  on "public"."comment_reactions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Comments are public"
  on "public"."comments"
  as permissive
  for select
  to public
using (true);



  create policy "Public comments are viewable by everyone"
  on "public"."comments"
  as permissive
  for select
  to public
using (true);



  create policy "Users can comment"
  on "public"."comments"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can create comments"
  on "public"."comments"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete own comments"
  on "public"."comments"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "auth insert comments"
  on "public"."comments"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "public read comments"
  on "public"."comments"
  as permissive
  for select
  to public
using (true);



  create policy "Public read follows"
  on "public"."follows"
  as permissive
  for select
  to public
using (true);



  create policy "User can follow"
  on "public"."follows"
  as permissive
  for insert
  to public
with check ((auth.uid() = follower_id));



  create policy "User can manage requests"
  on "public"."follows"
  as permissive
  for update
  to public
using ((auth.uid() = following_id));



  create policy "User can unfollow"
  on "public"."follows"
  as permissive
  for delete
  to public
using ((auth.uid() = follower_id));



  create policy "Herkes reaksiyonları görebilir"
  on "public"."post_likes"
  as permissive
  for select
  to public
using (true);



  create policy "Üyeler kendi reaksiyonunu değiştirebilir"
  on "public"."post_likes"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Üyeler kendi reaksiyonunu silebilir"
  on "public"."post_likes"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Üyeler reaksiyon verebilir"
  on "public"."post_likes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Herkes görebilir"
  on "public"."post_reactions"
  as permissive
  for select
  to public
using (true);



  create policy "Kullanıcı ekleyebilir"
  on "public"."post_reactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Kullanıcı güncelleyebilir"
  on "public"."post_reactions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Kullanıcı silebilir"
  on "public"."post_reactions"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Herkes paylaşımları görebilir"
  on "public"."posts"
  as permissive
  for select
  to public
using (true);



  create policy "Kullanıcılar sadece kendi adına paylaşım yapabilir"
  on "public"."posts"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Kullanıcılar sadece kendi paylaşımlarını silebilir"
  on "public"."posts"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = user_id));



  create policy "Posts are public"
  on "public"."posts"
  as permissive
  for select
  to public
using (true);



  create policy "Users can create posts"
  on "public"."posts"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Herkes profilleri görebilir"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Public profiles are viewable by everyone."
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Public profiles"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own profile."
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "Users can update own profile."
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "Sadece giriş yapmış kullanıcılar yayın ekleyebilir"
  on "public"."publications"
  as permissive
  for insert
  to public
with check ((auth.role() = 'authenticated'::text));



  create policy "Yayınları herkes görebilir"
  on "public"."publications"
  as permissive
  for select
  to public
using (true);



  create policy "Herkes soruları görebilir"
  on "public"."questions"
  as permissive
  for select
  to public
using (true);



  create policy "Public questions"
  on "public"."questions"
  as permissive
  for select
  to public
using (true);



  create policy "Questions are viewable by everyone."
  on "public"."questions"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own questions."
  on "public"."questions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Allow All for Auth"
  on "public"."reactions"
  as permissive
  for all
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Authenticated users can vote"
  on "public"."votes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Herkes oyları görebilir"
  on "public"."votes"
  as permissive
  for select
  to public
using (true);



  create policy "Public votes are viewable by everyone"
  on "public"."votes"
  as permissive
  for select
  to public
using (true);



  create policy "Users can delete their own vote"
  on "public"."votes"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own vote"
  on "public"."votes"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


  create policy "Dosyalar herkese açık olsun"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'post-attachments'::text));



  create policy "Dosyaları herkes indirebilir"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'publications'::text));



  create policy "Giriş yapanlar dosya yükleyebilir"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'post-attachments'::text));



  create policy "Kullanıcılar dosya yükleyebilir"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'publications'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Sadece admin silebilir"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'publications'::text) AND (auth.uid() = '8db4c0cb-550a-480a-99bd-4b529c004d08'::uuid)));



  create policy "Sadece admin yayın yükleyebilir"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'publications'::text) AND (auth.uid() = '8db4c0cb-550a-480a-99bd-4b529c004d08'::uuid)));



  create policy "Sadece yükleyen silebilir"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'post-attachments'::text) AND (auth.uid() = owner)));



  create policy "Yayınlar herkese açık"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'publications'::text));


CREATE TRIGGER objects_delete_delete_prefix AFTER DELETE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();

CREATE TRIGGER objects_insert_create_prefix BEFORE INSERT ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.objects_insert_prefix_trigger();

CREATE TRIGGER objects_update_create_prefix BEFORE UPDATE ON storage.objects FOR EACH ROW WHEN (((new.name <> old.name) OR (new.bucket_id <> old.bucket_id))) EXECUTE FUNCTION storage.objects_update_prefix_trigger();

CREATE TRIGGER prefixes_create_hierarchy BEFORE INSERT ON storage.prefixes FOR EACH ROW WHEN ((pg_trigger_depth() < 1)) EXECUTE FUNCTION storage.prefixes_insert_trigger();

CREATE TRIGGER prefixes_delete_hierarchy AFTER DELETE ON storage.prefixes FOR EACH ROW EXECUTE FUNCTION storage.delete_prefix_hierarchy_trigger();


