<?php
/**
 * DentWebPro — récepteur des formulaires (rendez-vous + fiche de renseignements).
 * Envoie un e-mail professionnel DEPUIS contact@dentwebpro.site (DKIM/SPF/DMARC).
 * Gère les pièces jointes (logo / photos) pour la fiche cabinet.
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['success' => false, 'message' => 'Méthode non autorisée']); exit;
}

$FROM   = 'contact@dentwebpro.site';
$BRAND  = 'DentWebPro';
$ACCENT = '#f55733';

$RECIPIENTS = [
  'sereine'=>'kaderhb33@gmail.com','blanche'=>'kaderhb33@gmail.com','eclat'=>'kaderhb33@gmail.com',
  'olea'=>'kaderhb33@gmail.com','noveo'=>'kaderhb33@gmail.com','zenta'=>'kaderhb33@gmail.com',
  'reddent'=>'kaderhb33@gmail.com','dentitive'=>'kaderhb33@gmail.com',
  'fiche'=>'contact@dentwebpro.site','demo'=>'contact@dentwebpro.site','studio'=>'contact@dentwebpro.site',
  'test'=>'kaderhb33@gmail.com',
];

$ctype = $_SERVER['CONTENT_TYPE'] ?? '';
$data = (stripos($ctype, 'application/json') !== false)
  ? (json_decode(file_get_contents('php://input'), true) ?: [])
  : $_POST;

if (!empty($data['_honey']) || !empty($data['_gotcha'])) { echo json_encode(['success'=>true]); exit; }

$site = strtolower(trim($data['site'] ?? ''));
if ($site === '' || !isset($RECIPIENTS[$site])) {
  http_response_code(400);
  echo json_encode(['success'=>false,'message'=>'Site non reconnu']); exit;
}
$to = $RECIPIENTS[$site];

/* --- helpers --- */
function pick($data, $names) {
  foreach ($names as $n) {
    // PHP transforme les espaces des noms de champ en « _ » ($_POST) → tester les 2 variantes
    foreach ([$n, str_replace(' ', '_', $n)] as $key) {
      if (isset($data[$key])) {
        $v = is_array($data[$key]) ? implode(', ', $data[$key]) : $data[$key];
        $v = trim((string)$v);
        if ($v !== '') return $v;
      }
    }
  }
  return '';
}
function e($s){ return htmlspecialchars($s, ENT_QUOTES, 'UTF-8'); }
function frDate($d){
  if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $d, $m)) {
    $mois = [1=>'janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
    return intval($m[3]).' '.$mois[intval($m[2])].' '.$m[1];
  }
  return $d;
}

/* --- pièces jointes (fiche : logo + photos) --- */
$attachments = [];
if (!empty($_FILES)) {
  foreach ($_FILES as $f) {
    if (is_array($f['name'])) {
      $n = count($f['name']);
      for ($i=0;$i<$n;$i++){
        if (($f['error'][$i] ?? 4)===UPLOAD_ERR_OK && is_uploaded_file($f['tmp_name'][$i])) {
          $attachments[] = ['name'=>$f['name'][$i], 'type'=>($f['type'][$i] ?: 'application/octet-stream'), 'data'=>file_get_contents($f['tmp_name'][$i])];
        }
      }
    } else {
      if (($f['error'] ?? 4)===UPLOAD_ERR_OK && is_uploaded_file($f['tmp_name'])) {
        $attachments[] = ['name'=>$f['name'], 'type'=>($f['type'] ?: 'application/octet-stream'), 'data'=>file_get_contents($f['tmp_name'])];
      }
    }
  }
}

