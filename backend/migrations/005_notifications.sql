CREATE TABLE notifications (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    title NVARCHAR(120) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    kind NVARCHAR(20) NOT NULL DEFAULT 'info',
    is_read BIT NOT NULL DEFAULT 0,
    created_at DATETIME2 NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Notifications_User FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
