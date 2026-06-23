/*
  Warnings:

  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Added the required column `storageLimit` to the `users` table without a default value. This is not possible if the table is not empty.

*/
BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[categories] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [categories_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [categories_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [categories_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[folders] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [parentId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [folders_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [folders_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [folders_name_parentId_userId_key] UNIQUE NONCLUSTERED ([name],[parentId],[userId])
);

-- CreateTable
CREATE TABLE [dbo].[documents] (
    [id] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [subject] NVARCHAR(1000),
    [fileUrl] NVARCHAR(1000) NOT NULL,
    [fileName] NVARCHAR(1000) NOT NULL,
    [fileSize] INT NOT NULL,
    [mimeType] NVARCHAR(1000) NOT NULL,
    [uploadedBy] NVARCHAR(1000) NOT NULL,
    [categoryId] NVARCHAR(1000),
    [folderId] NVARCHAR(1000),
    [isPublic] BIT NOT NULL CONSTRAINT [documents_isPublic_df] DEFAULT 1,
    [downloadCount] INT NOT NULL CONSTRAINT [documents_downloadCount_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [documents_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [documents_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- RedefineTables
BEGIN TRANSACTION;
ALTER TABLE [dbo].[users] DROP CONSTRAINT [users_email_key];
DECLARE @SQL NVARCHAR(MAX) = N''
SELECT @SQL += N'ALTER TABLE '
    + QUOTENAME(OBJECT_SCHEMA_NAME(PARENT_OBJECT_ID))
    + '.'
    + QUOTENAME(OBJECT_NAME(PARENT_OBJECT_ID))
    + ' DROP CONSTRAINT '
    + OBJECT_NAME(OBJECT_ID) + ';'
FROM SYS.OBJECTS
WHERE TYPE_DESC LIKE '%CONSTRAINT'
    AND OBJECT_NAME(PARENT_OBJECT_ID) = 'users'
    AND SCHEMA_NAME(SCHEMA_ID) = 'dbo'
EXEC sp_executesql @SQL
;
CREATE TABLE [dbo].[_prisma_new_users] (
    [id] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [password] NVARCHAR(1000) NOT NULL,
    [fullName] NVARCHAR(1000) NOT NULL,
    [avatarUrl] NVARCHAR(1000),
    [role] NVARCHAR(1000) NOT NULL CONSTRAINT [users_role_df] DEFAULT 'USER',
    [isVerified] BIT NOT NULL CONSTRAINT [users_isVerified_df] DEFAULT 0,
    [verifyEmailToken] NVARCHAR(1000),
    [verifyEmailExpire] DATETIME2,
    [resetPasswordToken] NVARCHAR(1000),
    [resetPasswordExpire] DATETIME2,
    [usedStorage] FLOAT(53) NOT NULL CONSTRAINT [users_usedStorage_df] DEFAULT 0,
    [storageLimit] FLOAT(53) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);
IF EXISTS(SELECT * FROM [dbo].[users])
    EXEC('INSERT INTO [dbo].[_prisma_new_users] ([avatarUrl],[createdAt],[email],[fullName],[id],[isVerified],[password],[role],[updatedAt]) SELECT [avatarUrl],[createdAt],[email],[fullName],[id],[isVerified],[password],[role],[updatedAt] FROM [dbo].[users] WITH (holdlock tablockx)');
DROP TABLE [dbo].[users];
EXEC SP_RENAME N'dbo._prisma_new_users', N'users';
COMMIT;

-- AddForeignKey
ALTER TABLE [dbo].[folders] ADD CONSTRAINT [folders_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[folders] ADD CONSTRAINT [folders_parentId_fkey] FOREIGN KEY ([parentId]) REFERENCES [dbo].[folders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[documents] ADD CONSTRAINT [documents_uploadedBy_fkey] FOREIGN KEY ([uploadedBy]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[documents] ADD CONSTRAINT [documents_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[categories]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[documents] ADD CONSTRAINT [documents_folderId_fkey] FOREIGN KEY ([folderId]) REFERENCES [dbo].[folders]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
