<?php
/**
 * DentWebPro — récepteur des formulaires de rendez-vous / contact.
 *
 * Envoie l'e-mail DEPUIS contact@dentwebpro.site (domaine signé DKIM + SPF + DMARC
 * via cPanel « Email Deliverability ») vers le praticien. Format multipart
 * (texte + HTML) pour une meilleure délivrabilité (évite le spam). Aucun service externe.
 *
 * Chaque site poste un champ « site ». On associe ici site -> e-mail du praticien.
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

$FROM  = 'contact@dentwebpro.site';   // expéditeur (domaine vérifié DKIM/SPF)
$BRAND = 'DentWebPro';

/* site  ->  e-mail du praticien destinataire. */
$RECIPIENTS = [
  'sereine'   => 'kaderhb33@gmail.com',
  'blanche'   => 'kaderhb33@gmail.com',
  'eclat'     => 'kaderhb33@gmail.com',
  'olea'      => 'kaderhb33@gmail.com',
  'noveo'     => 'kaderhb33@gmail.com',
  'zenta'     => 'kaderhb33@gmail.com',
  'reddent'   => 'kaderhb33@gmail.com',
  'dentitive' => 'kaderhb33@gmail.com',
  'fiche'     => 'contact@dentwebpro.site',
  'demo'      => 'contact@dentwebpro.site',
  'studio'    => 'contact@dentwebpro.site',
  'test'      => 'kaderhb33@gmail.com',
];

$ctype = $_SERVER['CONTENT_TYPE'] ?? '';
if (stripos($ctype, 'application/json') !== false) {
  $data = json_decode(file_get_contents('php://input'), true) ?: [];
} else {
  $data = $_POST;
}

/* honeypot */
if (!empty($data['_honey']) || !empty($data['_gotcha'])) { echo json_encode(['success' => true]); exit; }

$site = strtolower(trim($data['site'] ?? ''));
if ($site === '' || !isset($RECIPIENTS[$site])) {
  http_response_code(400);
  echo json_encode(['success' => false, 'message' => 'Site non reconnu']); exit;
}
$to = $RECIPIENTS[$site];

$skip = ['site', '_honey', '_gotcha', '_subject', '_captcha', '_template', '_next'];

$replyTo = '';
foreach ($data as $k => $v) {
  if (is_string($v) && preg_match('/mail/i', $k) && filter_var($v, FILTER_VALIDATE_EMAIL)) { $replyTo = $v; break; }
}

/* construire texte + HTML à partir des champs remplis */
$rows = '';
$text = "Nouvelle demande de rendez-vous\r\nCabinet : " . ucfirst($site) . " (via " . $BRAND . ")\r\n\r\n";
$hasContent = false;
foreach ($data as $k => $v) {
  if (in_array($k, $skip, true)) continue;
  if (is_array($v)) $v = implode(', ', $v);
  $v = trim((string) $v);
  if ($v === '') continue;
  $hasContent = true;
  $rows .= '<tr>'
        . '<td style="padding:9px 13px;border:1px solid #e6e8ec;font-weight:600;color:#15171b;background:#f6f7f9;white-space:nowrap">' . htmlspecialchars($k) . '</td>'
        . '<td style="padding:9px 13px;border:1px solid #e6e8ec;color:#333">' . nl2br(htmlspecialchars($v)) . '</td>'
        . '</tr>';
  $text .= $k . ' : ' . $v . "\r\n";
}
if (!$hasContent) {
  http_response_code(400);
  echo json_encode(['success' => false, 'message' => 'Formulaire vide']); exit;
}
if ($replyTo) $text .= "\r\nRépondez directement à cet e-mail pour contacter le patient.\r\n";
$text .= "\r\n-- \r\nMessage envoyé automatiquement depuis le formulaire du site (" . $BRAND . ").\r\n";

$subject = trim($data['_subject'] ?? '') ?: ('Nouvelle demande — ' . ucfirst($site));

$html = '<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;color:#15171b">'
      . '<h2 style="color:#f14e30;margin:0 0 2px">Nouvelle demande de rendez-vous</h2>'
      . '<p style="color:#6c6c74;margin:0 0 16px;font-size:14px">Cabinet : <strong>' . htmlspecialchars(ucfirst($site)) . '</strong> · via ' . $BRAND . '</p>'
      . '<table style="border-collapse:collapse;width:100%;font-size:14px">' . $rows . '</table>'
      . ($replyTo ? '<p style="margin-top:14px;font-size:13px;color:#6c6c74">Répondez directement à cet e-mail pour contacter le patient.</p>' : '')
      . '<hr style="border:none;border-top:1px solid #eee;margin:18px 0">'
      . '<p style="color:#9aa0a6;font-size:12px;margin:0">Message envoyé automatiquement depuis le formulaire du site — ' . $BRAND . '.</p>'
      . '</div>';

/* corps multipart/alternative (texte + HTML) => meilleure délivrabilité */
$boundary = 'dwp_' . md5(uniqid('', true));
$body  = "--$boundary\r\n";
$body .= "Content-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n" . $text . "\r\n\r\n";
$body .= "--$boundary\r\n";
$body .= "Content-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n" . $html . "\r\n\r\n";
$body .= "--$boundary--\r\n";

$headers  = 'MIME-Version: 1.0' . "\r\n";
$headers .= 'Content-Type: multipart/alternative; boundary="' . $boundary . '"' . "\r\n";
$headers .= 'From: ' . $BRAND . ' <' . $FROM . '>' . "\r\n";
$headers .= 'Reply-To: ' . ($replyTo ?: $FROM) . "\r\n";
$headers .= 'X-Mailer: DentWebPro-Mailer' . "\r\n";
$headers .= 'X-Auto-Response-Suppress: All' . "\r\n";

$subjectEnc = '=?UTF-8?B?' . base64_encode($subject) . '?=';

$ok = @mail($to, $subjectEnc, $body, $headers, '-f' . $FROM);

if ($ok) {
  echo json_encode(['success' => true]);
} else {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => "L'envoi a échoué, réessayez."]);
}
