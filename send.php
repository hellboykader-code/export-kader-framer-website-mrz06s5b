<?php
/**
 * DentWebPro — récepteur des formulaires de rendez-vous / contact.
 * Envoie un e-mail professionnel (multipart texte + HTML) DEPUIS
 * contact@dentwebpro.site (DKIM/SPF/DMARC) vers le praticien.
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

$FROM  = 'contact@dentwebpro.site';
$BRAND = 'DentWebPro';
$ACCENT = '#f14e30';

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
    if (isset($data[$n])) {
      $v = is_array($data[$n]) ? implode(', ', $data[$n]) : $data[$n];
      $v = trim((string)$v);
      if ($v !== '') return $v;
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
$replyTo = filter_var($email, FILTER_VALIDATE_EMAIL) ? $email : $FROM;
$cabinet = ucfirst($site);
$subject = trim($data['_subject'] ?? '') ?: ('Nouvelle demande de rendez-vous — '.$cabinet);

/* ---------- version TEXTE ---------- */
$text  = "NOUVELLE DEMANDE DE RENDEZ-VOUS\r\nCabinet : $cabinet (via $BRAND)\r\n";
$text .= str_repeat('-', 40)."\r\n";
if ($fullname) $text .= "Patient   : $fullname\r\n";
if ($tel)      $text .= "Téléphone : $tel\r\n";
if ($email)    $text .= "E-mail    : $email\r\n";
if ($jour||$heure) $text .= "Rendez-vous : ".frDate($jour).($heure?" à $heure":"")."\r\n";
if ($soin)     $text .= "Soin      : $soin\r\n";
if ($message)  $text .= "Message   : $message\r\n";
$text .= str_repeat('-', 40)."\r\n";
$text .= "Répondez à cet e-mail pour contacter le patient.\r\nEnvoyé via $BRAND — dentwebpro.site\r\n";

/* ---------- version HTML (pro, compatible e-mail) ---------- */
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
. '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:28px 12px">'
.   '<tr><td align="center">'
.     '<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(20,20,30,.06)">'
        // header
.       '<tr><td style="background:'.$ACCENT.';padding:22px 30px">'
.         '<table role="presentation" width="100%"><tr>'
.           '<td style="font:800 20px Arial,sans-serif;color:#ffffff;letter-spacing:-.3px">Dent<span style="color:#ffe1d8">WebPro</span></td>'
.           '<td align="right" style="font:600 12px Arial,sans-serif;color:#ffd9cf;text-transform:uppercase;letter-spacing:1px">Nouvelle demande</td>'
.         '</tr></table>'
.       '</td></tr>'
        // title
.       '<tr><td style="padding:30px 30px 6px">'
.         '<div style="font:700 22px Arial,sans-serif;color:#15171b">Demande de rendez-vous</div>'
.         '<div style="font:14px Arial,sans-serif;color:#6c6c74;margin-top:4px">Cabinet <strong style="color:#15171b">'.e($cabinet).'</strong></div>'
.       '</td></tr>'
        // date/time callout
. ($rdvLine ? '<tr><td style="padding:14px 30px 0"><table role="presentation" width="100%" style="background:#fff6f3;border:1px solid #ffd9cf;border-radius:10px"><tr>'
.         '<td style="padding:16px 20px;font:600 12px Arial,sans-serif;color:'.$ACCENT.';text-transform:uppercase;letter-spacing:1px">Créneau souhaité</td>'
.         '<td align="right" style="padding:16px 20px;font:700 18px Arial,sans-serif;color:#15171b">'.e($rdvLine).'</td>'
.       '</tr></table></td></tr>' : '')
        // details
.       '<tr><td style="padding:16px 30px 4px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">'.$rows.'</table></td></tr>'
        // reply button
. ($replyBtn ? '<tr><td style="padding:22px 30px 4px">'.$replyBtn.'</td></tr>' : '')
        // footer
.       '<tr><td style="padding:24px 30px 30px"><div style="border-top:1px solid #eef0f3;padding-top:16px;font:12px Arial,sans-serif;color:#9aa0a6">'
.         'Message envoyé automatiquement depuis le formulaire de votre site.<br>Propulsé par <a href="https://dentwebpro.site" style="color:'.$ACCENT.';text-decoration:none">DentWebPro</a>.'
.       '</div></td></tr>'
.     '</table>'
.   '</td></tr>'
. '</table></body></html>';

/* ---------- envoi multipart ---------- */
$boundary = 'dwp_'.md5(uniqid('', true));
$body  = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$text\r\n\r\n";
$body .= "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n$html\r\n\r\n";
$body .= "--$boundary--\r\n";

$headers  = "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";
$headers .= "From: $BRAND <$FROM>\r\n";
$headers .= "Reply-To: $replyTo\r\n";
$headers .= "X-Mailer: DentWebPro-Mailer\r\n";

$subjectEnc = '=?UTF-8?B?'.base64_encode($subject).'?=';
$ok = @mail($to, $subjectEnc, $body, $headers, '-f'.$FROM);

echo json_encode($ok ? ['success'=>true] : ['success'=>false,'message'=>"L'envoi a échoué, réessayez."]);
if (!$ok) http_response_code(500);
