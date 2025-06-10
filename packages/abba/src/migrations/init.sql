-- CreateTable
CREATE TABLE IF NOT EXISTS `Bucket` (
    `id` VARCHAR(50) NOT NULL,
    `experimentId` VARCHAR(50) NOT NULL,
    `key` VARCHAR(10) NOT NULL,
    `ratio` INTEGER NOT NULL,
    `data` JSON NULL,
    `created` INT NOT NULL,
    `updated` INT NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `Experiment` (
    `id` VARCHAR(50) NOT NULL,
    `key` VARCHAR(50) NOT NULL,
    `status` INTEGER NOT NULL,
    `sampling` INTEGER NOT NULL,
    `description` VARCHAR(240) NULL,
    `startDateIncl` DATE NOT NULL,
    `endDateExcl` DATE NOT NULL,
    `created` INT NOT NULL,
    `updated` INT NOT NULL,
    `rules` JSON NULL,
    `exclusions` JSON NULL,
    `data` JSON NULL,
    `deleted` BOOLEAN NOT NULL DEFAULT FALSE,

    PRIMARY KEY (`id`),
    UNIQUE INDEX `key_unique` (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `UserAssignment` (
    `id` VARCHAR(50) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `experimentId` VARCHAR(50) NOT NULL,
    `bucketId` VARCHAR(50) NULL,
    `created` INT NOT NULL,
    `updated` INT NOT NULL,

    UNIQUE INDEX `UserAssignment_userId_experimentId_key`(`userId`, `experimentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Bucket` ADD CONSTRAINT `Bucket_experimentId_fkey` FOREIGN KEY (`experimentId`) REFERENCES `Experiment`(`id`);

-- AddForeignKey
ALTER TABLE `UserAssignment` ADD CONSTRAINT `UserAssignment_bucketId_fkey` FOREIGN KEY (`bucketId`) REFERENCES `Bucket`(`id`);

-- AddForeignKey
ALTER TABLE `UserAssignment` ADD CONSTRAINT `UserAssignment_experimentId_fkey` FOREIGN KEY (`experimentId`) REFERENCES `Experiment`(`id`);