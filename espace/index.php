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
  if ($action === 'add_emp') {
    $name = trim((string)($in['name'] ?? '')); if ($name === '') { echo json_encode(['ok' => false, 'msg' => 'Nom requis.']); exit; }
    $k = gen_key($name); $pin = gen_pin();
    $db['employees'][] = [
      'key' => $k, 'name' => $name, 'role' => 'commercial',
      'pin' => password_hash($pin, PASSWORD_DEFAULT), 'pinClear' => $pin, 'created' => time(),
    ];
    db_save($db);
    echo json_encode(['ok' => true, 'key' => $k, 'pin' => $pin]); exit;
  }
  if ($action === 'reset_pin') {
    $k = $in['empKey'] ?? ''; $pin = gen_pin(); $done = false;
    foreach ($db['employees'] as &$e) if ($e['key'] === $k && $e['role'] === 'commercial') {
      $e['pin'] = password_hash($pin, PASSWORD_DEFAULT); $e['pinClear'] = $pin; $done = true;
    } unset($e);
    if ($done) db_save($db);
    echo json_encode(['ok' => $done, 'pin' => $pin]); exit;
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
      if ($cab === '' && $tel === '') continue;
      $tn = preg_replace('/\D/', '', $tel);
      if ($tn !== '' && isset($existing[$tn])) { $skipped++; continue; }
      if ($tn !== '') $existing[$tn] = 1;
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
<style>
  *{margin:0;box-sizing:border-box;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
  :root{--ink:#17171b;--accent:<?= $A ?>;--soft:#6c6c74;--line:#e7e7ec;--bg:#f5f5f7;--ok:#15a35b}
  body{background:var(--bg);color:var(--ink);-webkit-tap-highlight-color:transparent}
  .wrap{max-width:820px;margin:0 auto;padding:0 14px 90px}
  .hd{position:sticky;top:0;z-index:20;background:var(--ink);color:#fff;margin:0 -14px 16px;padding:14px 18px;display:flex;align-items:center;gap:12px}
  .hd .mk{width:34px;height:34px;border-radius:9px;background:#26262c;display:grid;place-items:center;flex:none}
  .hd .nm{font-weight:800;font-size:16px;letter-spacing:-.02em}
  .hd .nm .c{color:var(--accent)}
  .hd .who{margin-left:auto;font-size:13px;color:#c9c6cf;display:flex;align-items:center;gap:10px}
  .hd .out{color:#fff;background:#ffffff22;border:0;border-radius:8px;padding:7px 12px;font-size:12.5px;font-weight:600;cursor:pointer}
  /* login */
  .login{max-width:400px;margin:8vh auto 0;background:#fff;border:1px solid var(--line);border-radius:18px;padding:32px 26px;text-align:center;box-shadow:0 14px 40px -22px rgba(0,0,0,.4)}
  .login .mk{width:56px;height:56px;border-radius:15px;background:var(--ink);display:grid;place-items:center;margin:0 auto 16px}
  .login h1{font-size:21px;letter-spacing:-.02em}
  .login p{color:var(--soft);font-size:14px;margin:8px 0 22px}
  .pin{display:flex;gap:10px;justify-content:center;margin-bottom:16px}
  .pin input{width:56px;height:64px;text-align:center;font-size:26px;font-weight:700;border:1.5px solid var(--line);border-radius:12px;color:var(--ink)}
  .pin input:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 4px rgba(245,87,51,.13)}
  .msg{min-height:20px;color:#d33;font-size:13.5px;font-weight:600;margin-bottom:8px}
  .btn{font-weight:700;font-size:15px;border:0;border-radius:12px;padding:14px 22px;cursor:pointer;background:var(--accent);color:#fff;width:100%}
  .btn.sec{background:#fff;border:1.5px solid var(--line);color:var(--ink);width:auto}
  .btn.sm{padding:9px 14px;font-size:13.5px;width:auto}
  .hint{color:var(--soft);font-size:12.5px;margin-top:14px}
  /* chips */
  .chips{display:flex;gap:8px;overflow-x:auto;padding:2px 0 12px}
  .chip{flex:none;border:1.5px solid var(--line);background:#fff;border-radius:100px;padding:8px 15px;font-size:13.5px;font-weight:600;color:var(--soft);cursor:pointer}
  .chip.on{background:var(--ink);color:#fff;border-color:var(--ink)}
  .chip .b{display:inline-block;min-width:18px;text-align:center;background:#ececef;color:#555;border-radius:100px;font-size:11px;padding:1px 6px;margin-left:5px}
  .chip.on .b{background:#ffffff33;color:#fff}
  /* cards */
  .card{background:#fff;border:1px solid var(--line);border-radius:15px;padding:16px;margin-bottom:12px;box-shadow:0 2px 10px -6px rgba(0,0,0,.12)}
  .card.oui{border-color:#bfe7cf;box-shadow:0 2px 0 0 #d9f2e3 inset}
  .card .top{display:flex;align-items:flex-start;gap:10px}
  .card h3{font-size:17px;letter-spacing:-.01em}
  .card .ville{color:var(--soft);font-size:13px;margin-top:2px}
  .card .src{margin-left:auto;font-size:11px;font-weight:700;color:var(--soft);background:#f2f2f4;border-radius:100px;padding:3px 9px;white-space:nowrap}
  .call{display:flex;align-items:center;gap:10px;margin:13px 0;background:var(--ink);color:#fff;text-decoration:none;border-radius:11px;padding:12px 15px;font-weight:700;font-size:16px}
  .call .ph{margin-left:auto;font-weight:500;font-size:14px;color:#cfcfd6}
  .seg{display:flex;gap:8px;margin:12px 0;flex-wrap:wrap}
  .seg button{flex:1;min-width:96px;border:1.5px solid var(--line);background:#fff;border-radius:10px;padding:11px 8px;font-weight:700;font-size:13.5px;color:var(--soft);cursor:pointer}
  .seg button.y.on{background:var(--ok);border-color:var(--ok);color:#fff}
  .seg button.n.on{background:#ececef;border-color:#d8d8dd;color:#333}
  .seg button.r.on{background:#e5484d;border-color:#e5484d;color:#fff}
  .card.no{opacity:.62}
  .row{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap}
  .fld{flex:1;min-width:140px;display:flex;flex-direction:column;gap:5px}
  .fld label{font-size:11.5px;font-weight:700;color:var(--soft);text-transform:uppercase;letter-spacing:.04em}
  .inp,textarea,select{border:1.5px solid var(--line);background:#fff;border-radius:10px;padding:11px 13px;font-size:14.5px;color:var(--ink);width:100%;font-family:inherit}
  .inp:focus,textarea:focus,select:focus{border-color:var(--accent);outline:none;box-shadow:0 0 0 4px rgba(245,87,51,.1)}
  textarea{min-height:56px;resize:vertical}
  .sold{display:flex;align-items:center;gap:9px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line);font-size:14px;font-weight:600;color:var(--ink);cursor:pointer;user-select:none}
  .sold .bx{width:22px;height:22px;border-radius:6px;border:2px solid #c3c3cc;flex:none;display:grid;place-items:center;color:#fff;font-size:14px}
  .sold.on .bx{background:var(--ok);border-color:var(--ok)}
  .saved{font-size:12px;color:var(--ok);font-weight:600;opacity:0;transition:opacity .2s}
  .saved.show{opacity:1}
  .empty{text-align:center;color:var(--soft);padding:50px 20px;font-size:15px}
  /* admin */
  .tabs{display:flex;gap:8px;margin-bottom:14px}
  .tab{flex:1;border:1.5px solid var(--line);background:#fff;border-radius:11px;padding:11px;font-weight:700;font-size:14px;color:var(--soft);cursor:pointer;text-align:center}
  .tab.on{background:var(--accent);border-color:var(--accent);color:#fff}
  .stats{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}
  .stat{background:#fff;border:1px solid var(--line);border-radius:14px;padding:15px}
  .stat .v{font-size:26px;font-weight:800;letter-spacing:-.02em}
  .stat .l{font-size:12.5px;color:var(--soft);margin-top:2px}
  .stat.acc{background:var(--ink);color:#fff}.stat.acc .l{color:#c9c6cf}
  table{width:100%;border-collapse:collapse;background:#fff;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13.5px}
  th,td{padding:10px 11px;text-align:left;border-bottom:1px solid var(--line);vertical-align:middle}
  th{background:#fafafb;font-size:11.5px;text-transform:uppercase;letter-spacing:.04em;color:var(--soft)}
  tr.dup td{background:#fff3f0}
  .tag{display:inline-block;font-size:11px;font-weight:700;border-radius:100px;padding:2px 9px}
  .tag.oui{background:#e3f7ec;color:#137a43}.tag.non{background:#f2f2f4;color:#777}
  .tag.vendu{background:#fff0d9;color:#a5680a}
  .tag.new{background:#eef1f6;color:#5b6472}.tag.no{background:#fdecec;color:#c0342f}
  .warn{color:#d33;font-weight:700;font-size:11px}
  .emp{background:#fff;border:1px solid var(--line);border-radius:13px;padding:14px 15px;margin-bottom:10px}
  .emp .lk{font-size:12.5px;color:var(--soft);word-break:break-all;background:#f7f7f8;border-radius:8px;padding:8px 10px;margin-top:8px;font-family:ui-monospace,Menlo,monospace}
  .emp .pinbig{font-size:20px;font-weight:800;letter-spacing:.14em;color:var(--accent)}
  .cardbox{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;margin-bottom:16px}
  .cardbox h4{font-size:14px;margin-bottom:12px}
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
let FILTER='tous';
const stOf = p => p.statut || (p.interesse==='oui'?'interesse':'nouveau');
const today = () => new Date().toISOString().slice(0,10);
async function commercialView(){
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
  root.innerHTML = header() + `
    <div class="chips">
      <div class="chip ${FILTER==='tous'?'on':''}" data-f="tous">Tous <span class="b">${cAll}</span></div>
      <div class="chip ${FILTER==='relance'?'on':''}" data-f="relance">À rappeler <span class="b">${cRel}</span></div>
      <div class="chip ${FILTER==='oui'?'on':''}" data-f="oui">Intéressés <span class="b">${cOui}</span></div>
      <div class="chip ${FILTER==='no'?'on':''}" data-f="no">Pas intéressé <span class="b">${cNo}</span></div>
    </div>
    <div id="cards">${ shown.length? shown.map(cardHTML).join('') : '<div class="empty">Aucun prospect dans cette liste.</div>' }</div>`;
  bindLogout();
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
    </div><div id="ac"></div>`;
  bindLogout();
  document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{ATAB=t.dataset.t;adminView();});
  ({prospects:adminProspects, equipe:adminEquipe, interesses:adminInteresses, stats:adminStats}[ATAB])();
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
    <div class="flex" style="justify-content:space-between;margin:4px 0 10px">
      <div style="font-weight:700">${ps.length} prospect(s)</div>
      <button class="btn sec sm" id="exp_all">⬇️ Export Excel</button>
    </div>
    <div style="overflow-x:auto"><table>
      <tr><th>Cabinet</th><th>Téléphone</th><th class="hideSm">Commercial</th><th>Intéressé</th><th></th></tr>
      ${ps.length? ps.map(p=>{
        const dup = dups.includes((p.tel||'').replace(/\D/g,''));
        return `<tr class="${dup?'dup':''}">
          <td><b>${esc(p.cabinet)||'—'}</b><div style="color:#888;font-size:12px">${esc(p.ville)||''}</div></td>
          <td>${esc(p.tel)||'—'} ${dup?'<div class="warn">⚠ doublon</div>':''}</td>
          <td class="hideSm">${esc(comName(p.assignedTo))}</td>
          <td>${statusTag(p)}</td>
          <td class="flex"><button class="copy" data-edit="${p.id}">Modifier</button><button class="copy" style="color:#c33" data-del="${p.id}">✕</button></td>
        </tr>`;}).join('') : '<tr><td colspan="5" style="text-align:center;color:#888;padding:30px">Aucun prospect. Ajoutez-en un ci-dessus.</td></tr>'}
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
  document.getElementById('exp_all').onclick=()=>exportCSV(ADATA.prospects||[],'prospects');
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
      <div class="flex"><input class="inp" id="ne_name" placeholder="Nom du commercial" style="flex:1;min-width:160px">
      <button class="btn sm" id="ne_add">Créer le lien</button></div>
      <div class="hint" style="margin-top:8px">Un lien privé + un code à 4 chiffres seront générés. Envoyez-les au commercial.</div>
    </div>
    <div id="emps">${cs.length? cs.map(empHTML).join('') : '<div class="empty">Aucun commercial. Créez le premier ci-dessus.</div>'}</div>`;
  document.getElementById('ne_add').onclick=async()=>{
    const name=v('ne_name'); if(!name){alert('Entrez un nom.');return;}
    const r=await api('add_emp',{name});
    if(r.ok){ adminView(); setTimeout(()=>alert('Commercial créé ✅\n\nLien : '+linkFor(r.key)+'\nCode : '+r.pin+'\n\nEnvoyez-les au commercial (ils sont aussi affichés dans la liste).'),100); }
  };
  cs.forEach(c=>{
    const box=document.querySelector(`[data-emp="${c.key}"]`); if(!box)return;
    box.querySelector('[data-copy]').onclick=()=>{navigator.clipboard.writeText(linkFor(c.key)+' — Code : '+(c.pinClear||'••••'));box.querySelector('[data-copy]').textContent='Copié ✓';};
    box.querySelector('[data-reset]').onclick=async()=>{ if(confirm('Générer un nouveau code pour '+c.name+' ?')){const r=await api('reset_pin',{empKey:c.key});if(r.ok){adminView();setTimeout(()=>alert('Nouveau code : '+r.pin),100);}} };
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
      <button class="copy" data-reset>🔄 Nouveau code</button>
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
      ${perCom.length?perCom.map(c=>`<tr><td><b>${esc(c.name)}</b></td><td>${c.n}</td><td>${c.oui}</td><td>${c.v}</td></tr>`).join(''):'<tr><td colspan="4" style="text-align:center;color:#888;padding:24px">Aucun commercial.</td></tr>'}
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
    ${Object.entries(p.fiche).map(([kk,vv])=>`<div style="display:flex;gap:10px;padding:5px 0;font-size:13px"><b style="min-width:150px;color:#777">${esc(kk)}</b><span>${esc(vv)}</span></div>`).join('')}</div>`:'';
  return `<div class="cardbox">
    <div class="flex" style="justify-content:space-between;align-items:flex-start">
      <div><b style="font-size:16px">${esc(p.cabinet)||'—'}</b> ${p.source==='Fiche'?'<span class="tag oui">Fiche site</span>':`<span class="src">${esc(p.source)}</span>`}
        <div style="color:#888;font-size:13px;margin-top:2px">${esc(p.ville)||''}</div></div>
      <div style="text-align:right;font-size:13px">
        ${tel?`<a href="tel:${esc(tel)}" style="color:var(--ink);font-weight:700;text-decoration:none">📞 ${esc(p.tel)}</a>`:''}
        ${p.email?`<div><a href="mailto:${esc(p.email)}" style="color:var(--soft);text-decoration:none">${esc(p.email)}</a></div>`:''}
        <div style="color:#999;margin-top:2px">Commercial : ${esc(comName(p.assignedTo))}</div>
      </div>
    </div>
    ${p.note?`<div style="margin-top:8px;font-size:13.5px;color:#444">${esc(p.note)}</div>`:''}
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
