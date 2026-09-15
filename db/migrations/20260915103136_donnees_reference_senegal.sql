-- Données de référence : le Sénégal comme premier pays, et les trois formules
-- d'abonnement. Les paramètres pays (langue, devise, fuseau, indicatif) sont en
-- base et non dans le code, pour pouvoir ajouter un pays sans redéployer.

insert into pays (code, nom, langue, devise, fuseau_horaire, indicatif_telephonique, actif) values
  ('SN', 'Sénégal', 'fr', 'XOF', 'Africa/Dakar', '+221', true)
on conflict (code) do nothing;

-- Tarifs volontairement marqués provisoires : ils ne doivent pas être annoncés
-- à un client tant qu'ils n'ont pas été validés commercialement.
insert into offres_abonnement (code, nom, tarif_mensuel, devise, provisoire, description) values
  ('essentiel', 'Essentiel', 15000, 'XOF', true, 'Pour une petite école : une classe pilote, gestion de base des devoirs et notes. Tarif provisoire, non encore validé commercialement.'),
  ('etablissement', 'Établissement', 45000, 'XOF', true, 'Pour un établissement complet : toutes les classes, bulletins, communication. Tarif provisoire, non encore validé commercialement.'),
  ('groupe_scolaire', 'Groupe scolaire', 120000, 'XOF', true, 'Pour plusieurs établissements sous une même direction. Tarif provisoire, non encore validé commercialement.')
on conflict (code) do nothing;
