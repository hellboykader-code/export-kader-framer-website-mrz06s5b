<?php
/**
 * DentWebPro — couche de stockage partagée (espace commerciaux + fiche du site).
 * Inclus par espace/index.php ET par send.php (../send.php) pour écrire dans la
 * MÊME base de prospects. __DIR__ pointe toujours vers /espace, donc les chemins
 * sont corrects quel que soit le fichier qui inclut ce store.
 */

if (!defined('ADMIN_KEY')) define('ADMIN_KEY', 'admin-7q2k9m'); // identifiant admin (le code PIN protège)
if (!defined('DATA_DIR'))  define('DATA_DIR', __DIR__ . '/data');
if (!defined('DB_FILE'))   define('DB_FILE', DATA_DIR . '/db.json');
if (!defined('PRIX_DEFAUT')) define('PRIX_DEFAUT', 390);

if (!function_exists('db_boot')) {
  function db_boot() {
    if (!is_dir(DATA_DIR)) @mkdir(DATA_DIR, 0755, true);
    $ht = DATA_DIR . '/.htaccess';
    if (!file_exists($ht)) @file_put_contents($ht, "Require all denied\nDeny from all\n");
    if (!file_exists(DB_FILE)) {
      $init = [
        'employees' => [[
          'key' => ADMIN_KEY, 'name' => 'Admin', 'role' => 'admin', 'pin' => '', 'created' => time(),
        ]],
        'prospects' => [],
        'seq' => 1,
        'fails' => new stdClass(),
      ];
      file_put_contents(DB_FILE, json_encode($init, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    }
  }
  function db_load() {
    db_boot();
    $j = json_decode(file_get_contents(DB_FILE), true);
    if (!is_array($j)) $j = [];
    $j += ['employees' => [], 'prospects' => [], 'seq' => 1, 'fails' => []];
    return $j;
  }
  function db_save($db) {
    $fp = fopen(DB_FILE, 'c+');
    if ($fp) { flock($fp, LOCK_EX); ftruncate($fp, 0); rewind($fp);
      fwrite($fp, json_encode($db, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
      fflush($fp); flock($fp, LOCK_UN); fclose($fp); }
  }
  function find_emp($db, $key) {
    foreach ($db['employees'] as $e) if ($e['key'] === $key) return $e;
    return null;
  }
  function gen_key($name) {
    $slug = strtolower(preg_replace('/[^a-z0-9]+/i', '', $name)) ?: 'com';
    $slug = substr($slug, 0, 12);
    return $slug . '-' . substr(bin2hex(random_bytes(3)), 0, 5);
  }
  function gen_pin() { return str_pad((string)random_int(0, 9999), 4, '0', STR_PAD_LEFT); }

  /**
   * Ajoute un prospect dans la base (utilisé par la fiche du site).
   * Déduplique par numéro de téléphone. Renvoie l'id créé (ou 0 si doublon).
   */
  function add_prospect_row($fields) {
    db_boot();
    $db = db_load();
    $tn = preg_replace('/\D/', '', $fields['tel'] ?? '');
    if ($tn !== '') {
      foreach ($db['prospects'] as $p) {
        if (preg_replace('/\D/', '', $p['tel'] ?? '') === $tn) return 0; // déjà présent
      }
    }
    $id = $db['seq']++;
    $db['prospects'][] = array_merge([
      'id' => $id, 'cabinet' => '', 'ville' => '', 'tel' => '', 'email' => '',
      'source' => 'Manuel', 'assignedTo' => '', 'interesse' => 'non', 'statut' => 'nouveau',
      'note' => '', 'relance' => '', 'vendu' => false, 'prix' => PRIX_DEFAUT,
      'fiche' => null, 'created' => time(), 'updated' => time(),
    ], $fields, ['id' => $id]);
    db_save($db);
    return $id;
  }
}
