-- Keep only the last 7 days of scheduled-job history (cron.job_run_details).
-- The email job runs every 2 minutes and adds about 720 rows a day; nothing else removes them.
-- Only job logs are deleted. Emails, reminders, listings and billing are untouched.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'purge-job-history') then
    perform cron.unschedule('purge-job-history');
  end if;
end $$;

select cron.schedule(
  'purge-job-history',
  '40 10 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);

-- First clean-up now.
delete from cron.job_run_details where end_time < now() - interval '7 days';
