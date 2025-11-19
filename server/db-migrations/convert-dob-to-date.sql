-- Migration: convert Date_Of_Birth to DATE type (safe, reversible steps)
-- IMPORTANT: Backup your database before running. Run statements step-by-step and verify results.

-- 1) Quick backup (snapshot) of the `user` table
CREATE TABLE IF NOT EXISTS user_backup AS SELECT * FROM `user`;

-- 2) Add a temporary DATE column and copy the date portion into it
ALTER TABLE `user` ADD COLUMN `Date_Of_Birth_tmp` DATE NULL;
UPDATE `user` SET `Date_Of_Birth_tmp` = DATE(`Date_Of_Birth`);

-- 3) Verify sample rows before dropping
SELECT User_ID, Date_Of_Birth, Date_Of_Birth_tmp FROM `user` LIMIT 20;

-- 4) When you're satisfied the tmp column matches the desired dates, drop the old column and rename the tmp
ALTER TABLE `user` DROP COLUMN `Date_Of_Birth`;
ALTER TABLE `user` CHANGE COLUMN `Date_Of_Birth_tmp` `Date_Of_Birth` DATE NULL;

-- 5) (Optional) Add a default or NOT NULL constraint if desired
-- ALTER TABLE `user` MODIFY COLUMN `Date_Of_Birth` DATE NOT NULL;
-- or
-- ALTER TABLE `user` MODIFY COLUMN `Date_Of_Birth` DATE NULL;

-- 6) Verify final state
SELECT User_ID, Date_Of_Birth FROM `user` LIMIT 20;

-- If you need to roll back for any reason, you have `user_backup` table available:
-- DROP TABLE IF EXISTS `user`;
-- RENAME TABLE `user_backup` TO `user`;

-- End of migration
