-- CreateTable
CREATE TABLE `customer` (
    `passport` VARCHAR(50) NOT NULL,
    `fullName` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `phoneNumber` VARCHAR(15) NOT NULL,

    PRIMARY KEY (`passport`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `route` (
    `route_id` INTEGER NOT NULL AUTO_INCREMENT,
    `startStation` VARCHAR(100) NOT NULL,
    `endStation` VARCHAR(100) NOT NULL,
    `duration` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,

    PRIMARY KEY (`route_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `schedule` (
    `schedule_id` INTEGER NOT NULL,
    `trainID` INTEGER NULL,
    `route_id` INTEGER NULL,
    `recurrence_id` INTEGER NULL,
    `depart_time` TIME(0) NULL,
    `arrival_time` TIME(0) NULL,
    `arrival_date` DATE NULL,

    INDEX `schedule_ibfk_1`(`trainID`),
    INDEX `schedule_ibfk_2`(`route_id`),
    INDEX `schedule_ibfk_3`(`recurrence_id`),
    PRIMARY KEY (`schedule_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `seattrain` (
    `seatID` INTEGER NOT NULL AUTO_INCREMENT,
    `trainID` INTEGER NOT NULL,
    `travel_date` DATE NOT NULL,
    `coach` VARCHAR(50) NOT NULL,
    `seat_number` VARCHAR(10) NOT NULL,
    `is_available` BOOLEAN NOT NULL DEFAULT true,

    INDEX `trainID`(`trainID`),
    PRIMARY KEY (`seatID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ticket` (
    `ticket_id` INTEGER NOT NULL AUTO_INCREMENT,
    `fullName` VARCHAR(100) NULL,
    `passport` VARCHAR(50) NULL,
    `phoneNumber` VARCHAR(15) NULL,
    `email` VARCHAR(100) NULL,
    `qr_code` VARCHAR(255) NULL,
    `seatID` INTEGER NULL,
    `coach_seat` VARCHAR(50) NULL,
    `trainID` INTEGER NULL,
    `travel_date` DATE NULL,
    `startStation` VARCHAR(100) NULL,
    `endStation` VARCHAR(100) NULL,
    `departTime` TIME(0) NULL,
    `arrivalTime` TIME(0) NULL,
    `price` DECIMAL(10, 2) NULL,
    `payment_status` ENUM('Pending', 'Paid') NULL,
    `refund_status` ENUM('None', 'Requested', 'Refunded') NULL,

    INDEX `fk_passport`(`passport`),
    INDEX `fk_seatID`(`seatID`),
    INDEX `fk_trainID`(`trainID`),
    PRIMARY KEY (`ticket_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `train` (
    `trainID` INTEGER NOT NULL AUTO_INCREMENT,
    `train_name` VARCHAR(100) NOT NULL,
    `total_seats` INTEGER NOT NULL,

    PRIMARY KEY (`trainID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `train_recurrence` (
    `recurrence_id` INTEGER NOT NULL,
    `start_date` DATE NULL,
    `end_date` DATE NULL,
    `days_of_week` VARCHAR(7) NULL,

    PRIMARY KEY (`recurrence_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `schedule` ADD CONSTRAINT `schedule_ibfk_1` FOREIGN KEY (`trainID`) REFERENCES `train`(`trainID`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `schedule` ADD CONSTRAINT `schedule_ibfk_2` FOREIGN KEY (`route_id`) REFERENCES `route`(`route_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `schedule` ADD CONSTRAINT `schedule_ibfk_3` FOREIGN KEY (`recurrence_id`) REFERENCES `train_recurrence`(`recurrence_id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `seattrain` ADD CONSTRAINT `seattrain_ibfk_1` FOREIGN KEY (`trainID`) REFERENCES `train`(`trainID`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `fk_passport` FOREIGN KEY (`passport`) REFERENCES `customer`(`passport`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `fk_seatID` FOREIGN KEY (`seatID`) REFERENCES `seattrain`(`seatID`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ticket` ADD CONSTRAINT `fk_trainID` FOREIGN KEY (`trainID`) REFERENCES `train`(`trainID`) ON DELETE RESTRICT ON UPDATE RESTRICT;
