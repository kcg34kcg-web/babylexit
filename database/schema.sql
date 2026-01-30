
-- CreateTable: profiles
CREATE TABLE profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    reputation INT DEFAULT 0
);

-- CreateTable: questions
CREATE TABLE questions (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT DEFAULT 'open'
);

-- CreateTable: answers
CREATE TABLE answers (
    id UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    question_id UUID REFERENCES questions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    ai_score INT,
    ai_feedback TEXT,
    is_verified BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles table
CREATE POLICY "Public profiles are viewable by everyone."
ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile."
ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile."
ON profiles FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for questions table
CREATE POLICY "Public questions are viewable by everyone."
ON questions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert questions."
ON questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own questions."
ON questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own questions."
ON questions FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for answers table
CREATE POLICY "Public answers are viewable by everyone."
ON answers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert answers."
ON answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own answers."
ON answers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own answers."
ON answers FOR DELETE USING (auth.uid() = user_id);
