<?php
require_once __DIR__ . '/auth.php';

$user = current_user();
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Asset Management Inventory</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: #f0fdf4;
      color: #333;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Top navigation */
    .navbar {
      background: #065f46;
      padding: 14px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .navbar .brand {
      color: #d1fae5;
      font-size: 1.15rem;
      font-weight: 600;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .navbar .brand img {
      height: 32px;
      width: auto;
      background: #fff;
      border-radius: 4px;
      padding: 2px 6px;
    }
    .navbar .nav-login {
      color: #fff;
      background: #10b981;
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: 6px;
      transition: 0.3s;
    }
    .navbar .nav-login:hover {
      background: #a7f3d0;
      color: #065f46;
    }

    /* Split layout */
    .split {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
    }

    .split-image {
      position: relative;
      background: url('BSP.jpg') center / cover no-repeat;
      min-height: 100%;
    }
    .split-image::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to right, rgba(6,95,70,0.15), rgba(6,95,70,0.45));
    }
    .split-image .caption {
      position: absolute;
      left: 32px;
      bottom: 32px;
      right: 32px;
      color: #fff;
      z-index: 1;
      text-shadow: 0 2px 8px rgba(0,0,0,0.45);
    }
    .split-image .caption h2 {
      font-size: 1.6rem;
      margin-bottom: 6px;
    }
    .split-image .caption p {
      font-size: 1rem;
      color: #d1fae5;
    }

    .split-content {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
    }
    .content-inner {
      width: 100%;
      max-width: 440px;
    }
    .content-inner .logo {
      max-width: 160px;
      width: 100%;
      height: auto;
      display: block;
      margin-bottom: 24px;
    }
    .content-inner h1 {
      font-size: 2rem;
      line-height: 1.2;
      color: #065f46;
      margin-bottom: 12px;
    }
    .content-inner .lead {
      color: #6b7280;
      font-size: 1.05rem;
      line-height: 1.6;
      margin-bottom: 28px;
    }

    .cta {
      display: inline-block;
      background: #10b981;
      color: #fff;
      text-decoration: none;
      font-size: 1.05rem;
      font-weight: 600;
      padding: 14px 40px;
      border-radius: 6px;
      transition: 0.3s;
    }
    .cta:hover {
      background: #065f46;
    }
    .signed-in {
      margin-top: 14px;
      font-size: 0.9rem;
      color: #6b7280;
    }
    .signed-in a {
      color: #065f46;
      font-weight: 600;
    }

    .features {
      list-style: none;
      margin-top: 36px;
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .features li {
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 72px;
      background: #fff;
      border-left: 4px solid #10b981;
      padding: 14px 16px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.06);
    }
    .features .icon {
      flex: 0 0 40px;
      height: 40px;
      border-radius: 8px;
      background: #d1fae5;
      color: #065f46;
      font-weight: 700;
      font-size: 0.95rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .features h3 {
      font-size: 0.95rem;
      color: #065f46;
      margin-bottom: 2px;
    }
    .features p {
      font-size: 0.85rem;
      color: #6b7280;
      line-height: 1.4;
    }

    footer {
      text-align: center;
      padding: 14px;
      font-size: 0.85rem;
      color: #6b7280;
      background: #fff;
      border-top: 1px solid #d1fae5;
    }

    @media (max-width: 860px) {
      .split {
        grid-template-columns: 1fr;
      }
      .split-image {
        min-height: 260px;
        max-height: 40vh;
      }
      .split-content {
        padding: 32px 24px;
      }
      .content-inner h1 {
        font-size: 1.6rem;
      }
    }
  </style>
</head>
<body>
  <nav class="navbar">
    <a class="brand" href="index.php">
      <img src="8451%20BSP%20logo%20kundu.jpg" alt="BSP">
      Asset Management Inventory
    </a>
    <?php if ($user): ?>
      <a class="nav-login" href="dashboard.php">Dashboard</a>
    <?php else: ?>
      <a class="nav-login" href="login.php">Login</a>
    <?php endif; ?>
  </nav>

  <main class="split">
    <section class="split-image" aria-label="BSP building">
      <div class="caption">
        <h2>BSP Asset Management</h2>
        <p>Keeping track of every device, from purchase to hand-over.</p>
      </div>
    </section>

    <section class="split-content">
      <div class="content-inner">
        <img class="logo" src="8451%20BSP%20logo%20kundu.jpg" alt="BSP Logo">
        <h1>Asset Management Inventory</h1>
        <p class="lead">Track CUG phones, SIM cards, headsets and other company assets in one place. Sign in to view the dashboard and manage inventory.</p>

        <?php if ($user): ?>
          <a class="cta" href="dashboard.php">Go to Dashboard</a>
          <p class="signed-in">
            Signed in as <strong><?= htmlspecialchars($user['username'], ENT_QUOTES, 'UTF-8') ?></strong>
            (<?= htmlspecialchars($user['role'], ENT_QUOTES, 'UTF-8') ?>) &middot; <a href="logout.php">Logout</a>
          </p>
        <?php else: ?>
          <a class="cta" href="login.php">Login</a>
        <?php endif; ?>

        <ul class="features">
          <li>
            <span class="icon">01</span>
            <div>
              <h3>Dashboard</h3>
              <p>Live totals and an at-a-glance asset overview.</p>
            </div>
          </li>
          <li>
            <span class="icon">02</span>
            <div>
              <h3>Manage Assets</h3>
              <p>Add, update and delete asset records.</p>
            </div>
          </li>
          <li>
            <span class="icon">03</span>
            <div>
              <h3>Role Based Access</h3>
              <p>Admin, Technician and Auditor permission levels.</p>
            </div>
          </li>
        </ul>
      </div>
    </section>
  </main>

  <footer>&copy; <?= date('Y') ?> BSP &mdash; Asset Management Inventory</footer>
</body>
</html>