/* ---------- construction du corps (texte + HTML) selon le type ---------- */
if ($site === 'fiche') {
  /* ===== FICHE DE RENSEIGNEMENTS : liste complète des champs ===== */
  $skip = ['site','_subject','_honey','_gotcha','_template','_captcha','_next','_replyto'];
  $cabinet  = pick($data, ['Nom du cabinet']);
  $cabEmail = pick($data, ['Email du cabinet','Email reception RDV']);
  $subject  = 'Nouvelle fiche cabinet'.($cabinet ? ' — '.$cabinet : '').' — '.$BRAND;
  $replyTo  = $FROM; // rester sur le domaine (évite le filtre spam sortant Namecheap)

  // ⭐ Enregistrer les fichiers sur le serveur et envoyer des LIENS (e-mail léger).
  //    Les pièces jointes lourdes (logo + photos) faisaient filtrer/rejeter l'e-mail
  //    comme spam. On sauvegarde dans /uploads/ et on met des liens de téléchargement.
  $uploadLinks = [];
  if (!empty($attachments)) {
    $dir = __DIR__.'/uploads';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    if (!file_exists($dir.'/index.html')) @file_put_contents($dir.'/index.html', '<!doctype html><title>.</title>');
    foreach ($attachments as $a) {
      $safe = preg_replace('/[^A-Za-z0-9._-]+/', '_', $a['name']);
      $fn = date('Ymd-His').'-'.substr(md5(uniqid('', true)),0,6).'-'.$safe;
      if (@file_put_contents($dir.'/'.$fn, $a['data']) !== false) {
        $uploadLinks[] = ['name'=>$a['name'], 'url'=>'https://dentwebpro.site/uploads/'.$fn];
      }
    }
    $attachments = []; // ne PAS joindre : e-mail léger, passe les filtres
  }

  $text = "NOUVELLE FICHE CABINET".($cabinet ? " — $cabinet" : "")."\r\n".str_repeat('-',44)."\r\n";
  $rows = '';
  foreach ($data as $k => $v) {
    if (in_array($k, $skip, true)) continue;
    $val = is_array($v) ? implode(', ', $v) : (string)$v;
    $val = trim($val);
    if ($val === '') continue;
    $label = str_replace('_', ' ', trim($k)); // ré-afficher les espaces (PHP les a remplacés par « _ »)
    $text .= $label.' : '.$val."\r\n";
    $rows .= '<tr>'
      .'<td style="padding:10px 0;border-bottom:1px solid #eef0f3;font:600 12px Arial,sans-serif;letter-spacing:.4px;color:#9aa0a6;width:200px;vertical-align:top">'.e($label).'</td>'
      .'<td style="padding:10px 0;border-bottom:1px solid #eef0f3;font:14px Arial,sans-serif;color:#15171b">'.nl2br(e($val)).'</td></tr>';
  }
  if (!empty($uploadLinks)) {
    $text .= "Fichiers joints :\r\n";
    foreach ($uploadLinks as $l) { $text .= '  - '.$l['name'].' : '.$l['url']."\r\n"; }
  }
  $text .= str_repeat('-',44)."\r\n".($cabEmail ? "Répondre au cabinet : $cabEmail\r\n" : "")."Envoyé via $BRAND — dentwebpro.site\r\n";

  $attNote = '';
  if (!empty($uploadLinks)) {
    $items = '';
    foreach ($uploadLinks as $l) { $items .= '<div style="margin-top:6px">↳ <a href="'.e($l['url']).'" style="color:'.$ACCENT.';font-weight:600;text-decoration:none">'.e($l['name']).'</a></div>'; }
    $attNote = '<tr><td colspan="2" style="padding:16px 0 0"><div style="background:#fff6f3;border:1px solid #ffd9cf;border-radius:8px;padding:13px 15px;font:13px Arial,sans-serif;color:#15171b"><b>📎 Fichiers joints (cliquez pour télécharger)</b>'.$items.'</div></td></tr>';
  }
  $html = '<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">'
    .'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:28px 12px"><tr><td align="center">'
    .'<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(20,20,30,.06)">'
    .'<tr><td style="background:'.$ACCENT.';padding:22px 30px;font:700 18px Arial,sans-serif;color:#fff">DentWebPro — Nouvelle fiche cabinet</td></tr>'
    .'<tr><td style="padding:26px 30px 6px">'
    .'<div style="font:700 20px Arial,sans-serif;color:#15171b">'.e($cabinet ?: 'Fiche de renseignements').'</div>'
    .($cabEmail ? '<div style="font:14px Arial,sans-serif;color:#6c6c74;margin-top:4px">Cabinet : <a href="mailto:'.e($cabEmail).'" style="color:'.$ACCENT.';text-decoration:none">'.e($cabEmail).'</a></div>' : '')
    .'</td></tr>'
    .'<tr><td style="padding:12px 30px 30px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'.$rows.$attNote.'</table></td></tr>'
    .'</table></td></tr></table></body></html>';

} else {
  /* ===== RENDEZ-VOUS ===== */
  $prenom  = pick($data, ['Prénom','Prenom','prenom','patient_name']);
  $nom     = pick($data, ['Nom','nom','patient_lastname']);
  $tel     = pick($data, ['Téléphone','Telephone','tel','Phone','patient_phone']);
  $email   = pick($data, ['E-mail','Email','email','Mail','patient_email']);
  $jour    = pick($data, ['Jour','Date','date']);
  $heure   = pick($data, ['Heure','Time','heure','time']);
  $soin    = pick($data, ['Soin','Soins','Service','Service souhaité','service']);
  $message = pick($data, ['Message','message','reason','Text Area']);

  $fullname = trim($prenom.' '.$nom);
  if ($fullname === '') $fullname = $email ?: 'Nouveau contact';
  $replyTo = $FROM; // même domaine = évite le motif "phishing" filtré en spam
  $cabinet = ucfirst($site);
  $subject = trim($data['_subject'] ?? '') ?: ('Nouvelle demande de rendez-vous — '.$cabinet);

  $text  = "NOUVELLE DEMANDE DE RENDEZ-VOUS\r\nCabinet : $cabinet (via $BRAND)\r\n".str_repeat('-', 40)."\r\n";
  if ($fullname) $text .= "Patient   : $fullname\r\n";
  if ($tel)      $text .= "Téléphone : $tel\r\n";
  if ($email)    $text .= "E-mail    : $email\r\n";
  if ($jour||$heure) $text .= "Rendez-vous : ".frDate($jour).($heure?" à $heure":"")."\r\n";
  if ($soin)     $text .= "Soin      : $soin\r\n";
  if ($message)  $text .= "Message   : $message\r\n";
  $text .= str_repeat('-', 40)."\r\nRépondez à cet e-mail pour contacter le patient.\r\nEnvoyé via $BRAND — dentwebpro.site\r\n";

  $rows = '';
  $cell = function($label,$val,$link='') {
    if ($val==='') return '';
    $v = $link ? '<a href="'.$link.'" style="color:#15171b;text-decoration:none">'.e($val).'</a>' : e($val);
    return '<tr>'
      .'<td style="padding:11px 0;border-bottom:1px solid #eef0f3;font:600 12px Arial,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:#9aa0a6;width:130px;vertical-align:top">'.e($label).'</td>'
      .'<td style="padding:11px 0;border-bottom:1px solid #eef0f3;font:15px Arial,sans-serif;color:#15171b">'.$v.'</td></tr>';
  };
  $rows .= $cell('Patient', $fullname);
  $rows .= $cell('Téléphone', $tel, $tel?('tel:'.preg_replace('/[^\d+]/','',$tel)):'');
  $rows .= $cell('E-mail', $email, $email?('mailto:'.$email):'');
  $rows .= $cell('Soin souhaité', $soin);
  if ($message) {
    $rows .= '<tr><td colspan="2" style="padding:14px 0 2px;font:600 12px Arial,sans-serif;letter-spacing:.5px;text-transform:uppercase;color:#9aa0a6">Message</td></tr>'
          .'<tr><td colspan="2" style="padding:0 0 6px;font:15px/1.5 Arial,sans-serif;color:#3a3a42">'.nl2br(e($message)).'</td></tr>';
  }
  $rdvLine = trim(frDate($jour).($heure ? ' · '.$heure : ''));
  $replyBtn = filter_var($email, FILTER_VALIDATE_EMAIL)
    ? '<a href="mailto:'.e($email).'?subject='.rawurlencode('Votre rendez-vous — '.$cabinet).'" style="display:inline-block;background:'.$ACCENT.';color:#ffffff;text-decoration:none;font:600 15px Arial,sans-serif;padding:13px 26px;border-radius:8px">Répondre à '.e($prenom ?: 'le patient').'</a>'
    : '';

  $html = '<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">'
  . '<div style="display:none;max-height:0;overflow:hidden;opacity:0">Nouvelle demande de rendez-vous'.($fullname?' de '.e($fullname):'').($rdvLine?' — '.e($rdvLine):'').'</div>'
  . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:28px 12px"><tr><td align="center">'
  .   '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(20,20,30,.06)">'
  .       '<tr><td bgcolor="'.$ACCENT.'" style="background:'.$ACCENT.';line-height:0;font-size:0">'
  .         '<img src="https://dentwebpro.site/assets/email/header.gif" width="600" alt="DentWebPro — Nouvelle demande" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;text-decoration:none">'
  .       '</td></tr>'
  .       '<tr><td style="padding:30px 30px 6px">'
  .         '<div style="font:700 22px Arial,sans-serif;color:#15171b">Demande de rendez-vous</div>'
  .         '<div style="font:14px Arial,sans-serif;color:#6c6c74;margin-top:4px">Cabinet <strong style="color:#15171b">'.e($cabinet).'</strong></div>'
  .       '</td></tr>'
  . ($rdvLine ? '<tr><td style="padding:14px 30px 0"><table role="presentation" width="100%" style="background:#fff6f3;border:1px solid #ffd9cf;border-radius:10px"><tr>'
  .         '<td style="padding:16px 20px;font:600 12px Arial,sans-serif;color:'.$ACCENT.';text-transform:uppercase;letter-spacing:1px">Créneau souhaité</td>'
  .         '<td align="right" style="padding:16px 20px;font:700 18px Arial,sans-serif;color:#15171b">'.e($rdvLine).'</td>'
  .       '</tr></table></td></tr>' : '')
  .       '<tr><td style="padding:16px 30px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'.$rows.'</table></td></tr>'
  . ($replyBtn ? '<tr><td style="padding:22px 30px 4px">'.$replyBtn.'</td></tr>' : '')
  .       '<tr><td style="padding:24px 30px 30px"><div style="border-top:1px solid #eef0f3;padding-top:16px;font:12px Arial,sans-serif;color:#9aa0a6">'
  .         'Message envoyé automatiquement depuis le formulaire de votre site — DentWebPro.'
  .       '</div></td></tr>'
  .     '</table>'
  .   '</td></tr></table></body></html>';
}

