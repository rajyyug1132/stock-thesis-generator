-- Migration: Create simulation_snapshots table with Row Level Security (RLS)

CREATE TABLE IF NOT EXISTS public.simulation_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  symbols TEXT[] NOT NULL,
  weights REAL[] NOT NULL,
  horizon_days REAL NOT NULL,
  computed_metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.simulation_snapshots ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Allow users to read their own snapshots" 
  ON public.simulation_snapshots
  FOR SELECT 
  USING (auth.uid()::text = user_id);

CREATE POLICY "Allow users to insert their own snapshots" 
  ON public.simulation_snapshots
  FOR INSERT 
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Allow users to delete their own snapshots" 
  ON public.simulation_snapshots
  FOR DELETE 
  USING (auth.uid()::text = user_id);
