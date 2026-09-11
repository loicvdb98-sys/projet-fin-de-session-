CREATE TABLE training_journals (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    session_id INT NOT NULL,
    notes NVARCHAR(MAX) NULL,
    fatigue INT NOT NULL DEFAULT 5 CHECK (fatigue BETWEEN 1 AND 10),
    mood NVARCHAR(30) NOT NULL DEFAULT 'bien',
    pain NVARCHAR(255) NULL,
    coach_comment NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    updated_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT UQ_Journal_User_Session UNIQUE (user_id, session_id),
    CONSTRAINT FK_Journal_User FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT FK_Journal_Session FOREIGN KEY (session_id) REFERENCES sport_sessions(id) ON DELETE CASCADE
);
