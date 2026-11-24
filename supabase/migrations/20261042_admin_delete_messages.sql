-- ==============================================================================
-- Admins can delete a message (scams, abuse)
-- ==============================================================================
-- Admins can already read every conversation (messages_select). This lets them remove a single
-- message from Admin → Messages → Buyers and sellers. Nobody else can delete messages.

drop policy if exists messages_admin_delete on public.messages;
create policy messages_admin_delete on public.messages
  for delete to authenticated
  using (public.is_admin());
