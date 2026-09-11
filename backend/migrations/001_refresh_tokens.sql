IF OBJECT_ID(N'refresh_tokens', N'U') IS NULL
BEGIN
    CREATE TABLE refresh_tokens (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        user_id INT NOT NULL,
        expires_at DATETIME2 NOT NULL,
        revoked_at DATETIME2 NULL,
        CONSTRAINT FK_refresh_tokens_users
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IX_refresh_tokens_token_hash ON refresh_tokens(token_hash);
END;
