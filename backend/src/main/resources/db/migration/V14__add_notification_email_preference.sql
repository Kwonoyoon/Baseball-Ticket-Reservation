ALTER TABLE notification_preferences
    ADD COLUMN email_enabled BOOLEAN NOT NULL DEFAULT FALSE;
