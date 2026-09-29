#!/usr/bin/env python3
"""Serveur local du site de la mairie de Margency.

Sert les pages comme `python3 -m http.server`, et ajoute une petite API
utilisée par gestion.html pour enregistrer les contenus dans data/*.js
et déposer des images ou des PDF dans assets/uploads/.

Lancement :  python3 serveur.py            (port 8766)
             python3 serveur.py 8800       (autre port)

Avant chaque enregistrement, l'ancienne version du fichier est copiée
dans data/historique/ : rien n'est jamais perdu.
"""
import base64
import json
import os
import re
import shutil
import sys
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RACINE = os.path.dirname(os.path.abspath(__file__))
HISTORIQUE = os.path.join(RACINE, 'data', 'historique')
UPLOADS = os.path.join(RACINE, 'assets', 'uploads')
GARDER = 30  # versions conservées par fichier

# fichier -> (variable globale, commentaire d'en-tête)
FICHIERS = {
    'agenda':   ('AGENDA',   "Agenda de la commune de Margency. Triés par date croissante."),
    'actus':    ('ACTUS',    "Actualités de la commune de Margency. Triées du plus récent au plus ancien."),
    'conseil':  ('CONSEIL',  "Conseil municipal de Margency : séances et élus."),
    'ccas':     ('CCAS',     "Séances du conseil d'administration du CCAS de Margency."),
    'cartes':   ('CARTES',   "Cartes et liens « Découvrir → » affichés sur les pages du site."),
    'services': ('SERVICES', "Rubriques et services du site (page services.html)."),
    'vie-municipale': ('VIE', "Vie municipale : services, publications, budgets, marchés publics, offres d'emploi, collectes."),
    'enfance':  ('ENFANCE',  "Enfance & Éducation : inscriptions, menus, programmes, caisse des écoles."),
    'vivre':    ('VIVRE',    "Vivre à Margency : salles, commerces, santé, sécurité, transports, numéros utiles, cimetière."),
    'urbanisme':('URBA',     "Environnement & Urbanisme : PLU, arrêtés, projets, logements, voies privées, ZAEnR."),
    'culture':  ('CULTURE',  "Sport, loisirs & culture : associations et bibliothèque. Les événements sont dans agenda.js."),
    'accueil':  ('ACCUEIL',  "Écran d'accueil du site : les informations importantes affichées sur la photo de la mairie."),
}
DEMANDES = os.path.join(RACINE, 'data', 'demandes.json')   # demandes envoyées par les habitants, jamais servies telles quelles
EXTENSIONS = {'.webp', '.jpg', '.jpeg', '.png', '.gif', '.pdf'}
TAILLE_MAX = 25 * 1024 * 1024


def nom_propre(nom):
    base, ext = os.path.splitext(os.path.basename(nom))
    base = re.sub(r'[^a-z0-9]+', '-', base.lower().encode('ascii', 'ignore').decode()).strip('-') or 'fichier'
    return base[:60], ext.lower()


