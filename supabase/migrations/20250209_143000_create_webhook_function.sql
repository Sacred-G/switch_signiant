create or replace function handle_transfer_webhook(
  p_event_type text,
  p_job_id text,
  p_source_path text,
  p_destination_path text,
  p_start_time timestamp with time zone,
  p_end_time timestamp with time zone,
  p_bytes_transferred bigint,
  p_error_message text
)
returns void
language plpgsql
security definer
as $$
declare
  v_user_id uuid;
  v_status text;
  v_name text;
begin
  v_user_id := auth.uid();
  v_status := split_part(p_event_type, '.', 5);
  v_name := split_part(p_source_path, '/', -1);
  
  if v_name = '' then
    v_name := p_source_path;
  end if;

  insert into transfer_history (
    user_id,
    job_id,
    name,
    status,
    source,
    destination,
    total_bytes,
    created_on
  ) values (
    v_user_id,
    p_job_id,
    v_name,
    v_status,
    p_source_path,
    p_destination_path,
    p_bytes_transferred,
    p_end_time
  )
  on conflict (user_id, job_id) 
  do update set
    status = EXCLUDED.status,
    total_bytes = EXCLUDED.total_bytes,
    created_on = EXCLUDED.created_on;
end;
$$;

grant execute on function handle_transfer_webhook to authenticated;
