<?php
/**
 * Asset type registry. Every type maps to its own table but shares the same
 * form layout: Invoice, PO Number, <identifier>, [Serial Number], Brand, Model, Unit Price.
 *
 *  key        - primary key column of the table (IMEI for cellular devices, Serial otherwise)
 *  has_serial - whether a separate SerialNumber column exists alongside the key
 */
const ASSET_TYPES = [
    'cug' => [
        'label'       => 'CUG Mobile',
        'plural'      => 'CUG Mobiles',
        'table'       => 'cugphones',
        'key'         => 'IMEINumber',
        'key_label'   => 'IMEI Number',
        'has_serial'  => true,
        'description' => 'Company mobile phones on the Closed User Group plan.',
        'icon'        => 'CUG',
    ],
    'headset' => [
        'label'       => 'Headset',
        'plural'      => 'Headsets',
        'table'       => 'headsets',
        'key'         => 'SerialNumber',
        'key_label'   => 'Serial Number',
        'has_serial'  => false,
        'description' => 'Wired and wireless headsets issued to staff.',
        'icon'        => 'HS',
    ],
    'deskphone' => [
        'label'       => 'Desk Phone',
        'plural'      => 'Desk Phones',
        'table'       => 'deskphones',
        'key'         => 'SerialNumber',
        'key_label'   => 'Serial Number',
        'has_serial'  => false,
        'description' => 'IP and analogue desk telephones.',
        'icon'        => 'DP',
    ],
    'vodafone' => [
        'label'       => 'Vodafone WiFi Modem',
        'plural'      => 'Vodafone WiFi Modems',
        'table'       => 'vodafonemodems',
        'key'         => 'IMEINumber',
        'key_label'   => 'IMEI Number',
        'has_serial'  => true,
        'description' => 'Portable WiFi modems on the Vodafone network.',
        'icon'        => 'VF',
    ],
    'digicel' => [
        'label'       => 'Digicel Dongle Modem',
        'plural'      => 'Digicel Dongle Modems',
        'table'       => 'digicelmodems',
        'key'         => 'IMEINumber',
        'key_label'   => 'IMEI Number',
        'has_serial'  => true,
        'description' => 'USB dongle modems on the Digicel network.',
        'icon'        => 'DG',
    ],
];

const DEFAULT_ASSET_TYPE = 'cug';

// Returns the type config for a key, or null when the key is unknown.
function asset_type(?string $key): ?array
{
    if ($key === null || !isset(ASSET_TYPES[$key])) {
        return null;
    }

    return ASSET_TYPES[$key] + ['key_name' => $key];
}

// Columns selected for list views, in display order (SerialNumber only where the table has one).
function asset_type_columns(array $type): array
{
    $cols = [$type['key']];
    if ($type['has_serial']) {
        $cols[] = 'SerialNumber';
    }

    return array_merge($cols, ['Brand', 'Model', 'Price', 'PO_Number']);
}

// Number of records per asset type, keyed by type key.
function asset_type_counts(PDO $pdo): array
{
    $counts = [];
    foreach (ASSET_TYPES as $key => $type) {
        $counts[$key] = (int) $pdo->query("SELECT COUNT(*) FROM {$type['table']}")->fetchColumn();
    }

    return $counts;
}