/* ---------- assemblage (alternative + pièces jointes éventuelles) ---------- */
$alt = 'alt_'.md5(uniqid('', true));
$altBody  = "--$alt\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$text\r\n\r\n";
$altBody .= "--$alt\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$html\r\n\r\n";
$altBody .= "--$alt--\r\n";

if ($attachments) {
  $mix = 'mix_'.md5(uniqid('', true));
  $body  = "--$mix\r\nContent-Type: multipart/alternative; boundary=\"$alt\"\r\n\r\n$altBody\r\n";
  foreach ($attachments as $a) {
    $fn = preg_replace('/[\r\n"]/', '', $a['name']);
    $body .= "--$mix\r\n";
    $body .= "Content-Type: ".$a['type']."; name=\"$fn\"\r\n";
    $body .= "Content-Transfer-Encoding: base64\r\n";
    $body .= "Content-Disposition: attachment; filename=\"$fn\"\r\n\r\n";
    $body .= chunk_split(base64_encode($a['data']))."\r\n";
  }
  $body .= "--$mix--\r\n";
  $ctypeHeader = "multipart/mixed; boundary=\"$mix\"";
} else {
  $body = $altBody;
  $ctypeHeader = "multipart/alternative; boundary=\"$alt\"";
}

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: $ctypeHeader\r\n";
$headers .= "From: $BRAND <$FROM>\r\n";
$headers .= "Reply-To: $replyTo\r\n";
$headers .= "X-Mailer: PHP\r\n";

