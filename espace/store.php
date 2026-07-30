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
  function default_script() {
    return [
      'strategy' => "On ne « vend pas un site ». On diagnostique un manque — le cabinet est presque invisible sur Google — et on laisse le médecin comprendre seul qu'il perd des patients. Le prix arrive en dernier, comme une évidence.",
      'intros' => [
        ['title'=>'Le confrère pressé', 'text'=>"« Bonjour, [Prénom] à l'appareil. Vous pourriez me passer le Dr [Nom] deux minutes ? C'est au sujet de la visibilité du cabinet sur Google. »"],
        ['title'=>'La curiosité', 'text'=>"« Je préfère en parler directement au Dr [Nom] : j'ai regardé la présence en ligne du cabinet, il y a un point qui mérite 2 minutes de son attention. Il est là ? »"],
        ['title'=>'Le service, pas la vente', 'text'=>"« Ce n'est pas commercial, c'est technique : une question rapide pour le Dr [Nom] au sujet de la fiche du cabinet sur internet. Vous me le passez ? »"],
        ['title'=>'On rend service', 'text'=>"« Je serai très bref. On accompagne des cabinets du secteur sur leur image en ligne, et j'ai remarqué quelque chose sur celui du Dr [Nom]. Je peux lui en toucher un mot ? »"],
        ['title'=>'Si elle bloque', 'text'=>"« Je comprends qu'il soit occupé. Quel est le meilleur moment pour le joindre 2 min — fin de matinée ou fin de journée ? » Si « envoyez un mail » → prenez l'email ET fixez un rappel."],
      ],
      'steps' => [
        ['title'=>'Constat + question', 'text'=>"« Docteur, rapidement : aujourd'hui 8 patients sur 10 cherchent leur dentiste sur Google avant d'appeler. J'ai regardé — votre cabinet n'apparaît quasiment pas. Vous en aviez conscience ? »"],
        ['title'=>'Enfoncer le clou', 'text'=>"« Le souci, c'est que ces nouveaux patients ne vous trouvent pas… et vont chez le confrère d'à côté, bien référencé. C'est du patient qui part chaque semaine, sans que vous le voyiez. »"],
        ['title'=>'La solution comme une évidence', 'text'=>"« Justement, on est spécialisés uniquement dans les cabinets dentaires. On s'occupe de tout — site pro, référencé sur Google, avec votre logo, livré en 3 jours. Une seule fois, à la livraison, hébergement gratuit à vie. Vous ne payez que si le résultat vous plaît. »"],
        ['title'=>'Clôture douce', 'text'=>"« Le plus simple : je vous envoie un exemple qu'on a fait pour un autre cabinet, vous jugez sur pièces. Je vous le mets sur quel email ? »"],
      ],
      'objections' => [
        ['q'=>'J\'ai déjà Doctolib', 'a'=>"« Parfait pour les rendez-vous. Mais Doctolib, c'est la page de tout le monde. Votre site, c'est vous — et c'est lui qui vous fait monter sur Google. »"],
        ['q'=>'Je n\'ai pas le temps', 'a'=>"« C'est justement notre travail : vous n'avez rien à faire. Vous regardez juste l'exemple, 2 minutes. »"],
        ['q'=>'C\'est combien ?', 'a'=>"« Bien plus intéressant qu'une agence : une seule fois, hébergement gratuit à vie, et vous ne payez qu'à la livraison. Un seul nouveau patient rembourse déjà le site. »"],
        ['q'=>'Je vais réfléchir', 'a'=>"« Bien sûr, sans engagement. Je vous envoie l'exemple, vous regardez tranquillement, et je rappelle vendredi. »"],
        ['q'=>'Le docteur décide', 'a'=>"« Bien sûr ! C'est lui que j'aimerais informer. Je laisse mon exemple par mail et je rappelle quand il est disponible. »"],
      ],
      'rules' => [
        "Appel 1 = curiosité + email + rappel. On ne vend pas encore.",
        "Appel 2 = on montre l'exemple, puis on conclut la vente.",
        "Après chaque appel : Intéressé / Pas intéressé + Note + « Rappeler le ».",
        "Honnêteté sur l'offre au moment de conclure : la confiance, c'est ce qui vend.",
      ],
    ];
  }
  function db_load() {
    db_boot();
    $j = json_decode(file_get_contents(DB_FILE), true);
    if (!is_array($j)) $j = [];
    $j += ['employees' => [], 'prospects' => [], 'seq' => 1, 'fails' => [], 'script' => default_script()];
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
