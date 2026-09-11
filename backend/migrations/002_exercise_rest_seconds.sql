IF COL_LENGTH(N'exercises', N'rest_seconds') IS NULL
BEGIN
    ALTER TABLE exercises ADD rest_seconds INT NOT NULL CONSTRAINT DF_exercises_rest_seconds DEFAULT 90;
END;