$subjectEnc = '=?UTF-8?B?'.base64_encode($subject).'?=';
$ok = @mail($to, $subjectEnc, $body, $headers, '-f'.$FROM);

/* ---------- e-mail de confirmation AU CABINET (fiche uniquement) ---------- */
/* Accusé de réception automatique envoyé à l'adresse e-mail du cabinet, pour
   rassurer le praticien : « Nous avons bien reçu votre fiche. » */
if ($site === 'fiche' && !empty($cabEmail) && filter_var($cabEmail, FILTER_VALIDATE_EMAIL)) {
  $cName = $cabinet ?: 'votre cabinet';
  $cSubject = 'Nous avons bien reçu votre fiche — '.$BRAND;

  $cText = "Bonjour,\r\n\r\n"
    ."Merci ! Nous avons bien reçu la fiche de renseignements".($cabinet ? " de $cabinet" : "").".\r\n"
    ."Notre équipe étudie vos informations et revient vers vous très vite pour lancer la conception de votre site.\r\n\r\n"
    ."Si vous souhaitez ajouter un détail ou une photo, répondez simplement à cet e-mail.\r\n\r\n"
    ."À très bientôt,\r\nL'équipe $BRAND\r\ncontact@dentwebpro.site — dentwebpro.site\r\n";

  $cHtml = '<!doctype html><html><body style="margin:0;padding:0;background:#f4f5f7">'
    .'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:28px 12px"><tr><td align="center">'
    .'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(20,20,30,.06)">'
    .'<tr><td style="background:'.$ACCENT.';padding:22px 30px;font:700 18px Arial,sans-serif;color:#fff">DentWebPro</td></tr>'
    .'<tr><td style="padding:30px 30px 6px">'
    .'<div style="font:700 22px Arial,sans-serif;color:#15171b">Votre fiche est bien reçue ✅</div>'
    .'<div style="font:15px/1.6 Arial,sans-serif;color:#3a3a42;margin-top:14px">Bonjour,<br><br>'
    .'Merci d\'avoir rempli la fiche de renseignements'.($cabinet ? ' de <strong style="color:#15171b">'.e($cabinet).'</strong>' : '').'. '
    .'Notre équipe étudie vos informations et revient vers vous très vite pour lancer la conception de votre site.</div>'
    .'</td></tr>'
    .'<tr><td style="padding:18px 30px 4px"><div style="background:#fff6f3;border:1px solid #ffd9cf;border-radius:10px;padding:16px 18px;font:14px/1.6 Arial,sans-serif;color:#15171b">'
    .'Une question, un détail ou une photo à ajouter ? <strong>Répondez simplement à cet e-mail.</strong></div></td></tr>'
    .'<tr><td style="padding:24px 30px 30px"><div style="border-top:1px solid #eef0f3;padding-top:16px;font:13px Arial,sans-serif;color:#9aa0a6">'
    .'À très bientôt,<br>L\'équipe DentWebPro — <a href="https://dentwebpro.site" style="color:'.$ACCENT.';text-decoration:none">dentwebpro.site</a>'
    .'</div></td></tr>'
    .'</table></td></tr></table></body></html>';

  $cAlt = 'alt_'.md5(uniqid('', true));
  $cBody  = "--$cAlt\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$cText\r\n\r\n";
  $cBody .= "--$cAlt\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$cHtml\r\n\r\n";
  $cBody .= "--$cAlt--\r\n";

  $cHeaders  = "MIME-Version: 1.0\r\n";
  $cHeaders .= "Content-Type: multipart/alternative; boundary=\"$cAlt\"\r\n";
  $cHeaders .= "From: $BRAND <$FROM>\r\n";
  $cHeaders .= "Reply-To: $FROM\r\n";
  $cHeaders .= "X-Mailer: PHP\r\n";

  @mail($cabEmail, '=?UTF-8?B?'.base64_encode($cSubject).'?=', $cBody, $cHeaders, '-f'.$FROM);
}

