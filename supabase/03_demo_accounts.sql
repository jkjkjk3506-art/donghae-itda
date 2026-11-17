-- 시연 계정 + 시연용 가상 업체. <ADMIN_PW>, <PRO_PW> 를 바꿔 실행 (비밀번호는 저장소에 올리지 말 것)
insert into public.businesses (id,name,category,sub_category,trust_level,source_count,sources,phone,address,licenses,biz_status,visible,is_newcomer,is_demo,work_codes,intro)
values (900001,'잇다 시범도장 (시연용)','도장·방수·코킹','도장·방수 공사업',2,2,'시연용 가상 업체','033-000-0000','강원 동해시 (시연용 주소)','도장ㆍ습식ㆍ방수ㆍ석공사업','정상',true,true,true,
 array['LEAK_ROOF','WALL_CRACK','WINDOW_LEAK'],'해커톤 시연을 위한 가상 업체입니다.') on conflict (id) do nothing;
do $$
declare a uuid := gen_random_uuid(); c uuid := gen_random_uuid();
begin
  insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at,confirmation_token,recovery_token,email_change_token_new,email_change)
  values ('00000000-0000-0000-0000-000000000000',a,'authenticated','authenticated','admin@itda.demo',crypt('<ADMIN_PW>',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','',''),
         ('00000000-0000-0000-0000-000000000000',c,'authenticated','authenticated','pro@itda.demo',crypt('<PRO_PW>',gen_salt('bf')),now(),'{"provider":"email","providers":["email"]}','{}',now(),now(),'','','','');
  insert into auth.identities (id,user_id,provider_id,identity_data,provider,last_sign_in_at,created_at,updated_at)
  values (gen_random_uuid(),a,a::text,jsonb_build_object('sub',a::text,'email','admin@itda.demo'),'email',now(),now(),now()),
         (gen_random_uuid(),c,c::text,jsonb_build_object('sub',c::text,'email','pro@itda.demo'),'email',now(),now(),now());
  insert into public.profiles values (a,'admin','동해시 주무관(시연)',null), (c,'contractor','잇다 시범도장 대표(시연)',900001);
end $$;
