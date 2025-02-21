-- Create a function to create tables dynamically
CREATE OR REPLACE FUNCTION create_table(table_sql text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    EXECUTE table_sql;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_table(text) TO authenticated;
