-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table (Managed by Supabase Auth usually, but we extend profile info here if needed)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Strategies Table
CREATE TABLE strategies (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- Storing strategy parameters as JSONB for flexibility (e.g. { "lookback": 30, "leverage": 1.0 })
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Python code snippet or link to file
  code_snippet TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Backtest Runs Table
CREATE TABLE backtest_runs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  strategy_id UUID REFERENCES strategies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  -- Metrics stored as JSONB for easy frontend access
  metrics JSONB DEFAULT '{}'::jsonb, 
  -- Link to MLflow artifacts or S3 path
  artifact_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. Live Orders Table (Audit Log)
CREATE TABLE live_orders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  strategy_id UUID REFERENCES strategies(id),
  symbol TEXT NOT NULL,
  side TEXT CHECK (side IN ('BUY', 'SELL')) NOT NULL,
  quantity DECIMAL NOT NULL,
  order_type TEXT CHECK (order_type IN ('MARKET', 'LIMIT', 'STOP')) NOT NULL,
  limit_price DECIMAL,
  status TEXT CHECK (status IN ('SUBMITTED', 'FILLED', 'CANCELLED', 'REJECTED')) DEFAULT 'SUBMITTED',
  filled_price DECIMAL,
  execution_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_orders ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can see their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Strategies: Users can only see/edit their own strategies
CREATE POLICY "Users can view own strategies" ON strategies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own strategies" ON strategies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own strategies" ON strategies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own strategies" ON strategies
  FOR DELETE USING (auth.uid() = user_id);

-- Backtest Runs: Users can only see their own runs
CREATE POLICY "Users can view own backtests" ON backtest_runs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own backtests" ON backtest_runs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Live Orders: Users can only see their own orders
CREATE POLICY "Users can view own orders" ON live_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON live_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);
