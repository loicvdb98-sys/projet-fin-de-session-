CREATE TABLE goals (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(120) NOT NULL,
    metric NVARCHAR(40) NOT NULL,
    target_value FLOAT NOT NULL,
    current_value FLOAT NOT NULL DEFAULT 0,
    unit NVARCHAR(20) NOT NULL,
    due_date DATE NULL,
    notes NVARCHAR(500) NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Goals_User FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE personal_records (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    exercise_name NVARCHAR(120) NOT NULL,
    value FLOAT NOT NULL,
    unit NVARCHAR(20) NOT NULL,
    achieved_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    notes NVARCHAR(255) NULL,
    CONSTRAINT FK_Records_User FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