/* ---------- Fiche → Espace commerciaux (prospect « Intéressé ») ---------- */
/* Chaque fiche remplie sur le site crée automatiquement un prospect chaud dans
   l'espace, visible dans l'onglet « Intéressés » de l'admin. Déduplication par
   téléphone (add_prospect_row). N'échoue jamais l'envoi si l'espace n'est pas là. */
if ($site === 'fiche' && is_file(__DIR__.'/espace/store.php')) {
  require_once __DIR__.'/espace/store.php';
  $skipF = ['site','_subject','_honey','_gotcha','_template','_captcha','_next','_replyto'];
  $fiche = [];
  foreach ($data as $fk => $fv) {
    if (in_array($fk, $skipF, true)) continue;
    $fval = is_array($fv) ? implode(', ', $fv) : (string)$fv;
    $fval = trim($fval);
    if ($fval !== '') $fiche[str_replace('_', ' ', $fk)] = $fval; // libellés lisibles
  }
  $telF = pick($data, ['Telephone','Téléphone','tel','Phone','telephone']);
  $noteBits = [];
  foreach (['Praticien principal','Praticien','Slogan / phrase d’accroche','Slogan','Soins','Soins proposés'] as $nk)
    if (!empty($fiche[$nk])) $noteBits[] = $nk.' : '.$fiche[$nk];
  @add_prospect_row([
    'cabinet'   => $cabinet ?: 'Fiche cabinet',
    'ville'     => pick($data, ['Ville','ville']),
    'tel'       => $telF,
    'email'     => $cabEmail,
    'source'    => 'Fiche',
    'interesse' => 'oui',
    'statut'    => 'interesse',
    'note'      => implode(' · ', $noteBits),
    'fiche'     => $fiche,
  ]);
}

echo json_encode($ok ? ['success'=>true] : ['success'=>false,'message'=>"L'envoi a échoué, réessayez."]);
if (!$ok) http_response_code(500);
