<?php
// Shared sidebar. Set $sidebarActive to one of:
// dashboard | add_asset | manage_assets | add_sim | manage_sims | users | reports
// The asset/SIM section follows the view chosen on the dashboard (Assets or CUG SIMs).
$sidebarView   = current_view();
$sidebarActive = $sidebarActive ?? '';
?>
<div class="sidebar">
  <h2>Inventory</h2>
  <ul>
    <li><a href="dashboard.php" class="<?= $sidebarActive === 'dashboard' ? 'active' : '' ?>">Dashboard</a></li>

    <?php if ($sidebarView === 'assets'): ?>
      <?php if (can_edit()): ?>
        <li><a href="add_asset.php" class="<?= $sidebarActive === 'add_asset' ? 'active' : '' ?>">Add Asset</a></li>
      <?php endif; ?>
      <li><a href="manage_assets.php" class="<?= $sidebarActive === 'manage_assets' ? 'active' : '' ?>"><?= can_edit() ? 'Manage Assets' : 'All Assets' ?></a></li>
    <?php else: ?>
      <?php if (can_edit()): ?>
        <li><a href="add_sim.php" class="<?= $sidebarActive === 'add_sim' ? 'active' : '' ?>">Add SIM</a></li>
      <?php endif; ?>
      <li><a href="manage_sims.php" class="<?= $sidebarActive === 'manage_sims' ? 'active' : '' ?>"><?= can_edit() ? 'Manage SIMs' : 'All SIMs' ?></a></li>
    <?php endif; ?>

    <?php if (is_admin()): ?>
      <li><a href="users.php" class="<?= $sidebarActive === 'users' ? 'active' : '' ?>">Users</a></li>
    <?php endif; ?>
    <li><a href="reports.php" class="<?= $sidebarActive === 'reports' ? 'active' : '' ?>">Reports</a></li>
  </ul>
</div>
