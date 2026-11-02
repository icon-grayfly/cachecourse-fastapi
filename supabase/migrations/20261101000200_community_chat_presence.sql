create policy "Signed-in users can see lounge presence"
  on realtime.messages for select to authenticated
  using (
    (select realtime.topic()) = 'community-lounge'
    and extension = 'presence'
  );

create policy "Signed-in users can publish lounge presence"
  on realtime.messages for insert to authenticated
  with check (
    (select realtime.topic()) = 'community-lounge'
    and extension = 'presence'
  );
