BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[transactions] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000) NOT NULL,
    [amount] FLOAT(53) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL CONSTRAINT [transactions_status_df] DEFAULT 'PENDING',
    [paymentMethod] NVARCHAR(1000) NOT NULL,
    [orderCode] NVARCHAR(1000) NOT NULL,
    [providerTransactionId] NVARCHAR(1000),
    [description] NVARCHAR(1000),
    [paidAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [transactions_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [transactions_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [transactions_paymentMethod_orderCode_key] UNIQUE NONCLUSTERED ([paymentMethod], [orderCode])
);

CREATE NONCLUSTERED INDEX [transactions_userId_createdAt_idx]
ON [dbo].[transactions]([userId], [createdAt]);

ALTER TABLE [dbo].[transactions] ADD CONSTRAINT [transactions_userId_fkey]
FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
