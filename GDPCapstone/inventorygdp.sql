-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 16, 2026 at 10:30 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `inventorygdp`
--

-- --------------------------------------------------------

--
-- Table structure for table `bspdepartments`
--

CREATE TABLE `bspdepartments` (
  `CostCenter` varchar(50) NOT NULL,
  `BusinessUnit` varchar(100) DEFAULT NULL,
  `StrategicBusinessUnit` varchar(100) DEFAULT NULL,
  `UserID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cugphones`
--

CREATE TABLE `cugphones` (
  `IMEINumber` varchar(50) NOT NULL,
  `SerialNumber` varchar(50) DEFAULT NULL,
  `Brand` varchar(50) DEFAULT NULL,
  `Model` varchar(100) DEFAULT NULL,
  `IssuedTo` varchar(100) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  `DateIssued` date DEFAULT NULL,
  `Remarks` text DEFAULT NULL,
  `PO_Number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cugsimcards`
--

CREATE TABLE `cugsimcards` (
  `SPID` varchar(50) NOT NULL,
  `ISP` varchar(50) DEFAULT NULL,
  `SIMNumber` varchar(50) DEFAULT NULL,
  `Plan` varchar(50) DEFAULT NULL,
  `CUGFee` decimal(10,2) DEFAULT NULL,
  `CreditLimit` decimal(10,2) DEFAULT NULL,
  `BAN` varchar(50) DEFAULT NULL,
  `DateActivated` date DEFAULT NULL,
  `IMEINumber` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deskphones`
--

CREATE TABLE `deskphones` (
  `SerialNumber` varchar(50) NOT NULL,
  `Brand` varchar(50) DEFAULT NULL,
  `Model` varchar(100) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  `PO_Number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `digicelmodems`
--

CREATE TABLE `digicelmodems` (
  `IMEINumber` varchar(50) NOT NULL,
  `SerialNumber` varchar(50) DEFAULT NULL,
  `Brand` varchar(50) DEFAULT NULL,
  `Model` varchar(100) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  `PO_Number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `headsets`
--

CREATE TABLE `headsets` (
  `SerialNumber` varchar(50) NOT NULL,
  `Brand` varchar(50) DEFAULT NULL,
  `Model` varchar(100) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  `DateIssued` date DEFAULT NULL,
  `Remarks` text DEFAULT NULL,
  `RIDNumber` int(11) DEFAULT NULL,
  `PO_Number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `logincredentials`
--

CREATE TABLE `logincredentials` (
  `LoginID` int(11) NOT NULL,
  `Username` varchar(50) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `Role` enum('Admin','Technician','Auditor') NOT NULL DEFAULT 'Auditor',
  `CreatedAt` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `orderform`
--

CREATE TABLE `orderform` (
  `PO_Number` varchar(50) NOT NULL,
  `InvoiceNumber` varchar(50) DEFAULT NULL,
  `Model` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `phonecovers`
--

CREATE TABLE `phonecovers` (
  `SerialNumber` varchar(50) NOT NULL,
  `Type` varchar(50) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `request`
--

CREATE TABLE `request` (
  `RIDNumber` int(11) NOT NULL,
  `RIDTitle` varchar(100) DEFAULT NULL,
  `RIDDescription` text DEFAULT NULL,
  `UserID` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `technician`
--

CREATE TABLE `technician` (
  `TechUserID` int(11) NOT NULL,
  `FirstName` varchar(50) DEFAULT NULL,
  `LastName` varchar(50) DEFAULT NULL,
  `TitlePosition` varchar(50) DEFAULT NULL,
  `Email` varchar(100) DEFAULT NULL,
  `Phone` varchar(20) DEFAULT NULL,
  `RIDNumber` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vodafonemodems`
--

CREATE TABLE `vodafonemodems` (
  `IMEINumber` varchar(50) NOT NULL,
  `SerialNumber` varchar(50) DEFAULT NULL,
  `Brand` varchar(50) DEFAULT NULL,
  `Model` varchar(100) DEFAULT NULL,
  `Price` decimal(10,2) DEFAULT NULL,
  `PO_Number` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `UserID` int(11) NOT NULL,
  `FirstName` varchar(50) DEFAULT NULL,
  `LastName` varchar(50) DEFAULT NULL,
  `TitlePosition` varchar(50) DEFAULT NULL,
  `Telephone` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bspdepartments`
--
ALTER TABLE `bspdepartments`
  ADD PRIMARY KEY (`CostCenter`),
  ADD KEY `UserID` (`UserID`);

--
-- Indexes for table `cugphones`
--
ALTER TABLE `cugphones`
  ADD PRIMARY KEY (`IMEINumber`),
  ADD KEY `PO_Number` (`PO_Number`);

--
-- Indexes for table `cugsimcards`
--
ALTER TABLE `cugsimcards`
  ADD PRIMARY KEY (`SPID`),
  ADD KEY `IMEINumber` (`IMEINumber`);

--
-- Indexes for table `deskphones`
--
ALTER TABLE `deskphones`
  ADD PRIMARY KEY (`SerialNumber`),
  ADD KEY `PO_Number` (`PO_Number`);

--
-- Indexes for table `digicelmodems`
--
ALTER TABLE `digicelmodems`
  ADD PRIMARY KEY (`IMEINumber`),
  ADD KEY `PO_Number` (`PO_Number`);

--
-- Indexes for table `headsets`
--
ALTER TABLE `headsets`
  ADD PRIMARY KEY (`SerialNumber`),
  ADD KEY `RIDNumber` (`RIDNumber`),
  ADD KEY `PO_Number` (`PO_Number`);

--
-- Indexes for table `logincredentials`
--
ALTER TABLE `logincredentials`
  ADD PRIMARY KEY (`LoginID`),
  ADD UNIQUE KEY `Username` (`Username`);

--
-- Indexes for table `orderform`
--
ALTER TABLE `orderform`
  ADD PRIMARY KEY (`PO_Number`),
  ADD UNIQUE KEY `InvoiceNumber` (`InvoiceNumber`);

--
-- Indexes for table `phonecovers`
--
ALTER TABLE `phonecovers`
  ADD PRIMARY KEY (`SerialNumber`);

--
-- Indexes for table `request`
--
ALTER TABLE `request`
  ADD PRIMARY KEY (`RIDNumber`),
  ADD KEY `UserID` (`UserID`);

--
-- Indexes for table `technician`
--
ALTER TABLE `technician`
  ADD PRIMARY KEY (`TechUserID`),
  ADD KEY `RIDNumber` (`RIDNumber`);

--
-- Indexes for table `vodafonemodems`
--
ALTER TABLE `vodafonemodems`
  ADD PRIMARY KEY (`IMEINumber`),
  ADD KEY `PO_Number` (`PO_Number`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`UserID`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `logincredentials`
--
ALTER TABLE `logincredentials`
  MODIFY `LoginID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `request`
--
ALTER TABLE `request`
  MODIFY `RIDNumber` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `technician`
--
ALTER TABLE `technician`
  MODIFY `TechUserID` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `UserID` int(11) NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bspdepartments`
--
ALTER TABLE `bspdepartments`
  ADD CONSTRAINT `bspdepartments_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`);

--
-- Constraints for table `cugphones`
--
ALTER TABLE `cugphones`
  ADD CONSTRAINT `cugphones_ibfk_1` FOREIGN KEY (`PO_Number`) REFERENCES `orderform` (`PO_Number`);

--
-- Constraints for table `cugsimcards`
--
ALTER TABLE `cugsimcards`
  ADD CONSTRAINT `cugsimcards_ibfk_1` FOREIGN KEY (`IMEINumber`) REFERENCES `cugphones` (`IMEINumber`);

--
-- Constraints for table `deskphones`
--
ALTER TABLE `deskphones`
  ADD CONSTRAINT `deskphones_ibfk_1` FOREIGN KEY (`PO_Number`) REFERENCES `orderform` (`PO_Number`);

--
-- Constraints for table `digicelmodems`
--
ALTER TABLE `digicelmodems`
  ADD CONSTRAINT `digicelmodems_ibfk_1` FOREIGN KEY (`PO_Number`) REFERENCES `orderform` (`PO_Number`);

--
-- Constraints for table `headsets`
--
ALTER TABLE `headsets`
  ADD CONSTRAINT `headsets_ibfk_1` FOREIGN KEY (`RIDNumber`) REFERENCES `request` (`RIDNumber`),
  ADD CONSTRAINT `headsets_ibfk_2` FOREIGN KEY (`PO_Number`) REFERENCES `orderform` (`PO_Number`);

--
-- Constraints for table `request`
--
ALTER TABLE `request`
  ADD CONSTRAINT `request_ibfk_1` FOREIGN KEY (`UserID`) REFERENCES `users` (`UserID`);

--
-- Constraints for table `technician`
--
ALTER TABLE `technician`
  ADD CONSTRAINT `technician_ibfk_1` FOREIGN KEY (`RIDNumber`) REFERENCES `request` (`RIDNumber`);

--
-- Constraints for table `vodafonemodems`
--
ALTER TABLE `vodafonemodems`
  ADD CONSTRAINT `vodafonemodems_ibfk_1` FOREIGN KEY (`PO_Number`) REFERENCES `orderform` (`PO_Number`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
