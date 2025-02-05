-- Create function to execute dynamic SQL with proper permissions
CREATE OR REPLACE FUNCTION add_notification_emails_column(sql_command text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    EXECUTE sql_command;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_notification_emails_column(text) TO authenticated;
