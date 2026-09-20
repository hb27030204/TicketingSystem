-- Ticket delivery moves fully from SMS to email (see send-ticket-email),
-- so the tracking columns on `tickets` are renamed to match reality.
alter table tickets rename column sms_status to email_status;
alter table tickets rename column sms_sent_at to email_sent_at;
alter table tickets rename column sms_error to email_error;
