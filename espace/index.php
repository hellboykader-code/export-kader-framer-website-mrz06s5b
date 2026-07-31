<?php
/**
 * DentWebPro — Espace commerciaux (mini-CRM par lien privé + code PIN).
 * - Chaque commercial ouvre SON lien privé  espace/?k=<clé>  puis saisit son code (4 chiffres).
 *   Il ne voit QUE ses prospects (ceux qui lui sont assignés).
 * - L'admin ouvre  espace/?k=<ADMIN_KEY>  : gère les commerciaux (crée un lien + code),
 *   ajoute/assigne les prospects, voit tout le monde, les ventes, et un ⚠️ doublon de numéro.
 *
 * Stockage : espace/data/db.json (créé tout seul au 1er lancement, protégé par .htaccess).
 * ⚠️ MISE À JOUR : ré-uploadez UNIQUEMENT ce fichier index.php. Ne touchez JAMAIS au
 *    dossier /data (il contient vos vraies données et vos codes).
 */

session_set_cookie_params(60 * 60 * 24 * 30); // rester connecté ~30 jours (téléphone)
session_start();

require_once __DIR__ . '/store.php';   // ADMIN_KEY, DATA_DIR, DB_FILE, PRIX_DEFAUT + db_* helpers
define('BRAND', 'DentWebPro');
define('ACCENT', '#f55733');

