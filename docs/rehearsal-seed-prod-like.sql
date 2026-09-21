-- Representative production-like state for the migration rehearsal.
-- Shapes and relationships mirror the live application at f0a2ceb: real user
-- accounts with sessions and OAuth links, published international and national
-- opportunities (some already past their deadline), and favorites that
-- reference them. Content is synthetic; no production data is copied.
BEGIN;

INSERT INTO users (id, name, email, email_verified, created_at, updated_at, role)
SELECT
  gen_random_uuid(),
  'Estudante ' || g,
  'estudante' || g || '@example.org',
  (g % 4 <> 0),
  now() - (g || ' days')::interval,
  now() - (g || ' days')::interval,
  CASE WHEN g = 1 THEN 'admin' ELSE NULL END
FROM generate_series(1, 120) g;

INSERT INTO accounts (id, account_id, provider_id, user_id, created_at, updated_at, password)
SELECT gen_random_uuid(), 'acct-' || u.email, 'credential', u.id, u.created_at, u.updated_at, 'hashed'
FROM users u;

INSERT INTO accounts (id, account_id, provider_id, user_id, created_at, updated_at, access_token)
SELECT gen_random_uuid(), 'google-' || u.email, 'google', u.id, u.created_at, u.updated_at, 'token'
FROM users u WHERE u.email_verified;

INSERT INTO sessions (id, expires_at, token, created_at, updated_at, user_id, ip_address)
SELECT gen_random_uuid(), now() + interval '7 days', 'sess-' || u.email, now(), now(), u.id, '203.0.113.10'
FROM users u WHERE u.email_verified;

INSERT INTO verifications (id, identifier, value, expires_at, created_at, updated_at)
SELECT gen_random_uuid(), u.email, 'code-' || u.email, now() + interval '1 day', now(), now()
FROM users u WHERE NOT u.email_verified;

INSERT INTO opportunities (
  id, name, image, country, city, responsible_institution, type, description,
  education_level, age_range, language_requirements, specific_requirements,
  application_fee, scholarship_type, scholarship_coverage, extra_costs, duration,
  application_deadline, selection_steps, application_process, official_link,
  contact, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Bolsa Internacional ' || g, 'https://cdn.example.org/i' || g || '.jpg',
  (ARRAY['Portugal','Alemanha','Canada','Japao'])[1 + (g % 4)],
  (ARRAY['Lisboa','Berlim','Toronto','Toquio'])[1 + (g % 4)],
  'Universidade ' || g, 'Graduacao', 'Descricao detalhada da oportunidade ' || g,
  'Graduacao', '18-30', 'B2', 'Historico escolar', 'Isento',
  'Integral', 'Mensalidade e moradia', 'Passagem aerea', '12 meses',
  -- A third are already expired, exercising the deadline filter on real rows.
  (current_date + ((g % 3) * 60 - 40))::date,
  'Analise documental; Entrevista', 'Formulario online',
  'https://example.org/apply/' || g, 'contato' || g || '@example.org',
  now() - (g || ' hours')::interval, now() - (g || ' hours')::interval
FROM generate_series(1, 45) g;

INSERT INTO national_opportunities (
  id, name, image, country, type, education_level, modality,
  application_deadline, about, short_description, duration, city_state,
  age_range, requirements, specific_requirements, responsible_institution,
  application_fee, benefits, costs, extra_costs, selection_steps,
  official_link, contact, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'Programa Nacional ' || g, 'https://cdn.example.org/n' || g || '.jpg', 'Brasil',
  'Intercambio', 'Ensino Medio', 'Presencial',
  (current_date + ((g % 3) * 45 - 30))::date,
  'Sobre o programa ' || g, 'Resumo ' || g, '6 meses', 'Sao Paulo/SP',
  '16-24', 'Matricula ativa', 'Renda familiar', 'Instituto ' || g,
  'Isento', 'Bolsa mensal', 'Nenhum', 'Transporte',
  'Prova; Entrevista', 'https://example.org/nacional/' || g,
  'nacional' || g || '@example.org', now(), now()
FROM generate_series(1, 30) g;

INSERT INTO favorite_opportunities (user_id, opportunity_id, created_at)
SELECT u.id, o.id, now()
FROM users u
JOIN LATERAL (SELECT id FROM opportunities ORDER BY md5(u.id::text || id::text) LIMIT 2) o ON true;

INSERT INTO favorite_national_opportunities (user_id, national_opportunity_id, created_at)
SELECT u.id, n.id, now()
FROM users u
JOIN LATERAL (SELECT id FROM national_opportunities ORDER BY md5(u.id::text || id::text) LIMIT 1) n ON true;

COMMIT;
