-- 身分証として「パスポート」を追加。1968 世代は海外旅行経験者が多くパスポート所持率が高い。
-- マイナ・運転免許・健康保険証に加え、パスポートを 4 つ目の選択肢として受け付ける。

alter table public.verifications drop constraint if exists verifications_document_type_check;

alter table public.verifications
  add constraint verifications_document_type_check
  check (
    document_type in ('mynumber', 'driver_license', 'passport', 'health_insurance')
  );