/* ---------------- API JSON ---------------- */
$action = $_REQUEST['action'] ?? '';
if ($action !== '') {
  header('Content-Type: application/json; charset=utf-8');
  $db = db_load();
  $in = $_POST;
  // corps JSON éventuel
  if (empty($in) && stripos($_SERVER['CONTENT_TYPE'] ?? '', 'json') !== false) {
    $in = json_decode(file_get_contents('php://input'), true) ?: [];
  }
  $key = $in['k'] ?? ($_REQUEST['k'] ?? '');

  // -- connexion (vérif du code PIN) --
  if ($action === 'login') {
    $emp = find_emp($db, $key);
    if (!$emp) { echo json_encode(['ok' => false, 'msg' => 'Lien invalide.']); exit; }
    $pin = preg_replace('/\D/', '', (string)($in['pin'] ?? ''));
    // anti-force brute : 6 essais / 90 s par lien
    $f = $db['fails'][$key] ?? ['n' => 0, 't' => 0];
    if ($f['n'] >= 6 && (time() - $f['t']) < 90) {
      echo json_encode(['ok' => false, 'msg' => 'Trop d\'essais. Réessayez dans 1 minute.']); exit;
    }
    // 1ʳᵉ connexion admin : le code saisi devient le code (min 4 chiffres)
    if ($emp['pin'] === '' && $emp['role'] === 'admin') {
      if (strlen($pin) < 4) { echo json_encode(['ok' => false, 'msg' => 'Choisissez un code de 4 chiffres.']); exit; }
      foreach ($db['employees'] as &$e) if ($e['key'] === $key) $e['pin'] = password_hash($pin, PASSWORD_DEFAULT);
      unset($e);
      $db['fails'][$key] = ['n' => 0, 't' => 0];
      db_save($db);
      $_SESSION['auth'][$key] = $emp['role'];
      echo json_encode(['ok' => true, 'role' => $emp['role'], 'name' => $emp['name'], 'first' => true]); exit;
    }
    if ($emp['pin'] !== '' && password_verify($pin, $emp['pin'])) {
      $db['fails'][$key] = ['n' => 0, 't' => 0]; db_save($db);
      $_SESSION['auth'][$key] = $emp['role'];
      echo json_encode(['ok' => true, 'role' => $emp['role'], 'name' => $emp['name']]); exit;
    }
    $db['fails'][$key] = ['n' => ($f['t'] && time() - $f['t'] < 90 ? $f['n'] + 1 : 1), 't' => time()];
    db_save($db);
    echo json_encode(['ok' => false, 'msg' => 'Code incorrect.']); exit;
  }

  // -- statut public d'un lien (sans session) : existe ? doit définir son code ? --
  if ($action === 'status') {
    $emp = find_emp($db, $key);
    if (!$emp) { echo json_encode(['ok' => false, 'exists' => false]); exit; }
    echo json_encode(['ok' => true, 'exists' => true,
      'needsSetup' => ($emp['pin'] === '' && $emp['role'] === 'admin')]); exit;
  }

  // -- toutes les autres actions exigent une session valide pour cette clé --
  $role = $_SESSION['auth'][$key] ?? null;
  $emp = find_emp($db, $key);
  if (!$role || !$emp) { http_response_code(401); echo json_encode(['ok' => false, 'msg' => 'Session expirée.']); exit; }

  if ($action === 'logout') { unset($_SESSION['auth'][$key]); echo json_encode(['ok' => true]); exit; }

  if ($action === 'me') { echo json_encode(['ok' => true, 'role' => $role, 'name' => $emp['name']]); exit; }

  // -- script de vente : lecture pour TOUS (admin + commerciaux) --
  if ($action === 'get_script') { echo json_encode(['ok' => true, 'script' => $db['script']]); exit; }

  /* ===== côté COMMERCIAL ===== */
  if ($action === 'my_list' && $role === 'commercial') {
    $mine = array_values(array_filter($db['prospects'], fn($p) => ($p['assignedTo'] ?? '') === $key));
    echo json_encode(['ok' => true, 'prospects' => $mine]); exit;
  }
  if ($action === 'save_prospect' && $role === 'commercial') {
    $id = (int)($in['id'] ?? 0); $done = false;
    foreach ($db['prospects'] as &$p) {
      if ($p['id'] === $id && ($p['assignedTo'] ?? '') === $key) {
        foreach (['interesse', 'note', 'relance', 'statut'] as $fld)
          if (array_key_exists($fld, $in)) $p[$fld] = trim((string)$in[$fld]);
        if (array_key_exists('statut', $in)) $p['interesse'] = ($p['statut'] === 'interesse') ? 'oui' : 'non';
        if (array_key_exists('vendu', $in)) { $p['vendu'] = ($in['vendu'] === '1' || $in['vendu'] === 'true'); }
        if (!empty($p['vendu']) && empty($p['prix'])) $p['prix'] = PRIX_DEFAUT;
        $p['updated'] = time(); $done = true;
      }
    } unset($p);
    if ($done) db_save($db);
    echo json_encode(['ok' => $done]); exit;
  }

  /* ===== côté ADMIN ===== */
  if ($role !== 'admin') { http_response_code(403); echo json_encode(['ok' => false, 'msg' => 'Accès refusé.']); exit; }

  if ($action === 'admin_data') {
    $coms = array_values(array_filter($db['employees'], fn($e) => ($e['role'] ?? '') === 'commercial'));
    // ne pas exposer le hash du PIN ; exposer le PIN "clair" seulement s'il n'a jamais été utilisé (pinClear)
    $coms = array_map(fn($e) => [
      'key' => $e['key'], 'name' => $e['name'],
      'pinClear' => $e['pinClear'] ?? '', 'created' => $e['created'] ?? 0,
    ], $coms);
    // doublons de téléphone (⚠️ risque d'appel en double)
    $tels = [];
    foreach ($db['prospects'] as $p) { $t = preg_replace('/\D/', '', $p['tel'] ?? ''); if ($t) $tels[$t] = ($tels[$t] ?? 0) + 1; }
    $dups = array_keys(array_filter($tels, fn($n) => $n > 1));
    echo json_encode(['ok' => true, 'commerciaux' => $coms, 'prospects' => $db['prospects'], 'dups' => $dups]); exit;
  }
  if ($action === 'save_script') {   // admin uniquement : éditer le script de vente
    $s = $in['script'] ?? '';
    if (is_string($s)) $s = json_decode($s, true);
    if (is_array($s)) { $db['script'] = $s; db_save($db); echo json_encode(['ok' => true]); }
    else echo json_encode(['ok' => false, 'msg' => 'Données invalides.']);
    exit;
  }
  if ($action === 'add_emp') {
    $name = trim((string)($in['name'] ?? '')); if ($name === '') { echo json_encode(['ok' => false, 'msg' => 'Nom requis.']); exit; }
    $k = gen_key($name);
    $pin = preg_replace('/\D/', '', (string)($in['pin'] ?? ''));   // code choisi par l'admin
    if (strlen($pin) < 4) $pin = gen_pin();                        // sinon généré automatiquement
    $db['employees'][] = [
      'key' => $k, 'name' => $name, 'role' => 'commercial',
      'pin' => password_hash($pin, PASSWORD_DEFAULT), 'pinClear' => $pin, 'created' => time(),
    ];
    db_save($db);
    echo json_encode(['ok' => true, 'key' => $k, 'pin' => $pin]); exit;
  }
  if ($action === 'reset_pin') {
    $k = $in['empKey'] ?? '';
    $pin = preg_replace('/\D/', '', (string)($in['pin'] ?? ''));   // code choisi, sinon aléatoire
    if (strlen($pin) < 4) $pin = gen_pin();
    $done = false;
    foreach ($db['employees'] as &$e) if ($e['key'] === $k && $e['role'] === 'commercial') {
      $e['pin'] = password_hash($pin, PASSWORD_DEFAULT); $e['pinClear'] = $pin; $done = true;
    } unset($e);
    if ($done) db_save($db);
    echo json_encode(['ok' => $done, 'pin' => $pin]); exit;
  }
  if ($action === 'rename_emp') {
    $k = $in['empKey'] ?? ''; $name = trim((string)($in['name'] ?? '')); $done = false;
    if ($name !== '') { foreach ($db['employees'] as &$e) if ($e['key'] === $k && $e['role'] === 'commercial') { $e['name'] = $name; $done = true; } unset($e); if ($done) db_save($db); }
    echo json_encode(['ok' => $done]); exit;
  }
  if ($action === 'del_emp') {
    $k = $in['empKey'] ?? '';
    $db['employees'] = array_values(array_filter($db['employees'], fn($e) => !($e['key'] === $k && $e['role'] === 'commercial')));
    foreach ($db['prospects'] as &$p) if (($p['assignedTo'] ?? '') === $k) $p['assignedTo'] = '';
    unset($p); db_save($db);
    echo json_encode(['ok' => true]); exit;
  }
  if ($action === 'add_prospect') {
    $id = $db['seq']++;
    $db['prospects'][] = [
      'id' => $id,
      'cabinet' => trim((string)($in['cabinet'] ?? '')),
      'ville' => trim((string)($in['ville'] ?? '')),
      'tel' => trim((string)($in['tel'] ?? '')),
      'email' => trim((string)($in['email'] ?? '')),
      'source' => trim((string)($in['source'] ?? 'Manuel')),
      'assignedTo' => trim((string)($in['assignedTo'] ?? '')),
      'interesse' => 'non', 'statut' => 'nouveau', 'note' => '', 'relance' => '',
      'vendu' => false, 'prix' => PRIX_DEFAUT, 'created' => time(), 'updated' => time(),
    ];
    db_save($db);
    echo json_encode(['ok' => true, 'id' => $id]); exit;
  }
  if ($action === 'import_prospects') {
    $raw  = (string)($in['raw'] ?? '');
    $mode = $in['mode'] ?? 'auto';          // auto (répartir) | one (un seul) | none
    $only = trim((string)($in['assignedTo'] ?? ''));
    $coms = array_values(array_map(fn($e) => $e['key'],
            array_filter($db['employees'], fn($e) => ($e['role'] ?? '') === 'commercial')));
    // téléphones déjà présents → éviter les doublons à l'import
    $existing = [];
    foreach ($db['prospects'] as $p) { $t = preg_replace('/\D/', '', $p['tel'] ?? ''); if ($t) $existing[$t] = 1; }
    $added = 0; $skipped = 0; $i = 0;
    foreach (preg_split('/\r\n|\r|\n/', $raw) as $ln) {
      $ln = trim($ln); if ($ln === '') continue;
      $parts = preg_split('/\t|;|,/', $ln);
      $cab = trim($parts[0] ?? ''); $ville = trim($parts[1] ?? '');
      $tel = trim($parts[2] ?? ''); $email = trim($parts[3] ?? '');
      $tn = preg_replace('/\D/', '', $tel);
      if (strlen($tn) < 9) { $skipped++; continue; }        // besoin d'un vrai téléphone (évite noms/adresses parasites)
      if (isset($existing[$tn])) { $skipped++; continue; }   // doublon
      $existing[$tn] = 1;
      if ($mode === 'one')      $assign = $only;
      elseif ($mode === 'none') $assign = '';
      else { $assign = $coms ? $coms[$i % count($coms)] : ''; $i++; }
      $db['prospects'][] = [
        'id' => $db['seq']++, 'cabinet' => $cab, 'ville' => $ville, 'tel' => $tel, 'email' => $email,
        'source' => 'Import', 'assignedTo' => $assign, 'interesse' => 'non', 'statut' => 'nouveau',
        'note' => '', 'relance' => '', 'vendu' => false, 'prix' => PRIX_DEFAUT, 'created' => time(), 'updated' => time(),
      ];
      $added++;
    }
    if ($added) db_save($db);
    echo json_encode(['ok' => true, 'added' => $added, 'skipped' => $skipped]); exit;
  }
  if ($action === 'edit_prospect') {
    $id = (int)($in['id'] ?? 0); $done = false;
    foreach ($db['prospects'] as &$p) if ($p['id'] === $id) {
      foreach (['cabinet', 'ville', 'tel', 'email', 'source', 'assignedTo', 'interesse', 'statut', 'note', 'relance'] as $fld)
        if (array_key_exists($fld, $in)) $p[$fld] = trim((string)$in[$fld]);
      if (array_key_exists('vendu', $in)) $p['vendu'] = ($in['vendu'] === '1' || $in['vendu'] === 'true');
      if (array_key_exists('prix', $in)) $p['prix'] = (int)$in['prix'];
      $p['updated'] = time(); $done = true;
    } unset($p);
    if ($done) db_save($db);
    echo json_encode(['ok' => $done]); exit;
  }
  if ($action === 'del_prospect') {
    $id = (int)($in['id'] ?? 0);
    $db['prospects'] = array_values(array_filter($db['prospects'], fn($p) => $p['id'] !== $id));
    db_save($db);
    echo json_encode(['ok' => true]); exit;
  }
  if ($action === 'del_many') {
    $ids = array_filter(array_map('intval', explode(',', (string)($in['ids'] ?? ''))));
    if ($ids) {
      $db['prospects'] = array_values(array_filter($db['prospects'], fn($p) => !in_array($p['id'], $ids, true)));
      db_save($db);
    }
    echo json_encode(['ok' => true, 'deleted' => count($ids)]); exit;
  }
  if ($action === 'del_all') {
    $db['prospects'] = [];
    db_save($db);
    echo json_encode(['ok' => true]); exit;
  }
  if ($action === 'reassign_many') {   // réassigner les prospects sélectionnés
    $ids = array_filter(array_map('intval', explode(',', (string)($in['ids'] ?? ''))));
    $to = trim((string)($in['assignedTo'] ?? '')); $n = 0;
    foreach ($db['prospects'] as &$p) if (in_array($p['id'], $ids, true)) { $p['assignedTo'] = $to; $p['updated'] = time(); $n++; }
    unset($p); if ($n) db_save($db);
    echo json_encode(['ok' => true, 'moved' => $n]); exit;
  }
  if ($action === 'transfer_all') {    // transférer TOUTE la liste d'un commercial à un autre
    $from = trim((string)($in['fromKey'] ?? '')); $to = trim((string)($in['toKey'] ?? '')); $n = 0;
    foreach ($db['prospects'] as &$p) if (($p['assignedTo'] ?? '') === $from) { $p['assignedTo'] = $to; $p['updated'] = time(); $n++; }
    unset($p); if ($n) db_save($db);
    echo json_encode(['ok' => true, 'moved' => $n]); exit;
  }
  echo json_encode(['ok' => false, 'msg' => 'Action inconnue.']); exit;
}

