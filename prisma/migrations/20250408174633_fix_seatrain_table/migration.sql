/*
  Warnings:

  - You are about to drop the column `arrival_date` on the `schedule` table. All the data in the column will be lost.
  - You are about to drop the column `arrival_time` on the `schedule` table. All the data in the column will be lost.
  - You are about to drop the column `depart_time` on the `schedule` table. All the data in the column will be lost.
  - You are about to drop the column `route_id` on the `schedule` table. All the data in the column will be lost.
  - You are about to drop the column `endStation` on the `ticket` table. All the data in the column will be lost.
  - You are about to drop the column `qr_code` on the `ticket` table. All the data in the column will be lost.
  - You are about to drop the column `startStation` on the `ticket` table. All the data in the column will be lost.
  - You are about to drop the `route` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seattrain` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `arrivalTime` to the `schedule` table without a default value. This is not possible if the table is not empty.
  - Added the required column `departTime` to the `schedule` table without a default value. This is not possible if the table is not empty.
  - Made the column `trainID` on table `schedule` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `from_station_id` to the `ticket` table without a default value. This is not possible if the table is not empty.
  - Added the required column `to_station_id` to the `ticket` table without a default value. This is not possible if the table is not empty.
  - Made the column `fullName` on table `ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `trainID` on table `ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `travel_date` on table `ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `departTime` on table `ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `arrivalTime` on table `ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `price` on table `ticket` required. This step will fail if there are existing NULL values in that column.
  - Made the column `start_date` on table `train_recurrence` required. This step will fail if there are existing NULL values in that column.
  - Made the column `end_date` on table `train_recurrence` required. This step will fail if there are existing NULL values in that column.
  - Made the column `days_of_week` on table `train_recurrence` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `schedule` DROP FOREIGN KEY `schedule_ibfk_1`;

-- DropForeignKey
ALTER TABLE `schedule` DROP FOREIGN KEY `schedule_ibfk_2`;

-- DropForeignKey
ALTER TABLE `seattrain` DROP FOREIGN KEY `seattrain_ibfk_1`;

-- DropForeignKey
ALTER TABLE `ticket` DROP FOREIGN KEY `fk_passport`;

-- DropForeignKey
ALTER TABLE `ticket` DROP FOREIGN KEY `fk_seatID`;

-- DropForeignKey
ALTER TABLE `ticket` DROP FOREIGN KEY `fk_trainID`;

-- DropIndex
DROP INDEX `schedule_ibfk_2` ON `schedule`;

-- AlterTable
ALTER TABLE `customer` MODIFY `fullName` VARCHAR(100) NULL,
    MODIFY `email` VARCHAR(100) NULL,
    MODIFY `phoneNumber` VARCHAR(15) NULL;

-- AlterTable
ALTER TABLE `schedule` DROP COLUMN `arrival_date`,
    DROP COLUMN `arrival_time`,
    DROP COLUMN `depart_time`,
    DROP COLUMN `route_id`,
    ADD COLUMN `actual_arrival` DATETIME(0) NULL,
    ADD COLUMN `actual_departure` DATETIME(0) NULL,
    ADD COLUMN `arrivalTime` DATETIME(0) NOT NULL,
    ADD COLUMN `departTime` DATETIME(0) NOT NULL,
    ADD COLUMN `status` ENUM('Scheduled', 'Departed', 'Arrived', 'Cancelled', 'Delayed') NULL DEFAULT 'Scheduled',
    MODIFY `trainID` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `ticket` DROP COLUMN `endStation`,
    DROP COLUMN `qr_code`,
    DROP COLUMN `startStation`,
    ADD COLUMN `from_station_id` INTEGER NOT NULL,
    ADD COLUMN `journey_segments` LONGTEXT NULL,
    ADD COLUMN `passenger_type` ENUM('Adult', 'Student', 'Senior', 'Child') NULL DEFAULT 'Adult',
    ADD COLUMN `q_code` VARCHAR(255) NULL,
    ADD COLUMN `to_station_id` INTEGER NOT NULL,
    MODIFY `fullName` VARCHAR(100) NOT NULL,
    MODIFY `trainID` INTEGER NOT NULL,
    MODIFY `travel_date` DATE NOT NULL,
    MODIFY `departTime` TIME(0) NOT NULL,
    MODIFY `arrivalTime` TIME(0) NOT NULL,
    MODIFY `price` DECIMAL(10, 2) NOT NULL,
    MODIFY `payment_status` ENUM('Pending', 'Paid') NULL DEFAULT 'Pending',
    MODIFY `refund_status` ENUM('None', 'Requested', 'Refunded') NULL DEFAULT 'None';

-- AlterTable
ALTER TABLE `train` MODIFY `trainID` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `train_recurrence` MODIFY `start_date` DATE NOT NULL,
    MODIFY `end_date` DATE NOT NULL,
    MODIFY `days_of_week` VARCHAR(7) NOT NULL;

-- DropTable
DROP TABLE `route`;

-- DropTable
DROP TABLE `seattrain`;

-- CreateTable
CREATE TABLE `payment_ticket` (
    `payment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `ticket_id` INTEGER NOT NULL,
    `payment_method` VARCHAR(50) NULL,
    `payment_amount` DECIMAL(10, 2) NULL,
    `payment_status` ENUM('Pending', 'Success', 'Failed') NULL,
    `payment_date` DATETIME(0) NULL,

    INDEX `ticket_id`(`ticket_id`),
    PRIMARY KEY (`payment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refund` (
    `refund_id` INTEGER NOT NULL,
    `refund_amount` DECIMAL(10, 2) NULL,
    `refund_status` ENUM('Requested', 'Refunded') NULL,
    `refund_date` DATETIME(0) NULL,
    `ticket_id` INTEGER NULL,

    INDEX `ticket_id`(`ticket_id`),
    PRIMARY KEY (`refund_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin` (
    `adminID` INTEGER NOT NULL,
    `account` VARCHAR(50) NULL,
    `password` VARCHAR(50) NULL,

    PRIMARY KEY (`adminID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `station` (
    `station_id` INTEGER NOT NULL,
    `station_name` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`station_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route_segment` (
    `segment_id` INTEGER NOT NULL AUTO_INCREMENT,
    `from_station_id` INTEGER NOT NULL,
    `to_station_id` INTEGER NOT NULL,
    `duration` INTEGER NOT NULL,
    `base_price` DECIMAL(10, 2) NOT NULL,

    INDEX `to_station_id`(`to_station_id`),
    UNIQUE INDEX `from_station_id`(`from_station_id`, `to_station_id`),
    PRIMARY KEY (`segment_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `train_stop` (
    `stop_id` INTEGER NOT NULL AUTO_INCREMENT,
    `trainID` INTEGER NOT NULL,
    `station_id` INTEGER NOT NULL,
    `stop_order` INTEGER NOT NULL,
    `arrival_time` TIME(0) NULL,
    `departure_time` TIME(0) NULL,
    `stop_duration` INTEGER NULL DEFAULT 0,

    INDEX `station_id`(`station_id`),
    INDEX `idx_arrival`(`arrival_time`),
    INDEX `idx_departure`(`departure_time`),
    UNIQUE INDEX `trainID`(`trainID`, `station_id`),
    UNIQUE INDEX `trainID_2`(`trainID`, `stop_order`),
    PRIMARY KEY (`stop_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seat_template` (
    `template_id` INTEGER NOT NULL AUTO_INCREMENT,
    `trainID` INTEGER NOT NULL,
    `coach` VARCHAR(50) NOT NULL,
    `seat_number` VARCHAR(10) NOT NULL,
    `seat_type` ENUM('soft', 'hard_sleeper_6', 'hard_sleeper_4') NOT NULL,

    UNIQUE INDEX `unique_template_seat`(`trainID`, `coach`, `seat_number`),
    PRIMARY KEY (`template_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seatrain` (
    `seatID` INTEGER NOT NULL AUTO_INCREMENT,
    `trainID` INTEGER NOT NULL,
    `travel_date` DATE NOT NULL,
    `coach` VARCHAR(10) NOT NULL,
    `seat_number` VARCHAR(10) NOT NULL,
    `is_available` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `trainID`(`trainID`, `travel_date`, `coach`, `seat_number`),
    PRIMARY KEY (`seatID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `idx_departure` ON `schedule`(`departTime`);

-- CreateIndex
CREATE INDEX `from_station_id` ON `ticket`(`from_station_id`);

-- CreateIndex
CREATE INDEX `idx_travel_date` ON `ticket`(`travel_date`);

-- CreateIndex
CREATE INDEX `to_station_id` ON `ticket`(`to_station_id`);

-- AddForeignKey
ALTER TABLE `schedule` ADD CONSTRAINT `schedule_ibfk_1` FOREIGN KEY (`trainID`) REFERENCES `train`(`trainID`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `fk_passport` FOREIGN KEY (`passport`) REFERENCES `customer`(`passport`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `fk_trainID` FOREIGN KEY (`trainID`) REFERENCES `train`(`trainID`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `ticket_ibfk_2` FOREIGN KEY (`from_station_id`) REFERENCES `station`(`station_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `ticket_ibfk_3` FOREIGN KEY (`to_station_id`) REFERENCES `station`(`station_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `fk_seatID` FOREIGN KEY (`seatID`) REFERENCES `seatrain`(`seatID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment_ticket` ADD CONSTRAINT `payment_ticket_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `ticket`(`ticket_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `refund` ADD CONSTRAINT `refund_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `ticket`(`ticket_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `route_segment` ADD CONSTRAINT `route_segment_ibfk_1` FOREIGN KEY (`from_station_id`) REFERENCES `station`(`station_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `route_segment` ADD CONSTRAINT `route_segment_ibfk_2` FOREIGN KEY (`to_station_id`) REFERENCES `station`(`station_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `train_stop` ADD CONSTRAINT `train_stop_ibfk_1` FOREIGN KEY (`trainID`) REFERENCES `train`(`trainID`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `train_stop` ADD CONSTRAINT `train_stop_ibfk_2` FOREIGN KEY (`station_id`) REFERENCES `station`(`station_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `seat_template` ADD CONSTRAINT `seat_template_ibfk_1` FOREIGN KEY (`trainID`) REFERENCES `train`(`trainID`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `seatrain` ADD CONSTRAINT `seatrain_ibfk_1` FOREIGN KEY (`trainID`) REFERENCES `train`(`trainID`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- RedefineIndex
CREATE INDEX `trainID` ON `schedule`(`trainID`);
DROP INDEX `schedule_ibfk_1` ON `schedule`;

-- RedefineIndex
CREATE INDEX `recurrence_id` ON `schedule`(`recurrence_id`);
DROP INDEX `schedule_ibfk_3` ON `schedule`;

-- RedefineIndex
CREATE INDEX `fk_ticket_customer` ON `ticket`(`passport`);
DROP INDEX `fk_passport` ON `ticket`;

-- RedefineIndex
CREATE INDEX `ticket_ibfk_4` ON `ticket`(`seatID`);
DROP INDEX `fk_seatID` ON `ticket`;

-- RedefineIndex
CREATE INDEX `trainID` ON `ticket`(`trainID`);
DROP INDEX `fk_trainID` ON `ticket`;
