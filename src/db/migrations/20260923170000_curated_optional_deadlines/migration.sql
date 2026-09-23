-- Unknown and rolling deadlines are legitimate; never fabricate sentinel dates.
ALTER TABLE opportunities ALTER COLUMN application_deadline DROP NOT NULL;
ALTER TABLE national_opportunities ALTER COLUMN application_deadline DROP NOT NULL;
