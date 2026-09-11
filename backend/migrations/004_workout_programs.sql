CREATE TABLE workout_programs (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    name NVARCHAR(120) NOT NULL,
    description NVARCHAR(1000) NULL,
    weeks INT NOT NULL DEFAULT 4,
    sessions NVARCHAR(MAX) NOT NULL DEFAULT '[]',
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_WorkoutPrograms_User FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
