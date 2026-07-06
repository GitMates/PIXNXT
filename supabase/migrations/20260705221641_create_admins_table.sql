CREATE TABLE IF NOT EXISTS public.admins (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;

-- Allow read access to admins table
-- We allow authenticated users to read it so the frontend can check if the current user is an admin
CREATE POLICY "Allow read access for authenticated users" 
ON public.admins 
FOR SELECT 
TO authenticated 
USING (true);