/* ---------------- page HTML (app) ---------------- */
db_boot();
$k = $_GET['k'] ?? '';
$A = ACCENT;
?><!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex,nofollow">
<title>Espace commercial — <?= BRAND ?></title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,500&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  *{margin:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
  :root{--bg:#f6f2ec;--panel:#fff;--line:#e9e1d5;--ink:#1a1712;--gold:#b3873f;--gold2:#c99a4e;--soft:#8a8377;--accent:#f55733;--accent-d:#d8431f;--ok:#15a35b}
  body{background:var(--bg);color:var(--ink);-webkit-tap-highlight-color:transparent}
  .wrap{max-width:820px;margin:0 auto;padding:0 14px 90px}
  /* header (clair) */
  .hd{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);color:var(--ink);margin:0 -14px 16px;padding:14px 18px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--line);box-shadow:0 1px 0 rgba(179,135,63,.22)}
  .hd .mk{width:34px;height:34px;border-radius:9px;background:var(--ink);display:grid;place-items:center;flex:none}
  .hd .nm{font-weight:800;font-size:16px;letter-spacing:-.02em;color:var(--ink)}
  .hd .nm .c{color:var(--accent)}
  .hd .who{margin-left:auto;font-size:13px;color:var(--soft);display:flex;align-items:center;gap:10px}
  .hd .out{color:var(--ink);background:#fff;border:1px solid var(--line);border-radius:8px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer}
  /* login */
  .login{max-width:400px;margin:8vh auto 0;background:var(--panel);border:1px solid var(--line);border-radius:18px;padding:32px 26px;text-align:center;box-shadow:0 24px 50px -30px rgba(60,45,20,.35)}
  .login .mk{width:56px;height:56px;border-radius:15px;background:var(--ink);display:grid;place-items:center;margin:0 auto 16px}
  .login h1{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:23px;letter-spacing:-.01em;color:var(--ink)}
  .login p{color:var(--soft);font-size:14px;margin:8px 0 22px}
  .pin{display:flex;gap:10px;justify-content:center;margin-bottom:16px}
  .pin input{width:56px;height:64px;text-align:center;font-size:26px;font-weight:700;border:1.5px solid var(--line);border-radius:12px;color:var(--ink);background:#fff}
  .pin input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 4px rgba(245,87,51,.13)}
  .msg{min-height:20px;color:#c0342f;font-size:13.5px;font-weight:600;margin-bottom:8px}
  .btn{font-weight:700;font-size:15px;border:0;border-radius:12px;padding:14px 22px;cursor:pointer;background:var(--accent);color:#fff;width:100%}
  .btn.sec{background:#fff;border:1.5px solid var(--line);color:var(--ink);width:auto}
  .btn.sm{padding:9px 14px;font-size:13.5px;width:auto}
  .hint{color:var(--soft);font-size:12.5px;margin-top:14px}
  /* chips */
  .chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px;scrollbar-width:none}
  .chips::-webkit-scrollbar{display:none}
  .chip{flex:none;border:1px solid var(--line);background:#fff;border-radius:100px;padding:8px 15px;font-size:13.5px;font-weight:600;color:var(--soft);cursor:pointer}
  .chip.on{background:var(--ink);color:#f6f2ec;border-color:var(--ink)}
  .chip .b{display:inline-block;min-width:18px;text-align:center;background:#f0e9dd;color:var(--gold);border-radius:100px;font-size:11px;padding:1px 6px;margin-left:5px}
  .chip.on .b{background:rgba(255,255,255,.18);color:#f6f2ec}
  /* cards */
  .card{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:12px;box-shadow:0 20px 40px -32px rgba(60,45,20,.4)}
  .card.oui{border-color:#bfe3c9}
  .card .top{display:flex;align-items:flex-start;gap:10px}
  .card h3{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:20px;letter-spacing:-.01em;color:var(--ink)}
  .card .ville{color:var(--soft);font-size:12.5px;margin-top:3px;letter-spacing:.02em}
  .card .src{margin-left:auto;font-size:10px;font-weight:700;color:var(--gold);background:#f7f1e6;border:1px solid #ecdfc9;border-radius:100px;padding:3px 9px;white-space:nowrap;text-transform:uppercase;letter-spacing:.08em}
  .call{display:flex;align-items:center;gap:11px;margin:14px 0;background:var(--ink);color:#fff;text-decoration:none;border-radius:12px;padding:14px 16px;font-weight:700;font-size:16px}
  .call .ph{margin-left:auto;font-weight:500;font-size:13.5px;color:#cfc6b3;letter-spacing:.03em}
  .seg{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}
  .seg button{flex:1;min-width:96px;border:1px solid var(--line);background:#fff;border-radius:11px;padding:11px 8px;font-weight:700;font-size:13px;color:var(--soft);cursor:pointer}
  .seg button.y.on{background:var(--ok);border-color:var(--ok);color:#fff}
  .seg button.n.on{background:#efe9de;border-color:#e4dccd;color:#4a4234}
  .seg button.r.on{background:#e5484d;border-color:#e5484d;color:#fff}
  .card.no{opacity:.6}
  .row{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}
  .fld{flex:1;min-width:140px;display:flex;flex-direction:column;gap:5px}
  .fld label{font-size:10.5px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.12em}
  .inp,textarea,select{border:1.5px solid var(--line);background:#fff;border-radius:11px;padding:11px 13px;font-size:14.5px;color:var(--ink);width:100%;font-family:inherit}
  .inp:focus,textarea:focus,select:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 4px rgba(245,87,51,.1)}
  textarea{min-height:56px;resize:vertical}
  .sold{display:flex;align-items:center;gap:10px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line);font-size:14px;font-weight:600;color:var(--ink);cursor:pointer;user-select:none}
  .sold .bx{width:22px;height:22px;border-radius:7px;border:1.5px solid #cdc2ad;flex:none;display:grid;place-items:center;color:#fff;font-size:14px}
  .sold.on .bx{background:var(--ok);border-color:var(--ok)}
  .sold .pr{margin-left:auto;font-family:'Fraunces',Georgia,serif;color:var(--gold)}
  .saved{font-size:12px;color:var(--ok);font-weight:600;opacity:0;transition:opacity .2s}
  .saved.show{opacity:1}
  .empty{text-align:center;color:var(--soft);padding:50px 20px;font-size:15px}
  /* admin */
  .tabs{display:flex;gap:8px;margin-bottom:14px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .tabs::-webkit-scrollbar{display:none}
  .tab{flex:0 0 auto;border:1px solid var(--line);background:#fff;border-radius:11px;padding:11px 16px;font-weight:700;font-size:14px;color:var(--soft);cursor:pointer;text-align:center;white-space:nowrap}
  .tab.on{background:var(--ink);border-color:var(--ink);color:#f6f2ec}
  .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}
  .stat{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px}
  .stat .v{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:27px;letter-spacing:-.01em;color:var(--ink)}
  .stat .l{font-size:12px;color:var(--soft);margin-top:2px}
  .stat.acc{background:var(--ink);border-color:var(--ink)}.stat.acc .v{color:#f6f2ec}.stat.acc .l{color:#c9c0ad}
  table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13.5px}
  th,td{padding:10px 11px;text-align:left;border-bottom:1px solid var(--line);vertical-align:middle;color:var(--ink)}
  th{background:#faf6ee;font-size:10.5px;text-transform:uppercase;letter-spacing:.1em;color:var(--soft)}
  tr:last-child td{border-bottom:0}
  tr.dup td{background:#fff3f0}
  .tag{display:inline-block;font-size:10.5px;font-weight:700;border-radius:100px;padding:3px 10px;letter-spacing:.02em}
  .tag.oui{background:#e3f7ec;color:#137a43}.tag.non{background:#f0ece2;color:#8a8377}
  .tag.vendu{background:#f7ecd2;color:#a5680a}
  .tag.new{background:#eef1f6;color:#5b6472}.tag.no{background:#fdecec;color:#c0342f}
  /* ── Script de vente — premium clair ── */
  .pb h1,.pb h3,.pb h4{font-family:'Fraunces',Georgia,serif;font-weight:500;letter-spacing:-.015em;line-height:1.14}
  .pb-hero{background:radial-gradient(130% 130% at 12% 0%,#242530 0%,#15161b 60%);color:#fff;border-radius:20px;padding:30px 26px;position:relative;overflow:hidden;margin-bottom:18px}
  .pb-hero::after{content:"";position:absolute;right:-50px;top:-45px;width:230px;height:230px;border-radius:50%;background:radial-gradient(circle,rgba(245,87,51,.34),transparent 65%)}
  .pb-hero .eb{font-weight:700;font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#f55733;position:relative}
  .pb-hero h1{font-size:30px;margin:12px 0 9px;position:relative;color:#fff}
  .pb-hero h1 em{font-style:italic;color:#ffb59f}
  .pb-hero p{color:#c7c8d1;font-size:14.5px;position:relative;max-width:46ch}
  .pb-strat{background:#fff6f3;border:1px solid #ffd9cf;border-radius:16px;padding:18px 20px;margin-bottom:22px}
  .pb-strat .l{font-weight:700;font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:#c0341a;margin-bottom:6px}
  .pb-strat p{font-size:15px;color:#33363f}
  .pb-sec{margin-bottom:26px}
  .pb-sh{display:flex;align-items:center;gap:13px;margin-bottom:16px}
  .pb-sh .num{width:36px;height:36px;border-radius:10px;background:#15161b;color:#fff;display:grid;place-items:center;font:700 16px 'Fraunces';flex:none}
  .pb-sh h3{font-size:22px;color:#15161b}
  .pb-intro{background:#fff;border:1px solid var(--line);border-radius:15px;padding:17px 19px;margin-bottom:11px}
  .pb-k{font-weight:700;font-size:12px;color:#f55733;text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;display:flex;align-items:center;gap:8px}
  .pb-k .d{width:22px;height:22px;border-radius:7px;background:#fff1ec;color:#d8431f;display:grid;place-items:center;font:600 12px 'Fraunces';flex:none}
  .pb-intro p{font-size:14.5px;color:#33363f;font-style:italic}
  .pb-step{position:relative;padding:0 0 20px 44px}
  .pb-step::before{content:"";position:absolute;left:16px;top:34px;bottom:-2px;width:2px;background:linear-gradient(#f55733,#f6c4b7)}
  .pb-step:last-child::before{display:none}
  .pb-step .b{position:absolute;left:0;top:2px;width:34px;height:34px;border-radius:50%;background:#f55733;color:#fff;display:grid;place-items:center;font:700 15px 'Fraunces'}
  .pb-step h4{font-family:'Inter',sans-serif;font-weight:700;font-size:16px;margin-bottom:7px;color:#15161b}
  .pb-step .say{background:#fff;border:1px solid var(--line);border-radius:13px;padding:14px 16px;font-size:14.5px;font-style:italic;color:#33363f}
  .pb-ob{background:#fff;border:1px solid var(--line);border-radius:13px;overflow:hidden;margin-bottom:11px}
  .pb-ob .said{background:#faf6ee;padding:13px 16px;font-weight:700;font-size:14px;color:#40454f}
  .pb-ob .rep{padding:13px 16px;font-size:14px;font-style:italic;color:#33363f}
  .pb-rules{background:#15161b;color:#fff;border-radius:18px;padding:24px 26px;position:relative;overflow:hidden}
  .pb-rules::after{content:"";position:absolute;left:-50px;bottom:-50px;width:190px;height:190px;border-radius:50%;background:radial-gradient(circle,rgba(245,87,51,.28),transparent 65%)}
  .pb-rules h3{color:#fff;font-size:20px;margin-bottom:15px;position:relative}
  .pb-li{display:flex;gap:12px;align-items:flex-start;font-size:14.5px;color:#e2e3ea;margin-bottom:12px;position:relative}
  .pb-li .c{width:25px;height:25px;border-radius:8px;background:#f55733;color:#fff;display:grid;place-items:center;flex:none;font-weight:700;font-size:13px}
  /* ── édition (admin) ── */
  .pbrow{display:flex;gap:8px;align-items:flex-start;margin-bottom:9px}
  .pbrow input,.pbrow textarea{border:1.5px solid var(--line);background:#fff;color:var(--ink);border-radius:9px;padding:9px 11px;font:14px inherit;width:100%}
  .pbrow input:focus,.pbrow textarea:focus{outline:none;border-color:var(--accent)}
  .pbrow .col{flex:1;display:flex;flex-direction:column;gap:6px}
  .pbrow textarea{min-height:64px;resize:vertical}
  .pbrow .del{background:#fdecec;color:#c0342f;border:0;border-radius:8px;width:32px;height:32px;flex:none;cursor:pointer;font-weight:700}
  .warn{color:#c0342f;font-weight:700;font-size:11px}
  .emp{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:15px 16px;margin-bottom:10px}
  .emp .lk{font-size:12.5px;color:var(--soft);word-break:break-all;background:#faf6ee;border:1px solid #efe6d6;border-radius:8px;padding:8px 10px;margin-top:8px;font-family:ui-monospace,Menlo,monospace}
  .emp .pinbig{font-size:20px;font-weight:800;letter-spacing:.14em;color:var(--accent)}
  .cardbox{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px;margin-bottom:16px}
  .cardbox h4{font-family:'Fraunces',Georgia,serif;font-weight:500;font-size:16px;margin-bottom:12px;color:var(--ink)}
  .copy{cursor:pointer;color:var(--accent);font-weight:700;font-size:12.5px;background:none;border:0}
  .flex{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
  @media(max-width:560px){.stats{grid-template-columns:1fr 1fr}.hideSm{display:none}}
</style>
</head>
<body>
<div id="root" class="wrap"></div>

<script>
const KEY = <?= json_encode($k) ?>;
const ADMIN_KEY = <?= json_encode(ADMIN_KEY) ?>;
const MK = '<svg viewBox="0 0 44 44" width="22" height="22" fill="none"><rect x="10" y="12" width="24" height="17" rx="3" stroke="#fff" stroke-width="2.4"/><path d="M17 33h10M22 29v4" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M16 19 Q22 26 28 19" stroke="'+<?= json_encode($A) ?>+'" stroke-width="2.8" stroke-linecap="round"/></svg>';
const root = document.getElementById('root');
let ME = null;

async function api(action, data={}){
  const body = new URLSearchParams({action, k:KEY, ...data});
  const r = await fetch(location.pathname, {method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body});
  return r.json();
}
const esc = s => (s??'').toString().replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- écran de connexion ---------- */
function loginScreen(first){
  root.innerHTML = `
  <div class="login">
    <div class="mk">${MK}</div>
    <h1>${first?'Choisissez votre code':'Espace sécurisé'}</h1>
    <p>${first?'Définissez un code à 4 chiffres pour protéger votre accès.':'Saisissez votre code à 4 chiffres.'}</p>
    <div class="pin">
      ${[0,1,2,3].map(i=>`<input inputmode="numeric" maxlength="1" data-i="${i}">`).join('')}
    </div>
    <div class="msg" id="msg"></div>
    <button class="btn" id="go">${first?'Enregistrer':'Entrer'}</button>
    <div class="hint">🔒 Votre accès reste privé et confidentiel.</div>
  </div>`;
  const ins = [...document.querySelectorAll('.pin input')];
  ins[0].focus();
  ins.forEach((el,i)=>{
    el.addEventListener('input',()=>{ el.value=el.value.replace(/\D/,''); if(el.value&&i<3)ins[i+1].focus(); });
    el.addEventListener('keydown',e=>{ if(e.key==='Backspace'&&!el.value&&i>0)ins[i-1].focus(); if(e.key==='Enter')submit(); });
  });
  document.getElementById('go').onclick = submit;
  async function submit(){
    const pin = ins.map(x=>x.value).join('');
    if(pin.length<4){document.getElementById('msg').textContent='Entrez les 4 chiffres.';return;}
    const r = await api('login',{pin});
    if(r.ok){ ME=r; boot(); } else { document.getElementById('msg').textContent=r.msg||'Erreur'; ins.forEach(x=>x.value=''); ins[0].focus(); }
  }
}

function header(){
  return `<div class="hd"><div class="mk">${MK}</div><div class="nm">Dent<span class="c">Web</span>Pro</div>
    <div class="who"><span class="hideSm">${esc(ME.name)}</span><button class="out" id="logout">Quitter</button></div></div>`;
}
function bindLogout(){ const b=document.getElementById('logout'); if(b)b.onclick=async()=>{await api('logout');location.reload();}; }

/* ---------- vue COMMERCIAL ---------- */
let FILTER='tous', CVIEW='prospects', SCR=null;
const stOf = p => p.statut || (p.interesse==='oui'?'interesse':'nouveau');
// rendu (lecture seule) du script de vente — partagé admin + commerciaux
function playbookHTML(s){
  s=s||{};
  const intros=(s.intros||[]).map((x,i)=>`<div class="pb-intro"><div class="pb-k"><span class="d">${i+1}</span> ${esc(x.title)}</div><p>${esc(x.text)}</p></div>`).join('');
  const steps=(s.steps||[]).map((x,i)=>`<div class="pb-step"><span class="b">${i+1}</span><h4>${esc(x.title)}</h4><div class="say">${esc(x.text)}</div></div>`).join('');
  const objs=(s.objections||[]).map(o=>`<div class="pb-ob"><div class="said">${esc(o.q)}</div><div class="rep">${esc(o.a)}</div></div>`).join('');
  const rules=(s.rules||[]).map((r,i)=>`<div class="pb-li"><span class="c">${i+1}</span><span>${esc(r)}</span></div>`).join('');
  return `<div class="pb-hero"><span class="eb">Playbook de vente</span><h1>Convaincre sans <em>vendre.</em></h1><p>Passer la secrétaire, éveiller l'intérêt du médecin, et le laisser conclure lui-même qu'il a tout à gagner.</p></div>
    <div class="pb-strat"><div class="l">La stratégie</div><p>${esc(s.strategy||'')}</p></div>
    <div class="pb-sec"><div class="pb-sh"><span class="num">1</span><h3>Passer la secrétaire</h3></div>${intros}</div>
    <div class="pb-sec"><div class="pb-sh"><span class="num">2</span><h3>Le médecin — approche diagnostic</h3></div>${steps}</div>
    <div class="pb-sec"><div class="pb-sh"><span class="num">3</span><h3>Réponses aux objections</h3></div>${objs}</div>
    <div class="pb-rules"><h3>À retenir</h3>${rules}</div>`;
}
function cTabs(active){ return `<div class="tabs" style="margin-bottom:14px">
  <div class="tab ${active==='prospects'?'on':''}" data-cv="prospects">Mes prospects</div>
  <div class="tab ${active==='script'?'on':''}" data-cv="script">📄 Script</div></div>`; }
async function commercialScript(){
  const r=await api('get_script');
  root.innerHTML = header() + cTabs('script') + `<div class="pb">${playbookHTML(r.script)}</div>`;
  bindLogout();
  document.querySelectorAll('.tab[data-cv]').forEach(t=>t.onclick=()=>{CVIEW=t.dataset.cv;commercialView();});
}
const today = () => new Date().toISOString().slice(0,10);
async function commercialView(){
  if(CVIEW==='script') return commercialScript();
  const r = await api('my_list');
  const list = r.prospects||[];
  const cAll = list.filter(p=>stOf(p)!=='pas_interesse').length;
  const cRel = list.filter(p=>stOf(p)!=='pas_interesse' && p.relance && p.relance<=today()).length;
  const cOui = list.filter(p=>stOf(p)==='interesse').length;
  const cNo  = list.filter(p=>stOf(p)==='pas_interesse').length;
  const shown = list.filter(p=>{
    const s=stOf(p);
    if(FILTER==='tous')    return s!=='pas_interesse';
    if(FILTER==='relance') return s!=='pas_interesse' && p.relance && p.relance<=today();
    if(FILTER==='oui')     return s==='interesse';
    if(FILTER==='no')      return s==='pas_interesse';
    return true;
  });
  root.innerHTML = header() + cTabs('prospects') + `
    <div class="chips">
      <div class="chip ${FILTER==='tous'?'on':''}" data-f="tous">Tous <span class="b">${cAll}</span></div>
      <div class="chip ${FILTER==='relance'?'on':''}" data-f="relance">À rappeler <span class="b">${cRel}</span></div>
      <div class="chip ${FILTER==='oui'?'on':''}" data-f="oui">Intéressés <span class="b">${cOui}</span></div>
      <div class="chip ${FILTER==='no'?'on':''}" data-f="no">Pas intéressé <span class="b">${cNo}</span></div>
    </div>
    <div id="cards">${ shown.length? shown.map(cardHTML).join('') : '<div class="empty">Aucun prospect dans cette liste.</div>' }</div>`;
  bindLogout();
  document.querySelectorAll('.tab[data-cv]').forEach(t=>t.onclick=()=>{CVIEW=t.dataset.cv;commercialView();});
  document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{FILTER=c.dataset.f;commercialView();});
  shown.forEach(bindCard);
}
function cardHTML(p){
  const tel=(p.tel||'').replace(/[^\d+]/g,'');
  const s=stOf(p);
  const overdue = p.relance && p.relance<today();
  return `<div class="card ${s==='interesse'?'oui':''} ${s==='pas_interesse'?'no':''}" data-id="${p.id}">
    <div class="top"><div><h3>${esc(p.cabinet)||'—'}</h3><div class="ville">${esc(p.ville)||''}</div></div>
      ${p.source?`<span class="src">${esc(p.source)}</span>`:''}</div>
    ${tel?`<a class="call" href="tel:${esc(tel)}">📞 Appeler <span class="ph">${esc(p.tel)}</span></a>`:''}
    <div class="seg">
      <button class="y ${s==='interesse'?'on':''}" data-v="interesse">👍 Intéressé</button>
      <button class="n ${s==='nouveau'?'on':''}" data-v="nouveau">Pas maintenant</button>
      <button class="r ${s==='pas_interesse'?'on':''}" data-v="pas_interesse">✕ Pas intéressé</button>
    </div>
    <div class="row">
      <div class="fld" style="flex:2"><label>Note</label><textarea data-fld="note" placeholder="Ce qu'il a dit…">${esc(p.note)}</textarea></div>
    </div>
    <div class="row">
      <div class="fld"><label>Rappeler le ${overdue?'<span style="color:#e5484d">(en retard)</span>':''}</label><input class="inp" type="date" data-fld="relance" value="${esc(p.relance)}"></div>
    </div>
    <div class="sold ${p.vendu?'on':''}" data-sold><span class="bx">${p.vendu?'✓':''}</span> Vendu ✅ (390€)</div>
    <div style="text-align:right"><span class="saved" data-saved>Enregistré ✓</span></div>
  </div>`;
}
function bindCard(p){
  const el=document.querySelector(`.card[data-id="${p.id}"]`); if(!el)return;
  const flash=()=>{const s=el.querySelector('[data-saved]');s.classList.add('show');clearTimeout(s._t);s._t=setTimeout(()=>s.classList.remove('show'),1200);};
  const save=async(d)=>{ await api('save_prospect',{id:p.id,...d}); flash(); };
  el.querySelectorAll('.seg button').forEach(b=>b.onclick=async()=>{
    await api('save_prospect',{id:p.id, statut:b.dataset.v});
    commercialView(); // re-render : la carte change de liste (ex. → Pas intéressé)
  });
  el.querySelectorAll('[data-fld]').forEach(f=>{
    f.addEventListener('change',()=>save({[f.dataset.fld]:f.value}));
  });
  const sold=el.querySelector('[data-sold]');
  sold.onclick=async()=>{ p.vendu=!p.vendu; sold.classList.toggle('on',p.vendu); sold.querySelector('.bx').textContent=p.vendu?'✓':''; await save({vendu:p.vendu?'1':'0'}); };
}

/* ---------- vue ADMIN ---------- */
let ATAB='prospects', ADATA=null;
async function adminView(){
  ADATA = await api('admin_data');
  root.innerHTML = header() + `
    <div class="tabs">
      <div class="tab ${ATAB==='prospects'?'on':''}" data-t="prospects">Prospects</div>
      <div class="tab ${ATAB==='equipe'?'on':''}" data-t="equipe">Commerciaux</div>
      <div class="tab ${ATAB==='interesses'?'on':''}" data-t="interesses">Intéressés</div>
      <div class="tab ${ATAB==='stats'?'on':''}" data-t="stats">Stats</div>
      <div class="tab ${ATAB==='script'?'on':''}" data-t="script">Script</div>
    </div><div id="ac"></div>`;
  bindLogout();
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{ATAB=t.dataset.t;adminView();});
  ({prospects:adminProspects, equipe:adminEquipe, interesses:adminInteresses, stats:adminStats, script:adminScript}[ATAB])();
}
function statusTag(p){
  if(p.vendu) return '<span class="tag vendu">Vendu</span>';
  const s=stOf(p);
  if(s==='interesse') return '<span class="tag oui">Intéressé</span>';
  if(s==='pas_interesse') return '<span class="tag no">Pas intéressé</span>';
  return '<span class="tag new">Nouveau</span>';
}
function comName(k){ const c=(ADATA.commerciaux||[]).find(x=>x.key===k); return c?c.name:'—'; }
function comOptions(sel){ return '<option value="">— Non assigné —</option>'+(ADATA.commerciaux||[]).map(c=>`<option value="${c.key}" ${c.key===sel?'selected':''}>${esc(c.name)}</option>`).join(''); }

function adminProspects(){
  const ac=document.getElementById('ac');
  const ps=ADATA.prospects||[], dups=ADATA.dups||[];
  ac.innerHTML = `
    <div class="cardbox"><h4>➕ Ajouter un prospect</h4>
      <div class="row">
        <div class="fld"><label>Cabinet</label><input class="inp" id="np_cab"></div>
        <div class="fld"><label>Ville</label><input class="inp" id="np_ville"></div>
      </div>
      <div class="row">
        <div class="fld"><label>Téléphone</label><input class="inp" id="np_tel"></div>
        <div class="fld"><label>Email</label><input class="inp" id="np_email"></div>
      </div>
      <div class="row">
        <div class="fld"><label>Assigner à</label><select id="np_com">${comOptions('')}</select></div>
        <div class="fld"><label>Source</label><input class="inp" id="np_src" value="Manuel"></div>
      </div>
      <div style="margin-top:12px"><button class="btn sm" id="np_add">Ajouter</button></div>
    </div>
    <div class="cardbox"><h4>📥 Importer une liste (en masse)</h4>
      <div class="hint" style="margin-bottom:8px">Une ligne par cabinet : <b>Cabinet , Ville , Téléphone , Email</b> (séparés par virgule, point-virgule ou tabulation). Copiez-collez depuis Excel / Google Sheets. Les doublons de téléphone sont ignorés.</div>
      <div style="margin-bottom:10px"><label class="btn sec sm" style="cursor:pointer;display:inline-block">📄 Choisir un fichier (.csv)<input type="file" id="imp_file" accept=".csv,.txt" style="display:none"></label>
        <span id="imp_fname" style="font-size:12.5px;color:var(--soft);margin-left:8px"></span>
        <div class="hint" style="margin-top:6px">Sélectionnez le fichier <b>…-import.csv</b> : il est lu automatiquement. (Ou collez le texte ci-dessous.)</div></div>
      <textarea id="imp_raw" style="min-height:120px" placeholder="Cabinet du Sourire, Lyon, 0612345678, contact@ex.fr&#10;Cabinet Dentaire, Paris, 0698765432,"></textarea>
      <div class="row" style="margin-top:10px">
        <div class="fld"><label>Répartition</label><select id="imp_mode">
          <option value="auto">Répartir automatiquement entre les commerciaux</option>
          <option value="one">Assigner à un seul commercial</option>
          <option value="none">Ne pas assigner (plus tard)</option>
        </select></div>
        <div class="fld" id="imp_comwrap" style="display:none"><label>Commercial</label><select id="imp_com">${comOptions('')}</select></div>
      </div>
      <div style="margin-top:12px"><button class="btn sm" id="imp_go">Importer la liste</button></div>
    </div>
    <div class="flex" style="justify-content:space-between;margin:4px 0 10px;gap:8px;flex-wrap:wrap">
      <div style="font-weight:700">${ps.length} prospect(s)</div>
      <div class="flex" style="gap:8px">
        <select class="inp" id="reassign_to" style="width:auto;padding:8px 10px;font-size:13px">${comOptions('')}</select>
        <button class="btn sec sm" id="reassign_sel">➡️ Assigner la sélection</button>
        <button class="btn sec sm" id="exp_all">⬇️ Export Excel</button>
        <button class="btn sec sm" id="del_sel" style="color:#c33">🗑 Supprimer</button>
        <button class="btn sec sm" id="del_all_btn" style="color:#c33">Tout supprimer</button>
      </div>
    </div>
    <div style="overflow-x:auto"><table>
      <tr><th style="width:34px"><input type="checkbox" id="chkAll" title="Tout sélectionner"></th><th>Cabinet</th><th>Téléphone</th><th class="hideSm">Commercial</th><th>Intéressé</th><th></th></tr>
      ${ps.length? ps.map(p=>{
        const dup = dups.includes((p.tel||'').replace(/\D/g,''));
        return `<tr class="${dup?'dup':''}">
          <td><input type="checkbox" class="rowchk" value="${p.id}"></td>
          <td><b>${esc(p.cabinet)||'—'}</b><div style="color:#8a7c5e;font-size:12px">${esc(p.ville)||''}</div></td>
          <td>${esc(p.tel)||'—'} ${dup?'<div class="warn">⚠ doublon</div>':''}</td>
          <td class="hideSm">${esc(comName(p.assignedTo))}</td>
          <td>${statusTag(p)}</td>
          <td class="flex"><button class="copy" data-edit="${p.id}">Modifier</button><button class="copy" style="color:#c33" data-del="${p.id}">✕</button></td>
        </tr>`;}).join('') : '<tr><td colspan="6" style="text-align:center;color:#8a7c5e;padding:30px">Aucun prospect. Ajoutez-en un ci-dessus.</td></tr>'}
    </table></div>`;
  document.getElementById('np_add').onclick=async()=>{
    const d={cabinet:v('np_cab'),ville:v('np_ville'),tel:v('np_tel'),email:v('np_email'),assignedTo:v('np_com'),source:v('np_src')};
    if(!d.cabinet&&!d.tel){alert('Cabinet ou téléphone requis.');return;}
    const r=await api('add_prospect',d); if(r.ok)adminView();
  };
  const impMode=document.getElementById('imp_mode');
  impMode.onchange=()=>{ document.getElementById('imp_comwrap').style.display = impMode.value==='one'?'':'none'; };
  document.getElementById('imp_go').onclick=async()=>{
    const raw=document.getElementById('imp_raw').value.trim();
    if(!raw){alert('Collez une liste d\'abord.');return;}
    const mode=impMode.value;
    const assignedTo = mode==='one' ? document.getElementById('imp_com').value : '';
    if(mode==='one' && !assignedTo){alert('Choisissez un commercial.');return;}
    const r=await api('import_prospects',{raw,mode,assignedTo});
    if(r.ok){ alert('Import terminé ✅\n'+r.added+' prospect(s) ajouté(s)'+(r.skipped?'\n'+r.skipped+' doublon(s) ignoré(s)':'')); adminView(); }
  };
  // charger un fichier (.csv) → remplit la zone de texte automatiquement
  document.getElementById('imp_file').onchange=function(){
    const f=this.files[0]; if(!f)return;
    const rd=new FileReader();
    rd.onload=()=>{ document.getElementById('imp_raw').value=rd.result; document.getElementById('imp_fname').textContent=f.name+' chargé ✓ — cliquez « Importer la liste »'; };
    rd.readAsText(f,'utf-8');
  };
  document.getElementById('exp_all').onclick=()=>exportCSV(ADATA.prospects||[],'prospects');
  document.getElementById('reassign_sel').onclick=async()=>{
    const ids=[...ac.querySelectorAll('.rowchk:checked')].map(c=>c.value);
    if(!ids.length){alert('Cochez d\'abord des prospects.');return;}
    const to=document.getElementById('reassign_to').value;
    const r=await api('reassign_many',{ids:ids.join(','),assignedTo:to});
    if(r.ok){ adminView(); }
  };
  // sélection multiple
  const chkAll=document.getElementById('chkAll');
  if(chkAll) chkAll.onclick=()=>{ ac.querySelectorAll('.rowchk').forEach(c=>c.checked=chkAll.checked); };
  document.getElementById('del_sel').onclick=async()=>{
    const ids=[...ac.querySelectorAll('.rowchk:checked')].map(c=>c.value);
    if(!ids.length){alert('Cochez d\'abord des prospects (ou « tout sélectionner » en haut du tableau).');return;}
    if(confirm('Supprimer '+ids.length+' prospect(s) sélectionné(s) ?')){ await api('del_many',{ids:ids.join(',')}); adminView(); }
  };
  document.getElementById('del_all_btn').onclick=async()=>{
    if(!ps.length){return;}
    if(confirm('⚠️ Supprimer TOUS les '+ps.length+' prospects ? Cette action est irréversible.')){ await api('del_all'); adminView(); }
  };
  ac.querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{ if(confirm('Supprimer ce prospect ?')){await api('del_prospect',{id:b.dataset.del});adminView();} });
  ac.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editProspect(+b.dataset.edit));
}
function editProspect(id){
  const p=(ADATA.prospects||[]).find(x=>x.id===id); if(!p)return;
  const ac=document.getElementById('ac');
  ac.insertAdjacentHTML('afterbegin',`<div class="cardbox" id="edbox" style="border-color:${'<?= $A ?>'}">
    <h4>✏️ Modifier — ${esc(p.cabinet)||'prospect'}</h4>
    <div class="row"><div class="fld"><label>Cabinet</label><input class="inp" id="e_cab" value="${esc(p.cabinet)}"></div>
      <div class="fld"><label>Ville</label><input class="inp" id="e_ville" value="${esc(p.ville)}"></div></div>
    <div class="row"><div class="fld"><label>Téléphone</label><input class="inp" id="e_tel" value="${esc(p.tel)}"></div>
      <div class="fld"><label>Email</label><input class="inp" id="e_email" value="${esc(p.email)}"></div></div>
    <div class="row"><div class="fld"><label>Assigner à</label><select id="e_com">${comOptions(p.assignedTo)}</select></div>
      <div class="fld"><label>Note</label><input class="inp" id="e_note" value="${esc(p.note)}"></div></div>
    <div class="flex" style="margin-top:12px"><button class="btn sm" id="e_save">Enregistrer</button><button class="btn sec sm" id="e_cancel">Annuler</button></div>
  </div>`);
  window.scrollTo(0,0);
  document.getElementById('e_cancel').onclick=()=>document.getElementById('edbox').remove();
  document.getElementById('e_save').onclick=async()=>{
    await api('edit_prospect',{id,cabinet:v('e_cab'),ville:v('e_ville'),tel:v('e_tel'),email:v('e_email'),assignedTo:v('e_com'),note:v('e_note')});
    adminView();
  };
}
function adminEquipe(){
  const ac=document.getElementById('ac');
  const cs=ADATA.commerciaux||[];
  ac.innerHTML=`
    <div class="cardbox"><h4>➕ Ajouter un commercial</h4>
      <div class="flex"><input class="inp" id="ne_name" placeholder="Nom du commercial" style="flex:1;min-width:150px">
      <input class="inp" id="ne_pin" inputmode="numeric" maxlength="6" placeholder="Code (4 chiffres)" style="width:150px">
      <button class="btn sm" id="ne_add">Créer le lien</button></div>
      <div class="hint" style="margin-top:8px">Choisissez le code, ou laissez vide = généré automatiquement. Un lien privé sera créé.</div>
    </div>
    <div class="cardbox"><h4>🔄 Transférer toute une liste d'un commercial à un autre</h4>
      <div class="flex" style="align-items:center">
        <select class="inp" id="tr_from" style="flex:1;min-width:130px">${comOptions('')}</select>
        <span style="font-weight:800;color:var(--accent)">→</span>
        <select class="inp" id="tr_to" style="flex:1;min-width:130px">${comOptions('')}</select>
        <button class="btn sm" id="tr_go">Transférer</button>
      </div>
      <div class="hint" style="margin-top:8px">Déplace TOUS les prospects du 1ᵉʳ commercial vers le 2ᵉ.</div>
    </div>
    <div id="emps">${cs.length? cs.map(empHTML).join('') : '<div class="empty">Aucun commercial. Créez le premier ci-dessus.</div>'}</div>`;
  document.getElementById('tr_go').onclick=async()=>{
    const from=document.getElementById('tr_from').value, to=document.getElementById('tr_to').value;
    if(from===to){alert('Choisissez deux commerciaux différents.');return;}
    const fn=from?comName(from):'Non assigné', tn=to?comName(to):'Non assigné';
    if(confirm('Transférer tous les prospects de « '+fn+' » vers « '+tn+' » ?')){
      const r=await api('transfer_all',{fromKey:from,toKey:to});
      if(r.ok){ adminView(); setTimeout(()=>alert(r.moved+' prospect(s) transféré(s).'),100); }
    }
  };
  document.getElementById('ne_add').onclick=async()=>{
    const name=v('ne_name'); if(!name){alert('Entrez un nom.');return;}
    const pin=document.getElementById('ne_pin').value.replace(/\D/g,'');
    if(pin && pin.length<4){alert('Le code doit avoir au moins 4 chiffres (ou laissez vide).');return;}
    const r=await api('add_emp',{name,pin});
    if(r.ok){ adminView(); setTimeout(()=>alert('Commercial créé ✅\n\nLien : '+linkFor(r.key)+'\nCode : '+r.pin+'\n\nEnvoyez-les au commercial (ils sont aussi affichés dans la liste).'),100); }
  };
  cs.forEach(c=>{
    const box=document.querySelector(`[data-emp="${c.key}"]`); if(!box)return;
    box.querySelector('[data-copy]').onclick=()=>{navigator.clipboard.writeText(linkFor(c.key)+' — Code : '+(c.pinClear||'••••'));box.querySelector('[data-copy]').textContent='Copié ✓';};
    box.querySelector('[data-rename]').onclick=async()=>{
      const name=(prompt('Nouveau nom pour '+c.name+' :', c.name)||'').trim();
      if(!name || name===c.name){return;}
      const r=await api('rename_emp',{empKey:c.key,name}); if(r.ok){adminView();}
    };
    box.querySelector('[data-setpin]').onclick=async()=>{
      const pin=(prompt('Nouveau code pour '+c.name+' (4 chiffres) :')||'').replace(/\D/g,'');
      if(!pin){return;} if(pin.length<4){alert('Au moins 4 chiffres.');return;}
      const r=await api('reset_pin',{empKey:c.key,pin}); if(r.ok){adminView();setTimeout(()=>alert('Code défini : '+r.pin),100);}
    };
    box.querySelector('[data-reset]').onclick=async()=>{ if(confirm('Générer un code ALÉATOIRE pour '+c.name+' ?')){const r=await api('reset_pin',{empKey:c.key});if(r.ok){adminView();setTimeout(()=>alert('Nouveau code : '+r.pin),100);}} };
    box.querySelector('[data-delemp]').onclick=async()=>{ if(confirm('Supprimer '+c.name+' ? Ses prospects deviendront non assignés.')){await api('del_emp',{empKey:c.key});adminView();} };
  });
}
function empHTML(c){
  return `<div class="emp" data-emp="${c.key}">
    <div class="flex"><b style="font-size:15px">${esc(c.name)}</b>
      <span style="margin-left:auto" class="pinbig">Code : ${esc(c.pinClear)||'••••'}</span></div>
    <div class="lk">${esc(linkFor(c.key))}</div>
    <div class="flex" style="margin-top:10px">
      <button class="copy" data-copy>📋 Copier lien + code</button>
      <button class="copy" data-rename>✏️ Renommer</button>
      <button class="copy" data-setpin>🔑 Changer le code</button>
      <button class="copy" data-reset>🔄 Aléatoire</button>
      <button class="copy" style="color:#c33" data-delemp>🗑 Supprimer</button>
    </div>
    ${c.pinClear?'':'<div class="hint" style="margin-top:6px">Code déjà transmis. Utilisez « Nouveau code » si oublié.</div>'}
  </div>`;
}
function adminStats(){
  const ac=document.getElementById('ac');
  const ps=ADATA.prospects||[], cs=ADATA.commerciaux||[];
  const oui=ps.filter(p=>p.interesse==='oui').length, vendus=ps.filter(p=>p.vendu).length;
  const ca=ps.filter(p=>p.vendu).reduce((s,p)=>s+(+p.prix||390),0);
  const conv= ps.length? Math.round(vendus/ps.length*100):0;
  const perCom = cs.map(c=>{const mine=ps.filter(p=>p.assignedTo===c.key);return{name:c.name,n:mine.length,oui:mine.filter(p=>p.interesse==='oui').length,v:mine.filter(p=>p.vendu).length};});
  ac.innerHTML=`
    <div class="stats">
      <div class="stat"><div class="v">${ps.length}</div><div class="l">Prospects</div></div>
      <div class="stat"><div class="v">${oui}</div><div class="l">Intéressés</div></div>
      <div class="stat"><div class="v">${vendus}</div><div class="l">Ventes</div></div>
      <div class="stat acc"><div class="v">${ca.toLocaleString('fr-FR')} €</div><div class="l">Chiffre d'affaires · ${conv}% conv.</div></div>
    </div>
    <div style="overflow-x:auto"><table>
      <tr><th>Commercial</th><th>Prospects</th><th>Intéressés</th><th>Ventes</th></tr>
      ${perCom.length?perCom.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${c.n}</td><td>${c.oui}</td><td>${c.v}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:#8a7c5e;padding:24px">Aucun commercial.</td></tr>'}
    </table></div>`;
}

function adminInteresses(){
  const ac=document.getElementById('ac');
  const hot=(ADATA.prospects||[]).filter(p=>stOf(p)==='interesse');
  ac.innerHTML=`
    <div class="flex" style="justify-content:space-between;margin-bottom:12px">
      <div style="font-weight:700">${hot.length} prospect(s) intéressé(s)</div>
      <button class="btn sec sm" id="exp_int">⬇️ Export Excel</button>
    </div>
    ${hot.length? hot.map(intCard).join('') : '<div class="empty">Aucun prospect intéressé pour le moment.<br>Les fiches remplies sur le site apparaissent ici automatiquement, et les prospects marqués « Intéressé » par vos commerciaux.</div>'}`;
  document.getElementById('exp_int').onclick=()=>exportCSV(hot,'interesses');
  hot.forEach(p=>{ const b=document.querySelector(`[data-fiche="${p.id}"]`); if(b)b.onclick=()=>{const d=document.getElementById('fd-'+p.id);d.style.display=d.style.display==='none'?'block':'none';}; });
}
function intCard(p){
  const tel=(p.tel||'').replace(/[^\d+]/g,'');
  const isFiche = p.source==='Fiche' && p.fiche && Object.keys(p.fiche).length;
  const details = isFiche? `<div id="fd-${p.id}" style="display:none;margin-top:10px;border-top:1px solid var(--line);padding-top:10px">
    ${Object.entries(p.fiche).map(([kk,vv])=>`<div style="display:flex;gap:10px;padding:5px 0;font-size:13px"><b style="min-width:150px;color:#9a8f78">${esc(kk)}</b><span>${esc(vv)}</span></div>`).join('')}</div>`:'';
  return `<div class="cardbox">
    <div class="flex" style="justify-content:space-between;align-items:flex-start">
      <div><b style="font-size:16px">${esc(p.cabinet)||'—'}</b> ${p.source==='Fiche'?'<span class="tag oui">Fiche site</span>':`<span class="src">${esc(p.source)}</span>`}
        <div style="color:#8a7c5e;font-size:13px;margin-top:2px">${esc(p.ville)||''}</div></div>
      <div style="text-align:right;font-size:13px">
        ${tel?`<a href="tel:${esc(tel)}" style="color:var(--ink);font-weight:700;text-decoration:none">📞 ${esc(p.tel)}</a>`:''}
        ${p.email?`<div><a href="mailto:${esc(p.email)}" style="color:var(--soft);text-decoration:none">${esc(p.email)}</a></div>`:''}
        <div style="color:#8a7c5e;margin-top:2px">Commercial : ${esc(comName(p.assignedTo))}</div>
      </div>
    </div>
    ${p.note?`<div style="margin-top:8px;font-size:13.5px;color:#5b5348">${esc(p.note)}</div>`:''}
    ${isFiche?`<button class="copy" data-fiche="${p.id}" style="margin-top:8px">📋 Voir la fiche complète</button>`:''}
    ${details}
  </div>`;
}
function exportCSV(rows, name){
  const cols=[['Cabinet','cabinet'],['Ville','ville'],['Téléphone','tel'],['Email','email'],['Source','source'],
    ['Commercial',p=>comName(p.assignedTo)],
    ['Statut',p=>({nouveau:'Nouveau',interesse:'Intéressé',pas_interesse:'Pas intéressé'}[stOf(p)]||'')],
    ['Vendu',p=>p.vendu?'Oui':'Non'],['Prix',p=>p.vendu?(p.prix||390):''],['Note','note'],['Relance','relance']];
  const cell=s=>{s=(s==null?'':''+s);return /[";\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;};
  const lines=[cols.map(c=>c[0]).join(';')];
  rows.forEach(p=>lines.push(cols.map(c=>cell(typeof c[1]==='function'?c[1](p):p[c[1]])).join(';')));
  const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='dentwebpro-'+name+'-'+today()+'.csv'; a.click();
}
async function adminScript(){
  const ac=document.getElementById('ac');
  const r=await api('get_script'); SCR=r.script||{};
  ac.innerHTML=`<div class="flex" style="justify-content:space-between;margin-bottom:14px;gap:8px">
    <div style="font-weight:700">Script de vente <span style="color:var(--soft);font-weight:400;font-size:13px">— lecture seule pour les commerciaux</span></div>
    <button class="btn sm" id="pb_edit">✏️ Modifier</button></div>
    <div class="pb">${playbookHTML(SCR)}</div>`;
  document.getElementById('pb_edit').onclick=()=>adminScriptEdit();
}
function pbPair(list,a,b,va,vb,pa,pb){ return `<div class="pbrow" data-list="${list}"><div class="col"><input data-f="${a}" placeholder="${pa}" value="${esc(va||'')}"><textarea data-f="${b}" placeholder="${pb}">${esc(vb||'')}</textarea></div><button class="del" title="Supprimer">✕</button></div>`; }
function pbRule(v){ return `<div class="pbrow" data-list="rules"><div class="col"><textarea data-f="text" placeholder="Règle…">${esc(v||'')}</textarea></div><button class="del" title="Supprimer">✕</button></div>`; }
function adminScriptEdit(){
  const ac=document.getElementById('ac'); const s=SCR||{};
  ac.innerHTML=`
    <div class="cardbox"><h4>🎯 Stratégie</h4><textarea class="inp" id="pb_strategy" style="min-height:80px">${esc(s.strategy||'')}</textarea></div>
    <div class="cardbox"><h4>1 · Intros (secrétaire)</h4><div id="L_intros">${(s.intros||[]).map(x=>pbPair('intros','title','text',x.title,x.text,'Titre','Phrase à dire')).join('')}</div><button class="btn sec sm" data-add="intros">＋ Ajouter</button></div>
    <div class="cardbox"><h4>2 · Étapes (médecin)</h4><div id="L_steps">${(s.steps||[]).map(x=>pbPair('steps','title','text',x.title,x.text,'Titre','Phrase à dire')).join('')}</div><button class="btn sec sm" data-add="steps">＋ Ajouter</button></div>
    <div class="cardbox"><h4>3 · Objections</h4><div id="L_objections">${(s.objections||[]).map(x=>pbPair('objections','q','a',x.q,x.a,'Il dit…','Vous répondez…')).join('')}</div><button class="btn sec sm" data-add="objections">＋ Ajouter</button></div>
    <div class="cardbox"><h4>À retenir</h4><div id="L_rules">${(s.rules||[]).map(pbRule).join('')}</div><button class="btn sec sm" data-add="rules">＋ Ajouter</button></div>
    <div class="flex" style="gap:8px"><button class="btn sm" id="pb_save">💾 Enregistrer</button><button class="btn sec sm" id="pb_back">Annuler</button></div>`;
  const bindDel=()=>ac.querySelectorAll('.del').forEach(d=>d.onclick=()=>d.closest('.pbrow').remove());
  ac.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{
    const k=b.dataset.add, box=document.getElementById('L_'+k);
    box.insertAdjacentHTML('beforeend', k==='rules'?pbRule('') : k==='objections'?pbPair('objections','q','a','','','Il dit…','Vous répondez…') : pbPair(k,'title','text','','','Titre','Phrase à dire'));
    bindDel();
  });
  bindDel();
  document.getElementById('pb_back').onclick=()=>adminScript();
  document.getElementById('pb_save').onclick=async()=>{
    const read=(id,fields)=>[...document.querySelectorAll('#'+id+' .pbrow')].map(r=>{const o={};fields.forEach(f=>o[f]=(r.querySelector('[data-f="'+f+'"]').value||'').trim());return o;}).filter(o=>Object.values(o).some(v=>v));
    const script={
      strategy:document.getElementById('pb_strategy').value.trim(),
      intros:read('L_intros',['title','text']),
      steps:read('L_steps',['title','text']),
      objections:read('L_objections',['q','a']),
      rules:[...document.querySelectorAll('#L_rules .pbrow textarea')].map(t=>t.value.trim()).filter(Boolean),
    };
    const r=await api('save_script',{script:JSON.stringify(script)});
    if(r.ok){ SCR=script; adminScript(); setTimeout(()=>alert('Script enregistré ✅'),80); }
    else alert('Échec de l\'enregistrement.');
  };
}
function linkFor(k){ return location.origin+location.pathname+'?k='+k; }
function v(id){ return document.getElementById(id).value.trim(); }

/* ---------- démarrage ---------- */
async function boot(){
  if(ME.role==='admin') adminView(); else commercialView();
}
async function start(){
  if(!KEY){
    root.innerHTML=`<div class="login"><div class="mk">${MK}</div><h1>Espace commercial</h1>
      <p>Ouvrez le lien privé qui vous a été communiqué pour accéder à votre espace.</p></div>`;
    return;
  }
  const r = await api('me');
  if(r.ok){ ME=r; boot(); return; }
  // pas de session : vérifier le lien puis demander le code
  const st = await api('status');
  if(!st.exists){
    root.innerHTML=`<div class="login"><div class="mk">${MK}</div><h1>Lien invalide</h1>
      <p>Ce lien n'existe pas ou a été supprimé. Demandez votre lien à l'administrateur.</p></div>`;
    return;
  }
  loginScreen(!!st.needsSetup); // admin 1ʳᵉ fois = définir son code
}
start();
</script>
</body>
</html>
