-- Add counter_proposed_at and 'countered' status to challenges

alter table challenges add column counter_proposed_at timestamptz;

-- Recreate the status check to include 'countered'
alter table challenges drop constraint challenges_status_check;
alter table challenges add constraint challenges_status_check
  check (status in ('pending','accepted','declined','expired','played','cancelled','countered'));
