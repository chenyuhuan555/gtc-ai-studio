-- 第一阶段工作区快照表。
-- FastAPI 使用 Supabase PostgreSQL 连接写入，前端不直接使用 service_role。
create table if not exists gtc_workspace_state (
  workspace_id varchar(64) primary key,
  state jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists workspace_state_updated_at_idx
  on gtc_workspace_state (updated_at);
