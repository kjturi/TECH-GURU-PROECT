<?php
require __DIR__ . '/db.php';
db()->exec("CREATE TABLE IF NOT EXISTS activitylog (
  LogID int(11) NOT NULL AUTO_INCREMENT,
  LoginID int(11) DEFAULT NULL,
  Username varchar(50) DEFAULT NULL,
  Role varchar(20) DEFAULT NULL,
  Action varchar(50) NOT NULL,
  Entity varchar(50) DEFAULT NULL,
  EntityID varchar(100) DEFAULT NULL,
  Details text DEFAULT NULL,
  IPAddress varchar(45) DEFAULT NULL,
  CreatedAt timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (LogID),
  KEY CreatedAt (CreatedAt),
  KEY Username (Username),
  KEY Action (Action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");
echo db()->query("SHOW CREATE TABLE activitylog")->fetch()['Create Table'], "\n";
