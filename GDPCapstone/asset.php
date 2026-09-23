<?php
require_once __DIR__ . '/auth.php';

$user = require_login();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Assets Page</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0fdf4;
      color: #333;
      display: flex;
    }

    /* Sidebar */
    .sidebar {
      width: 220px;
      background: #065f46;
      color: #fff;
      height: 100vh;
      padding: 20px;
      position: fixed;
    }
    .sidebar h2 {
      margin-bottom: 30px;
      font-size: 1.4rem;
      text-align: center;
      color: #d1fae5;
    }
    .sidebar ul {
      list-style: none;
    }
    .sidebar ul li {
      margin: 15px 0;
    }
    .sidebar ul li a {
      color: #a7f3d0;
      text-decoration: none;
      display: block;
      padding: 10px;
      border-radius: 6px;
      transition: 0.3s;
    }
    .sidebar ul li a:hover {
      background: #10b981;
      color: #fff;
    }

    /* Main content */
    .main {
      margin-left: 240px;
      padding: 20px;
      flex: 1;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .topbar h1 {
      font-size: 1.8rem;
      color: #065f46;
    }
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .search-box input {
      padding: 8px 12px;
      border: 1px solid #10b981;
      border-radius: 6px;
    }
    .user-chip {
      font-size: 0.9rem;
      color: #065f46;
    }
    .user-chip strong {
      display: block;
    }
    .logout-link {
      color: #065f46;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 8px 14px;
      border: 1px solid #10b981;
      border-radius: 6px;
      transition: 0.3s;
    }
    .logout-link:hover {
      background: #10b981;
      color: #fff;
    }

    /* Table */
    table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.1);
    }
    table th, table td {
      padding: 12px 15px;
      text-align: left;
    }
    table th {
      background: #10b981;
      color: #fff;
    }
    table tr:nth-child(even) {
      background: #f0fdf4;
    }
    table tr:hover {
      background: #d1fae5;
    }
  </style>
</head>
<body>
  <?php require __DIR__ . '/partials/sidebar.php'; ?>

  <div class="main">
    <div class="topbar">
      <h1>Assets</h1>
      <div class="topbar-right">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="Search assets...">
        </div>
        <div class="user-chip">
          <strong><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8') ?></strong>
          <?= htmlspecialchars($user['role'], ENT_QUOTES, 'UTF-8') ?>
        </div>
        <a class="logout-link" href="logout.php">Logout</a>
      </div>
    </div>

    <table id="assetTable">
      <thead>
        <tr>
          <th>Asset Name</th>
          <th>Category</th>
          <th>Quantity</th>
          <th>Condition</th>
          <th>Location</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Mobile Phone</td><td>Electronics</td><td>30</td><td>Good</td><td>IT Department</td></tr>
        <tr><td>Headset</td><td>Accessories</td><td>45</td><td>Excellent</td><td>Support Desk</td></tr>
        <tr><td>Desk Phone</td><td>Communication</td><td>20</td><td>Fair</td><td>Admin Office</td></tr>
        <tr><td>Tablet</td><td>Electronics</td><td>10</td><td>Good</td><td>Finance Office</td></tr>
        <tr><td>Monitor</td><td>Electronics</td><td>25</td><td>Excellent</td><td>Operations</td></tr>
      </tbody>
    </table>
  </div>

  <script>
    document.getElementById('searchInput').addEventListener('keyup', function() {
      let filter = this.value.toLowerCase();
      let rows = document.querySelectorAll('#assetTable tbody tr');
      rows.forEach(row => {
        let text = row.textContent.toLowerCase();
        row.style.display = text.includes(filter) ? '' : 'none';
      });
    });
  </script>
</body>
</html>