def lire_demandes():
    try:
        with open(DEMANDES, encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return []


def ecrire_demandes(liste):
    with open(DEMANDES + '.tmp', 'w', encoding='utf-8') as f:
        json.dump(liste, f, ensure_ascii=False, indent=1)
    os.replace(DEMANDES + '.tmp', DEMANDES)


class Gestion(SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RACINE, **k)

    def end_headers(self):
        # les pages lisent data/*.js et css/base.css : on évite qu'une ancienne
        # version reste en cache (Safari garde les feuilles de style très longtemps)
        if self.path.split('?')[0].endswith(('.js', '.html', '.css')):
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def repondre(self, code, obj):
        corps = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        if self.path == '/api/etat':
            return self.repondre(200, {'ok': True, 'fichiers': list(FICHIERS)})
        if self.path == '/api/demandes':
            return self.repondre(200, {'ok': True, 'demandes': lire_demandes()})
        if self.path.split('?')[0].endswith('demandes.json'):
            return self.repondre(403, {'ok': False, 'erreur': 'Accès refusé.'})
        if self.path == '/api/historique':
            versions = sorted(os.listdir(HISTORIQUE), reverse=True) if os.path.isdir(HISTORIQUE) else []
            return self.repondre(200, {'ok': True, 'versions': versions[:100]})
        return super().do_GET()

    def do_POST(self):
        try:
            longueur = int(self.headers.get('Content-Length') or 0)
            if longueur > TAILLE_MAX * 1.4:
                return self.repondre(413, {'ok': False, 'erreur': 'Fichier trop lourd (25 Mo maximum).'})
            demande = json.loads(self.rfile.read(longueur).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return self.repondre(400, {'ok': False, 'erreur': 'Requête illisible.'})

        if self.path == '/api/enregistrer':
            return self.enregistrer(demande)
        if self.path == '/api/deposer':
            return self.deposer(demande)
        if self.path == '/api/demande':
            return self.nouvelle_demande(demande)
        if self.path == '/api/demande-statut':
            return self.statut_demande(demande)
        return self.repondre(404, {'ok': False, 'erreur': 'Adresse inconnue.'})

    def enregistrer(self, demande):
        nom = demande.get('fichier')
        if nom not in FICHIERS or 'donnees' not in demande:
            return self.repondre(400, {'ok': False, 'erreur': 'Fichier non autorisé.'})
        variable, commentaire = FICHIERS[nom]
        chemin = os.path.join(RACINE, 'data', nom + '.js')

        os.makedirs(HISTORIQUE, exist_ok=True)
        if os.path.exists(chemin):
            horodatage = time.strftime('%Y%m%d-%H%M%S')
            shutil.copy2(chemin, os.path.join(HISTORIQUE, f'{nom}-{horodatage}.js'))
            anciennes = sorted(f for f in os.listdir(HISTORIQUE) if f.startswith(nom + '-'))
            for f in anciennes[:-GARDER]:
                os.remove(os.path.join(HISTORIQUE, f))

        texte = (f'/* {commentaire}\n   Modifié depuis gestion.html le {time.strftime("%d/%m/%Y à %H:%M")}. */\n'
                 f'window.{variable} = ' + json.dumps(demande['donnees'], ensure_ascii=False, indent=1) + ';\n')
        temporaire = chemin + '.tmp'
        with open(temporaire, 'w', encoding='utf-8') as f:
            f.write(texte)
        os.replace(temporaire, chemin)
        return self.repondre(200, {'ok': True})

    def deposer(self, demande):
        base, ext = nom_propre(demande.get('nom', ''))
        if ext not in EXTENSIONS:
            return self.repondre(400, {'ok': False, 'erreur': 'Formats acceptés : images (webp, jpg, png, gif) et PDF.'})
        try:
            contenu = base64.b64decode(demande.get('contenu', '').split(',')[-1])
        except ValueError:
            return self.repondre(400, {'ok': False, 'erreur': 'Fichier illisible.'})
        if len(contenu) > TAILLE_MAX:
            return self.repondre(413, {'ok': False, 'erreur': 'Fichier trop lourd (25 Mo maximum).'})
        os.makedirs(UPLOADS, exist_ok=True)
        nom = f'{int(time.time())}-{base}{ext}'
        with open(os.path.join(UPLOADS, nom), 'wb') as f:
            f.write(contenu)
        taille = len(contenu) / 1024
        return self.repondre(200, {'ok': True, 'url': 'assets/uploads/' + nom,
                                   'taille': f'{taille / 1024:.1f} Mo'.replace('.', ',') if taille >= 1024 else f'{round(taille)} Ko'})

    def nouvelle_demande(self, d):
        champs = ('type', 'nom', 'prenom', 'email', 'telephone', 'date', 'creneau', 'objet', 'message')
        propre = {k: str(d.get(k, '')).strip()[:2000] for k in champs}
        propre['type'] = propre['type'] if propre['type'] in ('salle', 'message') else 'maire'
        requis = ('nom', 'prenom', 'email', 'objet', 'message') if propre['type'] == 'message' else ('nom', 'prenom', 'email', 'date', 'creneau', 'objet')
        if not all(propre[k] for k in requis):
            return self.repondre(400, {'ok': False, 'erreur': 'Merci de remplir tous les champs obligatoires.'})
        if not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', propre['email']):
            return self.repondre(400, {'ok': False, 'erreur': 'Adresse e-mail invalide.'})
        liste = lire_demandes()
        propre.update({'id': f'D{int(time.time() * 1000)}', 'recue': time.strftime('%Y-%m-%dT%H:%M'), 'statut': 'nouvelle'})
        liste.insert(0, propre)
        ecrire_demandes(liste)
        return self.repondre(200, {'ok': True, 'id': propre['id']})

    def statut_demande(self, d):
        liste = lire_demandes()
        if d.get('supprimer'):
            liste = [x for x in liste if x['id'] != d.get('id')]
        else:
            for x in liste:
                if x['id'] == d.get('id') and d.get('statut') in ('nouvelle', 'confirmee', 'refusee', 'traitee'):
                    x['statut'] = d['statut']
        ecrire_demandes(liste)
        return self.repondre(200, {'ok': True})

    def log_message(self, fmt, *args):
        if self.path.startswith('/api/') and self.command == 'POST':
            sys.stderr.write('%s  %s\n' % (time.strftime('%H:%M:%S'), fmt % args))


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8766
    print(f'Site de Margency : http://localhost:{port}/index.html')
    print(f'Gestion du site  : http://localhost:{port}/gestion.html')
    ThreadingHTTPServer(('127.0.0.1', port), Gestion).serve_forever()
