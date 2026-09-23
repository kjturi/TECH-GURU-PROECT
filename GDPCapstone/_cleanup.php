<?php
require __DIR__ . '/db.php';
db()->exec("DELETE FROM orderform WHERE PO_Number LIKE 'PO-%'");
db()->exec("DELETE FROM logincredentials WHERE Username = 'audit1'");
foreach (['cugphones','headsets','deskphones','vodafonemodems','digicelmodems','orderform'] as $t) echo $t, '=', db()->query("SELECT COUNT(*) FROM $t")->fetchColumn(), ' ';
echo "\n";
